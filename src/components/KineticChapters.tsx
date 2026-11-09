"use client";
import {
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from "react";
import { projects, profile, toolCatalog, workflowTools } from "@/data/projects";
import { assetUrl } from "@/lib/assetPreloader";
import { damp, subscribeTicker } from "@/lib/masterTicker";
import type { ScrollPhysics } from "@/lib/scrollPhysics";
import CreamField from "./CreamField";
import { SoftwareEmblem } from "./SoftwareIcon";
import RevealText, { WarpChars } from "./RevealText";
import { attachHeadingWarp } from "@/lib/headingWarp";
import TearReveal from "./TearReveal";
import { tornEdge, tornTopClip } from "@/lib/tornEdge";
import { logoWheel } from "@/lib/logoWheel";
import { ArrowUpRight, Instagram, Linkedin, Mail } from "lucide-react";
import KineticPill from "./KineticPill";
import { RESUME_EVENT } from "@/lib/pageReturn";

const disciplines = [
  ["VIDEO EDITING", "COMMERCIALS • PACING • SOUND", "music"],
  ["MOTION DESIGN", "KINETIC TYPE • COMPOSITING • 3D", "pocket"],
  ["UI / UX & WEB", "FIGMA • NEXT.JS • INTERACTION", "induction"],
  ["ART DIRECTION", "CONCEPT • VISUAL IDENTITY • CRAFT", "artists"],
];
/** What each discipline row opens into: a first-person note and skills. */
const details = [
  {
    label: "01 // VIDEO EDITING",
    copy: "Good editing comes down to timing and instinct: knowing the exact frame to cut on so a piece keeps its momentum without feeling rushed. I spend a lot of time with the music stems, SFX and pacing first, so the story flows naturally before any heavy effects go on top. Whether it's a fast commercial cut, a brand reel or short-form content, the goal is always to hold attention from the first second to the last.",
    skills: [
      "Rhythm & Pacing",
      "Commercial & Brand Cuts",
      "Short-Form & Showreels",
      "Sound Design & SFX Sync",
      "Color Grading",
      "Premiere Pro & DaVinci Resolve",
    ],
  },
  {
    label: "02 // MOTION DESIGN",
    copy: "I use motion to give ideas weight and personality, not just to make things move for the sake of it. That means building custom easing curves, kinetic typography, clean transitions and 3D elements that actually fit the brand's tone. Instead of dropping in pre-made templates, I like rigging scenes from scratch in After Effects and Blender so every movement feels intentional and smooth.",
    skills: [
      "2D / 3D Motion Graphics",
      "Kinetic Typography",
      "Custom Graph Easing",
      "VFX & Compositing",
      "3D Modeling & Lighting",
      "After Effects & Blender",
    ],
  },
  {
    label: "03 // UI / UX & WEB",
    copy: "Because I come from editing and motion, I approach websites and interfaces with pacing and interaction in mind. I design layouts in Figma and build them in Next.js, focusing on clean hierarchy, smooth scrolling and the small tactile details that make a site fun to actually use. I want an interface to feel clear and intuitive straight away, while still having some character.",
    skills: [
      "UI / UX Layout Design",
      "Interactive Prototyping",
      "Design Systems",
      "Next.js & React",
      "Tailwind CSS",
      "GSAP & Framer Motion",
      "Figma",
    ],
  },
  {
    label: "04 // ART DIRECTION",
    copy: "Before I open a timeline or a canvas, I want a clear visual direction, so everything feels like it belongs to the same world. I help shape the look and feel of a project early on (typography, colour palette, pacing style and visual references) and carry that consistency all the way through the edit, the motion graphics and the final layout.",
    skills: [
      "Visual Identity & Moodboards",
      "Storyboarding",
      "Typography & Color Systems",
      "Campaign Direction",
      "Thumbnail & Key Art",
      "Photoshop & Illustrator",
    ],
  },
];
// The workflow dock reads names, brand colours and skill tags from the shared
// tool catalog in src/data/projects.ts.
const modules = workflowTools.map((id) => toolCatalog[id]);
const clamp = (n: number) => Math.max(0, Math.min(1, n));
const within = (n: number, lo: number, hi: number) =>
  Math.max(lo, Math.min(hi, n));
const tickerCopy =
  "AVAILABLE FOR FREELANCE & CREATIVE DIRECTION ✳ BENGALURU, IN ✳ ";
/** Dot grid of the workflow's point-cloud stream. */
const STREAM_COLS = 170,
  STREAM_ROWS = 7;
const TALK_ORBIT =
  "LET'S BUILD SOMETHING ICONIC • AVAILABLE FOR SELECT PROJECTS • ";
/** Waving preview card in "This is my thing". */
const FLAG_W = 310,
  FLAG_H = 195;
/** Torn top edge where the dark runway opens onto the cream chapter. */
const CREAM_TORN_TOP = tornTopClip(tornEdge(37, 14), 26, "px");
/**
 * Cream paper teeth hanging 64px below the last row over the falling
 * background (transparent between the teeth). The contour lines are clipped
 * to the same jagged shape so they run right down into the teeth.
 */
const TEETH_H = 64;
const TEETH = tornEdge(53, 15).map(
  ([x, j]) => [x, Math.max(0, TEETH_H - 18 - j)] as [number, number],
);
const TEETH_POINTS = `0,0 100,0 ${[...TEETH]
  .reverse()
  .map(([x, y]) => `${x.toFixed(2)},${(TEETH_H - y).toFixed(1)}`)
  .join(" ")}`;
const TEETH_CLIP = `polygon(0 0, 100% 0, ${[...TEETH]
  .reverse()
  .map(([x, y]) => `${x.toFixed(2)}% calc(100% - ${y.toFixed(1)}px)`)
  .join(", ")})`;
/** Spotlight colour behind the centred logo, per tool. */
const SPOT: Record<string, string> = {
  pr: "#9999FF",
  ae: "#9999FF",
  ps: "#31A8FF",
  figma: "#FF4D1C",
  blender: "#EA7600",
  davinci: "#38BDF8",
  handbrake: "#4ADE80",
  ai: "#FF9A00",
};
/** One-line role per tool for the workflow showcase bar. */
const ROLES: Record<string, string> = {
  pr: "Story assembly, rhythm cuts and the sound mix that carries the edit",
  ae: "Custom graph easing, 2D/3D compositing & kinetic typography systems",
  ps: "Composites, retouching and the key art behind posters and thumbnails",
  figma: "Interface layouts, design systems and clickable prototypes",
  blender: "3D models, lighting and shading for product shots and motion",
  davinci: "Colour grading and finishing so every shot sits in one world",
  handbrake: "Clean encodes and compression for every delivery platform",
  ai: "Vector marks, identity work and assets built to animate",
};
/** Depth of the workflow orbit (px); its width follows the viewport. */
const RADIUS_Z = 190;
/** After a pick (click, wheel, drag, a tool word) the orbit holds still. */
const HOLD_MS = 2600;
/** A tool named in the workflow copy: it lights up while that tool is in
 * front, and clicking it turns the orbit to it (handled in the loop). */
function ToolWord({ tool, children }: { tool: string; children: ReactNode }) {
  return (
    <button type="button" className="tool-word" data-tool-word={tool}>
      {children}
    </button>
  );
}
let emailCopiedThisSession = false;

export default function KineticChapters({ engine }: { engine: ScrollPhysics }) {
  const root = useRef<HTMLDivElement>(null),
    [copied, setCopied] = useState(emailCopiedThisSession),
    [copyError, setCopyError] = useState(false);
  const pointer = useRef({ x: 0, y: 0, row: -1 });
  /** Discipline whose editorial box is open (null: all closed). */
  const [open, setOpen] = useState<number | null>(null);
  const openRef = useRef<number | null>(null);
  const toggle = (i: number) => setOpen((cur) => (cur === i ? null : i));
  /** Preview card: cursor target in section coordinates, and a snap flag. */
  const follow = useRef({ tx: 0, ty: 0, snap: false });
  const capabilities = useRef<HTMLElement>(null);
  const track = (event: ReactMouseEvent, row: number) => {
    const section = capabilities.current;
    if (!section) return;
    const r = section.getBoundingClientRect();
    follow.current.tx = event.clientX - r.left;
    follow.current.ty = event.clientY - r.top;
    // Entering from outside: appear right at the cursor, never fly in.
    if (pointer.current.row < 0) follow.current.snap = true;
    pointer.current.row = row;
  };
  useLayoutEffect(() => {
    const el = root.current!,
      story = el.closest<HTMLElement>(".story-stage")!;
    const rows = Array.from(
      el.querySelectorAll<HTMLElement>(".kinetic-discipline"),
    );
    const tiles = Array.from(
      el.querySelectorAll<HTMLElement>(".hardware-tool"),
    );
    const dock = el.querySelector<HTMLElement>(".hardware-dock")!;
    const stage = el.querySelector<HTMLElement>(".workflow-hardware-stage")!,
      orbitTrack = el.querySelector<HTMLElement>(".orbit-track")!,
      wmTexts = Array.from(el.querySelectorAll<HTMLElement>("[data-wm]")),
      toolWords = Array.from(
        el.querySelectorAll<HTMLElement>("[data-tool-word]"),
      ),
      editorial = el.querySelector<HTMLElement>(".workflow-editorial")!;
    const boxVideos = Array.from(
      el.querySelectorAll<HTMLVideoElement>(".drawer-video video"),
    );
    const preview = el.querySelector<HTMLElement>(".flag-card")!,
      videos = Array.from(preview.querySelectorAll("video")),
      flagBody = preview.querySelector<HTMLElement>(".flag-body")!,
      flagEdges = Array.from(
        preview.querySelectorAll<SVGPathElement>(".flag-frame path"),
      );
    const ticker = el.querySelector<HTMLElement>(".contact-ticker-track")!;
    const hudName = el.querySelector<HTMLElement>("[data-module-name]")!,
      hudTags = Array.from(
        el.querySelectorAll<HTMLElement>("[data-module-tag]"),
      );
    const hudRole = el.querySelector<HTMLElement>("[data-module-role]")!,
      hudMeta = el.querySelector<HTMLElement>(".showcase-meta")!,
      showIndex = el.querySelector<HTMLElement>("[data-showcase-index]")!;
    const stream = el.querySelector<HTMLCanvasElement>(".workflow-stream")!;
    const sctx = stream.getContext("2d");
    const orbitRing = el.querySelector<HTMLElement>(".talk-orbit")!;
    const contact = el.querySelector<HTMLElement>(".story-contact")!;
    const talk = el.querySelector<HTMLElement>(".talk-tilt")!;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    let height = innerHeight,
      width = innerWidth,
      rowsY: number[] = [],
      dockY = 0,
      dockHeight = 1,
      radiusX = 500,
      contactY = 0,
      contactH = 1;
    let active = -1,
      lastPreview = -1,
      curX = 0,
      curY = 0,
      fadeUntil = 0,
      rowH = 80,
      flagTime = 0,
      flagScroll = 0,
      streamW = 1,
      streamH = 1,
      streamDockX = 0,
      streamDockY = 0,
      streamTime = 0,
      surge = 0.4,
      lastView = "",
      boxPaused = false,
      tickerX = 0,
      tickerWidth = 1,
      lastScroll = 0,
      speed = 0,
      focus = 0,
      rollAt = -Infinity,
      wmX = 0,
      tiltX = 0,
      tiltY = 0;
    const lifts = modules.map(() => 0);
    // Hovered tile (read from real pointer moves only, so tiles sliding under
    // a resting cursor never re-trigger). After a pick the orbit holds
    // until `holdUntil`; otherwise it glides on its own.
    const hover = { index: -1, at: 0, applied: false };
    let holdUntil = 0,
      seenInput = -Infinity,
      suppressClick = false;
    // Drag on the orbit: 1:1 while held, then a throw that lands on a tool.
    const drag = { on: false, id: -1, x: 0, startX: 0, v: 0, moved: false };
    const measure = () => {
      const origin = story.getBoundingClientRect().top;
      const d = dock.getBoundingClientRect();
      height = innerHeight;
      width = innerWidth;
      rowsY = rows.map((row) => row.getBoundingClientRect().top - origin);
      rowH = rows[0]?.offsetHeight || 80;
      dockY = d.top - origin;
      dockHeight = d.height;
      tickerWidth = ticker.scrollWidth / 2;
      streamW = stream.clientWidth || width;
      streamH = stream.clientHeight || 300;
      stream.width = streamW;
      stream.height = streamH;
      // Where the dock's centre falls inside the (full-bleed) stream canvas.
      streamDockX = d.left + d.width / 2 - stream.getBoundingClientRect().left;
      streamDockY = d.top + d.height / 2 - stream.getBoundingClientRect().top;
      // Wide elliptical orbit. The wheel-capture box hugs it, and the flat
      // track ring is sized to pass through every tool's centre.
      radiusX = Math.min(width * 0.4, 500);
      dock.style.width = `${Math.round(radiusX * 2 + 150)}px`;
      orbitTrack.style.width = `${(radiusX * 2).toFixed(1)}px`;
      orbitTrack.style.height = `${((RADIUS_Z * 2) / Math.sin((82 * Math.PI) / 180)).toFixed(1)}px`;
      const c = contact.getBoundingClientRect();
      contactY = c.top - origin;
      contactH = c.height;
    };
    const resize = new ResizeObserver(measure);
    resize.observe(story);
    window.addEventListener("resize", measure);
    document.fonts.ready.then(() => {
      if (el.isConnected) measure();
    });
    measure();

    // The logo wheel is an endless ring. While the cursor is over it the page
    // does not scroll: useProjectWheel turns the ring instead (logoWheel).
    const N = modules.length;
    const wrap = (v: number) => ((v % N) + N) % N;
    /** The ring position showing tool `i` that is closest to where it is. */
    const nearest = (i: number) => i + N * Math.round((focus - i) / N);
    const toolAt = (target: EventTarget | null) => {
      const tile =
        target instanceof Element
          ? target.closest<HTMLElement>(".hardware-tool")
          : null;
      return tile ? tiles.indexOf(tile) : -1;
    };
    const hoverMove = (event: PointerEvent) => {
      if (event.pointerType !== "mouse" || drag.moved) return;
      const i = toolAt(event.target);
      if (i !== hover.index) {
        hover.index = i;
        hover.at = performance.now();
        hover.applied = false;
      }
    };
    const hoverLeave = () => (hover.index = -1);
    const pick = (event: MouseEvent) => {
      if (suppressClick) {
        suppressClick = false;
        return;
      }
      const i = toolAt(event.target);
      if (i < 0) return;
      logoWheel.target = nearest(i);
      holdUntil = performance.now() + HOLD_MS;
      hover.index = i;
      hover.applied = true;
    };
    const focusIn = (event: FocusEvent) => {
      const i = toolAt(event.target);
      if (i < 0) return;
      logoWheel.target = nearest(i);
      holdUntil = performance.now() + HOLD_MS;
    };
    // Tool names in the copy turn the orbit to that tool.
    const wordClick = (event: MouseEvent) => {
      const word = (event.target as Element).closest<HTMLElement>(
        "[data-tool-word]",
      );
      if (!word) return;
      const i = modules.findIndex((t) => t.id === word.dataset.toolWord);
      if (i < 0) return;
      logoWheel.target = nearest(i);
      holdUntil = performance.now() + HOLD_MS;
      hover.index = -1;
    };
    const dragDown = (event: PointerEvent) => {
      if (event.button !== 0) return;
      drag.on = true;
      drag.id = event.pointerId;
      drag.x = drag.startX = event.clientX;
      drag.v = 0;
      drag.moved = false;
    };
    const dragMove = (event: PointerEvent) => {
      if (!drag.on || event.pointerId !== drag.id) return;
      const dx = event.clientX - drag.x;
      drag.x = event.clientX;
      if (!drag.moved) {
        if (Math.abs(event.clientX - drag.startX) < 6) return;
        drag.moved = true;
        hover.index = -1;
        try {
          dock.setPointerCapture(event.pointerId);
        } catch {}
      }
      // One tool per gap between neighbouring tools at the front.
      const step = -dx / Math.max(120, radiusX * 0.7);
      logoWheel.target += step;
      drag.v = drag.v * 0.5 + step * 0.5;
      holdUntil = performance.now() + HOLD_MS;
    };
    const dragUp = (event: PointerEvent) => {
      if (!drag.on || event.pointerId !== drag.id) return;
      drag.on = false;
      try {
        dock.releasePointerCapture(event.pointerId);
      } catch {}
      if (drag.moved) {
        // The throw carries on in its direction, then lands on a tool.
        logoWheel.target = Math.round(logoWheel.target + drag.v * 8);
        holdUntil = performance.now() + HOLD_MS;
        suppressClick = true;
        setTimeout(() => (suppressClick = false), 0);
      }
      drag.moved = false;
    };
    dock.addEventListener("pointerdown", dragDown);
    dock.addEventListener("pointermove", dragMove);
    dock.addEventListener("pointerup", dragUp);
    dock.addEventListener("pointercancel", dragUp);
    editorial.addEventListener("click", wordClick);
    const wheelEnter = () => (logoWheel.hovering = true);
    const wheelLeave = () => (logoWheel.hovering = false);
    dock.addEventListener("pointermove", hoverMove);
    dock.addEventListener("pointerleave", hoverLeave);
    dock.addEventListener("click", pick);
    dock.addEventListener("focusin", focusIn);
    dock.addEventListener("mouseenter", wheelEnter);
    dock.addEventListener("mouseleave", wheelLeave);

    // Writes happen only when a value changes, and nothing is measured
    // here, so the loop never forces a layout of the page.
    const drawn = {
      rows: rows.map(() => ""),
      hud: -1,
      wm: "",
      talk: "",
    };
    /** Shows tool `i` in the showcase bar, the watermark and the copy. */
    const showTool = (i: number, now: number, motion: boolean) => {
      const tool = modules[i];
      hudName.textContent = tool.label.toUpperCase();
      hudRole.textContent = ROLES[tool.id] ?? "";
      showIndex.textContent = String(i + 1).padStart(2, "0");
      tool.skills.forEach((tag, k) => (hudTags[k].textContent = tag));
      wmTexts.forEach((t) => (t.textContent = tool.label));
      toolWords.forEach(
        (w) => (w.dataset.active = String(w.dataset.toolWord === tool.id)),
      );
      stage.style.setProperty("--brand-color", tool.color);
      stage.style.setProperty("--spot", SPOT[tool.id] ?? tool.color);
      surge = 1;
      if (!motion) return;
      rollAt = now;
      const rise = { duration: 460, easing: "cubic-bezier(0.16, 1, 0.3, 1)" };
      hudMeta.animate(
        [
          { transform: "translateY(10px)", opacity: 0 },
          { transform: "translateY(0)", opacity: 1 },
        ],
        rise,
      );
      hudTags.forEach((tag, k) =>
        tag.animate(
          [
            { transform: "translateY(10px)", opacity: 0 },
            { transform: "translateY(0)", opacity: 1 },
          ],
          { ...rise, delay: 70 + k * 60, fill: "backwards" },
        ),
      );
    };
    const stop = subscribeTicker((now, dt) => {
      const frame = engine.read(),
        scroll = frame.storyScrollY,
        shift = height - scroll,
        virtual = frame.virtualScrollY,
        m = pointer.current;
      // Layout is only measurable once About is displayed.
      if (engine.view !== lastView) {
        lastView = engine.view;
        if (engine.view === "about") measure();
      }
      if (engine.view !== "about" || document.hidden) {
        videos.forEach((v) => v.pause());
        lastPreview = -1;
        // The open discipline box's clip pauses too, and resumes on return.
        if (!boxPaused) {
          boxPaused = true;
          boxVideos.forEach((v) => v.pause());
        }
        return;
      }
      if (boxPaused) {
        boxPaused = false;
        const o = openRef.current;
        if (o !== null && !reduced.matches)
          void boxVideos[o]?.play().catch(() => {});
      }
      const motion = !reduced.matches;
      rows.forEach((row, i) => {
        const p = clamp((height * 0.92 - (rowsY[i] + shift)) / (height * 0.55));
        const offset = `${motion ? Math.round((1 - p) * (i % 2 ? -30 : 30) * 10) / 10 : 0}px`;
        if (drawn.rows[i] !== offset) {
          drawn.rows[i] = offset;
          row.style.setProperty("--row-offset", offset);
        }
      });

      // Preview card: follows the cursor across the rows (lerp 0.16 per
      // 60 Hz frame) with a slight tilt from its lag; only while a row is
      // hovered. Each row has its own preloaded loop.
      const row =
        m.row >= 0 &&
        m.row !== openRef.current &&
        rowsY[m.row] + shift < height &&
        rowsY[m.row] + shift > -rowH
          ? m.row
          : -1;
      if (row >= 0 && lastPreview !== row) {
        videos.forEach((v, i) => {
          v.dataset.active = String(i === row);
          if (i !== row) v.pause();
        });
        if (motion) void videos[row].play().catch(() => {});
        lastPreview = row;
      }
      const hovering = row >= 0;
      if (preview.classList.contains("is-active") !== hovering) {
        preview.classList.toggle("is-active", hovering);
        if (!hovering) {
          // Let the fade play out where the cursor left, then stop the clip.
          fadeUntil = now + 260;
          lastPreview = -1;
        }
      }
      if (!hovering && now > fadeUntil) videos.forEach((v) => v.pause());
      const f = follow.current;
      if (f.snap) {
        curX = f.tx;
        curY = f.ty;
        f.snap = false;
      }
      const scrollSpeed = (scroll - flagScroll) / Math.max(dt, 0.001);
      flagScroll = scroll;
      if (hovering || now < fadeUntil) {
        const k = motion ? 1 - Math.pow(0.84, dt * 60) : 1;
        curX += (f.tx - curX) * k;
        curY += (f.ty - curY) * k;
        const tilt = within((f.tx - curX) * 0.06, -8, 8);
        const scale = (hovering ? 1 : 0.82) * (width < 760 ? 0.62 : 1);
        preview.style.transform = `translate3d(${(curX - FLAG_W / 2).toFixed(1)}px,${(curY - FLAG_H / 2).toFixed(1)}px,0) scale(${scale}) rotateZ(${tilt.toFixed(2)}deg)`;
        // Top and bottom edges ripple like a flag fixed at its left side;
        // scroll speed whips the wave up.
        const whip = Math.min(3, Math.abs(scrollSpeed) / 700);
        if (motion) flagTime += dt * (1 + whip);
        const amp = 6 + whip * 4;
        let top = "",
          bottom = "";
        for (let x0 = 0; x0 <= FLAG_W; x0 += 20) {
          const reach = 0.3 + 0.7 * (x0 / FLAG_W);
          const phase = x0 * 0.022 - flagTime * 3.2;
          top += `${x0 ? "L" : "M"}${x0} ${(12 + Math.sin(phase) * amp * reach).toFixed(1)} `;
          bottom =
            `L${x0} ${(FLAG_H - 12 + Math.sin(phase + 0.7) * amp * reach).toFixed(1)} ` +
            bottom;
        }
        const outline = `${top}${bottom}Z`;
        flagBody.style.clipPath = `path("${outline}")`;
        flagEdges.forEach((edge) => edge.setAttribute("d", outline));
      }

      // Workflow: a wide, tilted 3D orbit of the eight tools. Left alone it
      // glides on its own; hovering snaps it to the nearest tool, and the
      // mouse wheel (useProjectWheel), a drag, a click or a tool named in
      // the copy turns it, after which it holds for a moment.
      const dockOnScreen =
        dockY + shift < height && dockY + shift + dockHeight > 0;
      if (!dockOnScreen) logoWheel.hovering = false;
      if (logoWheel.lastInput !== seenInput) {
        seenInput = logoWheel.lastInput;
        holdUntil = now + HOLD_MS;
        // The ring turns under a resting cursor; that is not a hover.
        hover.index = -1;
      }
      if (hover.index >= 0 && !hover.applied && now - hover.at > 220) {
        logoWheel.target = nearest(hover.index);
        hover.applied = true;
        holdUntil = now + HOLD_MS;
      }
      const engaged = logoWheel.hovering || drag.on;
      if (engaged) holdUntil = Math.max(holdUntil, now + 900);
      if (motion && dockOnScreen && !engaged && now > holdUntil)
        logoWheel.target += 0.0035 * dt * 60;
      else if (!drag.on && now - logoWheel.lastInput > 120)
        logoWheel.target = Math.round(logoWheel.target);
      focus = motion ? damp(focus, logoWheel.target, 9, dt) : logoWheel.target;
      const selected = hover.index >= 0 ? hover.index : wrap(Math.round(focus));
      if (selected !== active) {
        active = selected;
        showTool(active, now, motion);
      }

      const dockVisible =
        dockY + shift < height + 100 && dockY + shift + dockHeight > -100;
      if (dockVisible) {
        /** Shortest wrapped offset of slot `i` from the front, in [-N/2, N/2]. */
        const offset = (i: number) => {
          let d = wrap(i - focus);
          if (d > N / 2) d -= N;
          return d;
        };
        const t = now / 1000;
        tiles.forEach((tile, i) => {
          const theta = (offset(i) / N) * Math.PI * 2;
          const x = Math.sin(theta) * radiusX;
          const y = Math.cos(theta) * 26;
          const z = (Math.cos(theta) - 1) * RADIUS_Z;
          const rotY = Math.sin(theta) * -28;
          const depth = (Math.cos(theta) + 1) * 0.5;
          const sc = 0.58 + 0.56 * Math.pow(depth, 1.5);
          const op = 0.22 + 0.78 * Math.pow(depth, 1.3);
          lifts[i] = damp(lifts[i], i === active ? -10 : 0, 12, dt);
          const float = motion ? Math.sin(t * 2 + i) * 5 : 0;
          tile.style.opacity = op.toFixed(3);
          tile.style.transform = `translate3d(${x.toFixed(1)}px,${(y + lifts[i] + float).toFixed(1)}px,${z.toFixed(1)}px) rotateY(${rotY.toFixed(2)}deg) scale(${sc.toFixed(3)})`;
          tile.dataset.active = String(i === active);
        });
        const xActive = Math.sin((offset(active) / N) * Math.PI * 2) * radiusX;
        // Giant outline watermark: rolls up into place on each change and
        // drifts against the cursor.
        const roll = motion ? clamp((now - rollAt) / 700) : 1;
        const e = 1 - Math.pow(1 - roll, 4);
        wmX = damp(wmX, motion ? (m.x / width - 0.5) * 2 * -18 : 0, 5, dt);
        const wmKey = `${e.toFixed(3)}|${wmX.toFixed(1)}`;
        if (wmKey !== drawn.wm) {
          drawn.wm = wmKey;
          const wt = `translate3d(${wmX.toFixed(1)}px,${((1 - e) * 45).toFixed(2)}%,0) scaleY(${(1 + 0.18 * (1 - e)).toFixed(3)})`;
          const wo = (0.2 + 0.8 * e).toFixed(3);
          wmTexts.forEach((w) => {
            w.style.transform = wt;
            w.style.opacity = wo;
          });
        }
        // Point-cloud stream behind the ring: a horizontal wave whose crest
        // swells over the active tool, surging each time the tool changes.
        if (sctx) {
          if (motion) streamTime += dt;
          surge = damp(surge, 0.4, 2.2, dt);
          const crestX = streamDockX + xActive;
          sctx.clearRect(0, 0, streamW, streamH);
          const ink = new Path2D(),
            ember = new Path2D();
          for (let r = 0; r < STREAM_ROWS; r++)
            for (let c = 0; c < STREAM_COLS; c++) {
              // Rows are staggered so the dots never line up in columns.
              const x = ((c + (r % 2) * 0.5) / (STREAM_COLS - 1)) * streamW;
              const near = Math.exp(-(((x - crestX) / 240) ** 2));
              const amp = 12 + 40 * surge * near + 10 * near;
              const y =
                streamDockY +
                (r - (STREAM_ROWS - 1) / 2) * 8 +
                Math.sin(x * 0.009 - streamTime * 1.3 + r * 0.45) * amp +
                Math.sin(x * 0.021 + streamTime * 0.7) * 6;
              const size = 1.5 + near * 1.1;
              (r === 1 || r === 4 ? ember : ink).rect(x, y, size, size);
            }
          sctx.fillStyle = "rgba(243, 239, 230, 0.22)";
          sctx.fill(ink);
          sctx.fillStyle = "rgba(255, 77, 28, 0.35)";
          sctx.fill(ember);
        }
      }

      // Contact: LET'S TALK tilts toward the cursor.
      const contactTop = contactY + shift;
      if (contactTop < height && contactTop + contactH > 0) {
        const gx = motion ? m.x / width - 0.5 : 0,
          gy = motion ? m.y / height - 0.5 : 0;
        tiltX = damp(tiltX, gx, 6, dt);
        tiltY = damp(tiltY, gy, 6, dt);
        const talkKey = `${tiltX.toFixed(3)}|${tiltY.toFixed(3)}`;
        if (talkKey !== drawn.talk) {
          drawn.talk = talkKey;
          talk.style.transform = `perspective(1100px) rotateX(${(-tiltY * 12).toFixed(2)}deg) rotateY(${(tiltX * 16).toFixed(2)}deg)`;
          // The orbit seal lies back like a ring around the title and tips
          // toward the cursor; CSS spins it slowly.
          orbitRing.style.transform = `translate(-50%, -50%) perspective(2600px) rotateX(${(62 - tiltY * 14).toFixed(2)}deg) rotateY(${(tiltX * 16).toFixed(2)}deg)`;
        }
        const delta = Math.abs(scroll - lastScroll) / Math.max(dt, 0.001);
        speed = damp(speed, Math.min(delta, 1800), 8, dt);
        if (motion)
          tickerX =
            (tickerX + dt * (30 + speed * 0.12)) % Math.max(1, tickerWidth);
        ticker.style.transform = `translate3d(${-tickerX}px,0,0)`;
      }
      lastScroll = scroll;
    });
    return () => {
      stop();
      videos.forEach((v) => v.pause());
      resize.disconnect();
      window.removeEventListener("resize", measure);
      dock.removeEventListener("pointermove", hoverMove);
      dock.removeEventListener("pointerdown", dragDown);
      dock.removeEventListener("pointermove", dragMove);
      dock.removeEventListener("pointerup", dragUp);
      dock.removeEventListener("pointercancel", dragUp);
      editorial.removeEventListener("click", wordClick);
      dock.removeEventListener("pointerleave", hoverLeave);
      dock.removeEventListener("click", pick);
      dock.removeEventListener("focusin", focusIn);
      dock.removeEventListener("mouseenter", wheelEnter);
      dock.removeEventListener("mouseleave", wheelLeave);
      logoWheel.hovering = false;
    };
  }, [engine]);
  // Landing-style character warp on the chapter headings.
  useLayoutEffect(() => {
    const el = root.current!;
    const headings = [
      el.querySelector<HTMLElement>("#capabilities-title"),
      ...el.querySelectorAll<HTMLElement>(".kinetic-discipline h3"),
      el.querySelector<HTMLElement>("#workflow-title"),
      el.querySelector<HTMLElement>(".talk-tilt"),
    ].filter((h): h is HTMLElement => !!h);
    const detach = headings.map((h) => attachHeadingWarp(h));
    return () => detach.forEach((d) => d());
  }, []);
  // The open box plays its clip (the floating preview "flows" into it); all
  // other box clips stay paused. The loop below pauses it when About hides.
  useLayoutEffect(() => {
    openRef.current = open;
    const el = root.current;
    if (!el) return;
    const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.querySelectorAll<HTMLVideoElement>(".drawer-video video").forEach(
      (video, i) => {
        if (i === open && !still) void video.play().catch(() => {});
        else video.pause();
      },
    );
  }, [open]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(profile.email);
      emailCopiedThisSession = true;
      setCopied(true);
      setCopyError(false);
    } catch {
      setCopyError(true);
    }
  };
  return (
    <div
      ref={root}
      className="kinetic-chapters"
      onPointerMove={(e) => {
        pointer.current.x = e.clientX;
        pointer.current.y = e.clientY;
      }}
    >
      <section
        ref={capabilities}
        className="story-capabilities story-chapter kinetic-capabilities"
        aria-labelledby="capabilities-title"
        style={{ "--teeth-clip": TEETH_CLIP } as CSSProperties}
      >
        <i
          className="cream-torn-top"
          aria-hidden="true"
          style={{ clipPath: CREAM_TORN_TOP }}
        />
        <CreamField engine={engine} variant="flow" />
        <h2
          id="capabilities-title"
          className="sliced-heading"
          data-rise
          aria-label="This is my thing."
        >
          <RevealText text="THIS IS" />
          <RevealText
            text="MY THING"
            start={6}
            after={
              <span className="capabilities-trail-anchor" aria-label="." />
            }
          />
        </h2>
        <div
          className="discipline-rows"
          onMouseMove={(event) => {
            if (pointer.current.row >= 0) track(event, pointer.current.row);
          }}
        >
          {disciplines.map((d, i) => {
            const isOpen = open === i;
            const project = projects.find((p) => p.id === d[2]) ?? projects[0];
            const info = details[i];
            return (
              <div
                className="discipline-item"
                data-open={isOpen}
                key={d[0]}
                onMouseEnter={(event) => track(event, i)}
                onMouseMove={(event) => track(event, i)}
                onMouseLeave={() => (pointer.current.row = -1)}
              >
                <article
                  className="kinetic-discipline"
                  role="button"
                  tabIndex={0}
                  aria-expanded={isOpen}
                  aria-controls={`discipline-panel-${i}`}
                  onClick={() => toggle(i)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      toggle(i);
                    }
                  }}
                >
                  <span className="discipline-number">0{i + 1}</span>
                  <h3 aria-label={d[0]}>
                    <span className="discipline-title-track">
                      <span>
                        <WarpChars text={d[0]} />
                      </span>
                    </span>
                  </h3>
                  <span className="discipline-tags">[ {d[1]} ]</span>
                  <span className="discipline-arrow" aria-hidden="true">
                    ↗
                  </span>
                </article>
                <div
                  className="discipline-drawer"
                  id={`discipline-panel-${i}`}
                  role="region"
                  aria-label={info.label}
                  inert={!isOpen}
                >
                  <div className="drawer-inner">
                    <div className="drawer-box">
                      <div className="drawer-copy">
                        <p className="drawer-label">WHAT I DO</p>
                        <p className="drawer-text">{info.copy}</p>
                        <div className="drawer-skills">
                          <p className="drawer-label">SKILLS &amp; FOCUS</p>
                          <ul>
                            {info.skills.map((skill, k) => (
                              <li
                                key={skill}
                                className={k % 3 === 0 ? "is-accent" : ""}
                              >
                                {skill}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                      <div className="drawer-video">
                        <video
                          src={assetUrl(project.video)}
                          poster={assetUrl(project.poster)}
                          muted
                          loop
                          playsInline
                          preload="none"
                          aria-hidden="true"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <div
          className="flag-card discipline-floating-preview"
          aria-hidden="true"
        >
          <svg
            className="flag-frame"
            viewBox={`0 0 ${FLAG_W} ${FLAG_H}`}
            width={FLAG_W}
            height={FLAG_H}
          >
            <path className="flag-edge-accent" />
            <path className="flag-edge-ink" />
          </svg>
          <div className="flag-body">
            {disciplines.map((d) => {
              const project =
                projects.find((p) => p.id === d[2]) ?? projects[0];
              return (
                <video
                  key={d[0]}
                  src={assetUrl(project.video)}
                  poster={assetUrl(project.poster)}
                  data-active="false"
                  muted
                  loop
                  playsInline
                  preload="auto"
                />
              );
            })}
          </div>
        </div>
        <svg
          className="cream-teeth"
          viewBox={`0 0 100 ${TEETH_H}`}
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <polygon points={TEETH_POINTS} />
        </svg>
      </section>
      <TearReveal />
      <section
        className="story-workflow story-chapter kinetic-workflow"
        aria-labelledby="workflow-title"
      >
        <header className="workflow-heading">
          <div>
            <h2 id="workflow-title" aria-label="Inside the workflow.">
              <span aria-hidden="true">
                <WarpChars text="INSIDE THE" />
                <br />
                <WarpChars text="WORKFLOW." />
              </span>
            </h2>
          </div>
          <p className="workflow-editorial">
            Most projects start as a <strong>rough cut</strong> in{" "}
            <ToolWord tool="pr">Premiere</ToolWord>, where I find the rhythm.
            The <strong>motion and compositing</strong> happen in{" "}
            <ToolWord tool="ae">After Effects</ToolWord>, anything{" "}
            <strong>3D</strong> gets built in{" "}
            <ToolWord tool="blender">Blender</ToolWord>, and{" "}
            <strong>interface work</strong> lives in{" "}
            <ToolWord tool="figma">Figma</ToolWord>. The tools change from job
            to job, but I always care about the same things: good pacing and
            work that's easy to read.
          </p>
        </header>
        <div className="workflow-hardware-stage">
          <canvas className="workflow-stream" aria-hidden="true" />
          <div className="workflow-orbit-zone">
            <div className="workflow-watermark" aria-hidden="true">
              <div className="wm-layer wm-base">
                <span className="wm-text" data-wm>
                  {modules[0].label}
                </span>
              </div>
              <div className="wm-layer wm-glow">
                <span className="wm-text" data-wm>
                  {modules[0].label}
                </span>
              </div>
            </div>
            <div
              className="hardware-dock workflow-icons-dock workflow-wheel-stage"
              data-drag-own
            >
              <div className="orbit-plane">
                <div className="orbit-track" aria-hidden="true">
                  <svg viewBox="0 0 1000 1000" preserveAspectRatio="none">
                    <ellipse
                      className="orbit-track-line"
                      cx="500"
                      cy="500"
                      rx="499"
                      ry="499"
                    />
                    <path
                      className="orbit-track-glow"
                      d="M 289.1 952.2 A 499 499 0 0 0 710.9 952.2"
                    />
                    <path
                      className="orbit-track-arc"
                      d="M 289.1 952.2 A 499 499 0 0 0 710.9 952.2"
                    />
                  </svg>
                </div>
                <i className="workflow-spotlight" aria-hidden="true" />
                {modules.map((tool) => (
                  <button
                    className="hardware-tool"
                    data-tool={tool.id}
                    key={tool.id}
                    aria-label={tool.label}
                    style={{ "--tool-brand": tool.color } as CSSProperties}
                  >
                    <i className="hardware-reflection" />
                    {[4, 8, 11, 14].map((z) => (
                      <i
                        className="hardware-depth"
                        key={z}
                        style={{ transform: `translateZ(${-z}px)` }}
                      />
                    ))}
                    <span className="hardware-face" />
                    <span className="hardware-glyph">
                      <SoftwareEmblem software={tool.id} />
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div
            className="tool-showcase"
            aria-label="Active workflow tool"
            aria-live="polite"
          >
            <div className="showcase-lead">
              <span className="showcase-index" data-showcase-index>
                01
              </span>
              <div className="showcase-meta">
                <strong data-module-name>
                  {modules[0].label.toUpperCase()}
                </strong>
                <span data-module-role>{ROLES[modules[0].id]}</span>
              </div>
            </div>
            <ul className="showcase-pills">
              {modules[0].skills.map((tag, i) => (
                <li data-module-tag key={i}>
                  {tag}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
      <section
        className="story-contact story-chapter kinetic-contact"
        aria-labelledby="contact-title"
      >
        <CreamField engine={engine} variant="ripple" />
        <div className="contact-ticker" aria-label={tickerCopy}>
          <div className="contact-ticker-track" aria-hidden="true">
            {[0, 1].map((i) => (
              <span key={i}>{tickerCopy.repeat(2)}</span>
            ))}
          </div>
        </div>
        <div className="contact-copy-zone">
          <h2 id="contact-title" className="talk-title" aria-label="Let's talk">
            <span className="talk-orbit" aria-hidden="true">
              <svg viewBox="0 0 1000 1000">
                <defs>
                  <path
                    id="talk-orbit-path"
                    d="M 500 500 m -455 0 a 455 455 0 1 1 910 0 a 455 455 0 1 1 -910 0"
                  />
                </defs>
                <text>
                  <textPath href="#talk-orbit-path">
                    {TALK_ORBIT}
                    {TALK_ORBIT}
                  </textPath>
                </text>
              </svg>
            </span>
            <button onClick={copy} aria-label="Copy email address">
              <span className="talk-tilt" aria-hidden="true">
                <WarpChars text="LET'S TALK" />
              </span>
            </button>
          </h2>
          <button
            type="button"
            className="email-capsule"
            data-copied={copied}
            onClick={copy}
            aria-label={`Copy email address ${profile.email}`}
          >
            <i className="email-capsule-flood" aria-hidden="true" />
            <span className="email-capsule-address">{profile.email}</span>
            <span className="email-capsule-action" aria-hidden="true">
              <span className="email-capsule-roll">
                <span>COPY EMAIL ↗</span>
                <span>COPIED TO CLIPBOARD ✓</span>
              </span>
            </span>
          </button>
        </div>
        <span className="copy-feedback" role="status">
          {copyError
            ? "Copy unavailable — use EMAIL below."
            : copied
              ? "Email address copied."
              : ""}
        </span>
        <div className="contact-links">
          <a className="contact-link" href={`mailto:${profile.email}`}>
            <Mail size={20} strokeWidth={1.6} aria-hidden="true" />
            <span>EMAIL</span>
            <ArrowUpRight size={16} strokeWidth={1.8} aria-hidden="true" />
          </a>
          <a
            className="contact-link"
            href="https://www.instagram.com/sydorm_/"
            target="_blank"
            rel="noreferrer"
          >
            <Instagram size={20} strokeWidth={1.6} aria-hidden="true" />
            <span>INSTAGRAM</span>
            <ArrowUpRight size={16} strokeWidth={1.8} aria-hidden="true" />
          </a>
          <a
            className="contact-link"
            href="https://www.linkedin.com/in/vishwas-kamath-717016369/"
            target="_blank"
            rel="noreferrer"
          >
            <Linkedin size={20} strokeWidth={1.6} aria-hidden="true" />
            <span>LINKEDIN</span>
            <ArrowUpRight size={16} strokeWidth={1.8} aria-hidden="true" />
          </a>
        </div>
        <div className="contact-bottom">
          <span>
            VISHWAS KAMATH © {new Date().getFullYear()}
            <br />
            BENGALURU, IN
          </span>
          <KineticPill
            label="RÉSUMÉ"
            tone="dark"
            icon="↗"
            ariaLabel="Open résumé"
            className="contact-resume"
            onClick={() => window.dispatchEvent(new Event(RESUME_EVENT))}
          />
          <button onClick={() => engine.onBoundary?.()}>BACK TO REEL ↑</button>
        </div>
      </section>
    </div>
  );
}
