"use client";
import { useLayoutEffect, useRef, type CSSProperties } from "react";
import type { ScrollPhysics } from "@/lib/scrollPhysics";
import { wordRevealColor, clamp01 } from "@/lib/manifestoReveal";
import { attachHeadingWarp } from "@/lib/headingWarp";
import { assetUrl } from "@/lib/assetPreloader";
import { projects } from "@/data/projects";
import { WarpChars } from "./RevealText";

const copy =
  "I'm a video editor and motion graphics designer from Bengaluru, and I build websites too. Most of my days go into editing for clients or my own projects, cutting to the music and working out what makes a moment land. I design interfaces in Figma and build them with Next.js, so the sites look good and actually work. Edit or build, I want the work to feel clear, a little playful and worth stopping for.";
const WORDS = copy.split(" ");
/** Stickers pop in as the reading reaches their word (same maths as the
 * word reveal: the cursor runs from -3 to count + 3). */
const stickers = [
  { word: "editing", text: "Cut to the beat", tilt: -5 },
  { word: "interfaces", text: "Motion + UI under one roof", tilt: 4 },
  { word: "build,", text: "Built from scratch in BLR", tilt: -3 },
].map((s) => ({
  ...s,
  at: (WORDS.indexOf(s.word) + 3) / (WORDS.length + 6),
}));
/**
 * Skill stations on the marker's S-curve. Each is a tilted video loop plus
 * a display title and a two-line sentence; they alternate sides of
 * the line and pop in as the pen reaches the node beside them.
 */
const STATIONS = [
  {
    side: "left",
    title: "VIDEO EDITING",
    copy: "I cut to the music, not around it. Raw footage goes in, and a story that keeps you watching comes out.",
    project: "music",
    tilt: -3,
  },
  {
    side: "right",
    title: "MOTION GRAPHICS",
    copy: "Type that moves with a reason, a bit of 3D when it helps, and easing I keep tweaking until it feels right.",
    project: "pocket",
    tilt: 3.2,
  },
  {
    side: "left",
    title: "UI / UX & WEB",
    copy: "Sites I design in Figma and build myself, with the small details that make them fun to click around.",
    project: "induction",
    tilt: -2.2,
  },
];
/** Gap between a station's edge and its node on the line (px). */
const NODE_GAP = 44;
type Point = { x: number; y: number };
const n = (v: number) => v.toFixed(1);
/** Downward-only curve through points (vertical tangents at each point). */
function thread(points: Point[]) {
  let d = `M${n(points[0].x)} ${n(points[0].y)}`;
  for (let i = 1; i < points.length; i++) {
    const p0 = points[i - 1],
      p1 = points[i],
      dy = (p1.y - p0.y) * 0.5;
    d += `C${n(p0.x)} ${n(p0.y + dy)} ${n(p1.x)} ${n(p1.y - dy)} ${n(p1.x)} ${n(p1.y)}`;
  }
  return d;
}
/** Samples of the trail path, so the pen never queries SVG geometry per frame. */
const SAMPLES = 480;
export default function AboutManifesto({ engine }: { engine: ScrollPhysics }) {
  const root = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const el = root.current!,
      story = el.closest<HTMLElement>(".story-stage")!;
    const paragraph = el.querySelector<HTMLElement>(".scroll-manifesto")!,
      trail = el.querySelector<HTMLElement>(".manifesto-trail")!;
    const words = Array.from(el.querySelectorAll<HTMLElement>(".scroll-word"));
    const badges = Array.from(
      el.querySelectorAll<HTMLElement>(".manifesto-sticker"),
    );
    const svg = trail.querySelector<SVGSVGElement>(":scope > svg")!,
      anchor = story.querySelector<HTMLElement>(".capabilities-trail-anchor")!,
      originDot = el.querySelector<SVGCircleElement>(".manifesto-origin")!;
    const path = el.querySelector<SVGPathElement>(".manifesto-path")!,
      pen = el.querySelector<SVGGElement>(".manifesto-pen")!;
    // The word the line starts from, and the stations along it.
    // The line starts at the paragraph's last word: nothing sits to its
    // right or below it, so the marker never draws through the text.
    const startWord = words[words.length - 1];
    const list = trail.querySelector<HTMLElement>(".station-list")!;
    const stations = Array.from(list.querySelectorAll<HTMLElement>(".station"));
    const videos = stations.map((st) => st.querySelector("video")!);
    const nodes = Array.from(
      svg.querySelectorAll<SVGCircleElement>(".station-node"),
    );
    const ticks = Array.from(
      svg.querySelectorAll<SVGPathElement>(".station-tick"),
    );
    const motion = matchMedia("(prefers-reduced-motion: reduce)");
    let paragraphY = 0,
      paragraphHeight = 1,
      trailY = 0,
      trailHeight = 1,
      height = innerHeight,
      length = 1,
      unit = 1,
      // Screen height (fraction) where the pen tip rides; set so the pen
      // docks in the full stop when the heading's top reaches 45%.
      tipLine = 0.82,
      measured = false,
      previous = "";
    // Per station: path length where the pen reaches its node, the node's
    // height in the section, and whether its clip is playing.
    let nodeAt: number[] = STATIONS.map(() => Infinity),
      nodeY: number[] = STATIONS.map(() => 0);
    const playing = STATIONS.map(() => false);
    const lutX = new Float32Array(SAMPLES + 1),
      lutY = new Float32Array(SAMPLES + 1);
    const colors = words.map(() => "");
    const pointAt = (distance: number) => {
      const t = Math.max(0, Math.min(1, distance / length)) * SAMPLES,
        i = Math.min(SAMPLES - 1, Math.floor(t)),
        k = t - i;
      return {
        x: lutX[i] + (lutX[i + 1] - lutX[i]) * k,
        y: lutY[i] + (lutY[i + 1] - lutY[i]) * k,
      };
    };
    /** Path distance at which the line reaches height `y` (SVG units). The
     *  path only ever runs downward, so the samples are sorted by y. */
    const lengthAtY = (y: number) => {
      if (y <= lutY[0]) return 0;
      if (y >= lutY[SAMPLES]) return length;
      let lo = 0,
        hi = SAMPLES;
      while (hi - lo > 1) {
        const mid = (lo + hi) >> 1;
        if (lutY[mid] <= y) lo = mid;
        else hi = mid;
      }
      const k = (y - lutY[lo]) / Math.max(1e-6, lutY[hi] - lutY[lo]);
      return ((lo + k) / SAMPLES) * length;
    };
    const render = () => {
      if (engine.view !== "about") {
        previous = "";
        measured = false;
        return;
      }
      // Geometry can only be read once About is displayed.
      if (!measured) {
        measure();
        if (!measured) return;
      }
      const scroll = engine.read().storyScrollY,
        top = height - scroll + paragraphY;
      const p = motion.matches
        ? 1
        : clamp01((height * 0.82 - top) / Math.max(1, paragraphHeight));
      const pathTop = height - scroll + trailY;
      const rawProgress =
        (height * tipLine - pathTop) / Math.max(1, trailHeight);
      // The story scroll is already damped by ScrollPhysics. Drive the stroke and
      // pen from that same position so they track smoothly in both directions.
      // (Unclamped: the line starts above this section, inside the manifesto.)
      const held = story.dataset.marker === "held";
      const key = `${p.toFixed(5)}:${rawProgress.toFixed(5)}:${held}`;
      if (key === previous) return;
      previous = key;
      words.forEach((word, i) => {
        const color = wordRevealColor(i, words.length, p);
        if (color === colors[i]) return;
        colors[i] = color;
        word.style.color = color;
      });
      badges.forEach(
        (badge, i) => (badge.dataset.visible = String(p >= stickers[i].at)),
      );
      // The pen tip rides a fixed line on screen (see tipLine).
      const drawLength =
        motion.matches || held
          ? length
          : lengthAtY((height * tipLine - pathTop) * unit);
      path.style.strokeDasharray = String(length);
      path.style.strokeDashoffset = String(length - drawLength);
      const pt = pointAt(drawLength),
        behind = pointAt(Math.max(0, drawLength - 4));
      const angle =
        (Math.atan2(pt.y - behind.y, pt.x - behind.x) * 180) / Math.PI;
      anchor.dataset.docked = String(drawLength >= length - 0.5);
      // The pen can only be picked up once it rests in the cap.
      pen.dataset.docked = String(!held && drawLength >= length - 0.5);
      pen.setAttribute(
        "transform",
        `translate(${pt.x} ${pt.y}) rotate(${angle}) scale(1.5)`,
      );
      pen.style.opacity = drawLength > 0 ? "1" : "0";
      // A station (with its node and connector tick) pops in once the pen
      // reaches its node; its clip plays only while it is shown on screen.
      stations.forEach((station, i) => {
        const shown = motion.matches || drawLength >= nodeAt[i] - 2;
        const on = String(shown);
        if (station.dataset.visible !== on) {
          station.dataset.visible = on;
          nodes[i].dataset.visible = on;
          ticks[i].dataset.visible = on;
        }
        const y = pathTop + nodeY[i];
        const play = shown && y > -260 && y < height + 260;
        if (play !== playing[i]) {
          playing[i] = play;
          if (play) void videos[i].play().catch(() => {});
          else videos[i].pause();
        }
      });
    };
    const measure = () => {
      // Work hides the story with display:none. Never replace the live SVG geometry
      // with zero-size measurements from that hidden tree.
      if (
        !trail.getClientRects().length ||
        trail.getBoundingClientRect().width < 1
      )
        return;
      measured = true;
      height = innerHeight;
      const origin = story.getBoundingClientRect().top,
        p = paragraph.getBoundingClientRect(),
        t = trail.getBoundingClientRect();
      paragraphY = p.top - origin;
      paragraphHeight = p.height;
      trailY = t.top - origin;
      const rel = (node: Element) => {
        const r = node.getBoundingClientRect();
        return {
          l: r.left - t.left,
          r: r.right - t.left,
          t: r.top - t.top,
          b: r.bottom - t.top,
          cy: r.top + r.height / 2 - t.top,
        };
      };
      const para = rel(paragraph),
        word = rel(startWord);

      const a = anchor.getBoundingClientRect(),
        headingTop = anchor.closest("h2")?.getBoundingClientRect().top ?? a.top;
      unit = 1;
      const W = t.width;
      const endX = a.left + a.width / 2 - t.left,
        endY = a.top + a.height / 2 - t.top;
      trailHeight = Math.max(1, endY);
      tipLine = Math.max(
        0.5,
        Math.min(0.92, 0.45 + (a.top + a.height / 2 - headingTop) / height),
      );

      // From "interface" out past the paragraph's right edge, down beside
      // it, then an S-curve that passes a node just beyond each station's
      // edge (the stations alternate sides) and drops into the full stop.
      // Station boxes come from layout offsets, so their reveal transform
      // never skews the geometry.
      const startX = Math.min(W - 16, word.r + 8);
      const stacked =
        stations.length > 0 &&
        getComputedStyle(stations[0]).flexDirection === "column";
      const nodePts = stations.map((st, i) => {
        // Stations sit in the (positioned) list, which sits in the trail.
        const left = list.offsetLeft + st.offsetLeft,
          right = left + st.offsetWidth,
          y = list.offsetTop + st.offsetTop + st.offsetHeight / 2;
        const x = stacked
          ? W - 10
          : STATIONS[i].side === "left"
            ? Math.min(W - 12, right + NODE_GAP)
            : Math.max(12, left - NODE_GAP);
        // Connector tick from the node to the station's edge.
        ticks[i].setAttribute(
          "d",
          stacked
            ? ""
            : STATIONS[i].side === "left"
              ? `M${n(right + 8)} ${n(y)}H${n(x - 9)}`
              : `M${n(x + 9)} ${n(y)}H${n(left - 8)}`,
        );
        nodes[i].setAttribute("cx", n(x));
        nodes[i].setAttribute("cy", n(y));
        return { x, y };
      });
      nodeY = nodePts.map((p) => p.y);
      const pts: Point[] = [
        { x: startX, y: word.cy },
        { x: startX, y: para.b + 34 },
        ...nodePts.map((p) => ({ ...p })),
        { x: endX, y: endY },
      ];
      for (let i = 1; i < pts.length; i++)
        pts[i].y = Math.max(pts[i].y, pts[i - 1].y + 12);
      const h = Math.max(t.height, endY) + 8;
      svg.setAttribute("viewBox", `0 0 ${n(W)} ${n(h)}`);
      svg.style.height = `${h}px`;
      path.setAttribute("d", thread(pts));
      originDot.setAttribute("cy", n(word.cy));
      originDot.setAttribute("cx", String(startX));
      length = path.getTotalLength();
      path.style.strokeDasharray = String(length);
      for (let i = 0; i <= SAMPLES; i++) {
        const point = path.getPointAtLength((length * i) / SAMPLES);
        lutX[i] = point.x;
        lutY[i] = point.y;
      }
      // Pen reaches each node at the path length of the node's height.
      nodeAt = nodeY.map((y) => lengthAtY(y));
      previous = "";
      render();
    };
    // Layout shifts (e.g. a discipline box animating open below) re-measure
    // the trail once they settle rather than on every frame.
    let settle: ReturnType<typeof setTimeout> | undefined;
    const observer = new ResizeObserver(() => {
      clearTimeout(settle);
      settle = setTimeout(measure, 120);
    });
    observer.observe(story);
    observer.observe(el);
    const unsubscribe = engine.subscribe(render);
    window.addEventListener("resize", measure);
    // Picking the marker up or putting it down redraws the trail at once.
    const markerChange = () => {
      previous = "";
      render();
    };
    window.addEventListener("portfolio:marker", markerChange);
    motion.addEventListener("change", measure);
    document.fonts.ready.then(() => {
      if (el.isConnected) measure();
    });
    measure();
    // Landing-style character warp on the station titles.
    const detachWarp = Array.from(
      trail.querySelectorAll<HTMLElement>(".station-title"),
    ).map((title) => attachHeadingWarp(title));
    return () => {
      detachWarp.forEach((detach) => detach());
      videos.forEach((video) => video.pause());
      unsubscribe();
      observer.disconnect();
      clearTimeout(settle);
      window.removeEventListener("resize", measure);
      window.removeEventListener("portfolio:marker", markerChange);
      motion.removeEventListener("change", measure);
    };
  }, [engine]);
  return (
    <div className="about-manifesto" ref={root}>
      <div className="manifesto-editorial">
        <p className="manifesto-kicker">A BIT ABOUT ME</p>
        <p className="scroll-manifesto">
          {copy.split(" ").map((word, i) => {
            const sticker = stickers.find((s) => s.word === word);
            return (
              <span key={i} className="scroll-word">
                {word}
                {sticker && (
                  <span
                    className="manifesto-sticker"
                    data-visible="false"
                    style={{ "--tilt": `${sticker.tilt}deg` } as CSSProperties}
                    aria-hidden="true"
                  >
                    {sticker.text}
                  </span>
                )}{" "}
              </span>
            );
          })}
        </p>
      </div>
      <section
        className="manifesto-trail runway"
        aria-label="Video editing, motion graphics, and UI / UX & web"
      >
        <svg viewBox="0 0 600 360" fill="none" aria-hidden="true">
          <circle
            className="manifesto-origin"
            cx="65"
            cy="0"
            r="5"
            fill="#ff4d1c"
          />
          <path
            className="manifesto-path"
            d="M65 12 C65 80 500 4 500 90 C500 174 90 96 90 205 C90 295 490 188 490 278 C490 330 350 332 350 355"
          />
          {STATIONS.map((st) => (
            <path
              className="station-tick"
              data-visible="false"
              pathLength={1}
              key={`tick-${st.title}`}
            />
          ))}
          {STATIONS.map((st) => (
            <circle
              className="station-node"
              data-visible="false"
              r="6"
              key={`node-${st.title}`}
            />
          ))}
          <g className="manifesto-pen" aria-hidden="true" data-drag-own="">
            {/* Pick-up handle (MarkerDraw): a bigger hit area and a soft ping. */}
            <circle className="pen-ping" cx="-20" cy="0" r="16" />
            <rect
              className="pen-hit"
              x="-46"
              y="-14"
              width="52"
              height="28"
              fill="transparent"
            />
            <path
              d="M0 0 L-14 -8 L-40 -8 L-40 8 L-14 8 Z"
              fill="#f3efe6"
              stroke="#ff4d1c"
              strokeWidth="2"
            />
            <path d="M0 0 L-14 -8 L-14 8 Z" fill="#ff4d1c" />
            <path d="M-33 -8 V8 M-27 -8 V8" stroke="#111113" strokeWidth="2" />
            <circle cx="0" cy="0" r="2.5" fill="#ff4d1c" />
          </g>
        </svg>
        <div className="station-list">
          {STATIONS.map((st) => {
            const project =
              projects.find((p) => p.id === st.project) ?? projects[0];
            const clip = (
              <figure
                className="station-video"
                style={{ "--tilt": `${st.tilt}deg` } as CSSProperties}
              >
                <video
                  src={assetUrl(project.video)}
                  poster={assetUrl(project.poster)}
                  muted
                  loop
                  playsInline
                  preload="metadata"
                  aria-hidden="true"
                />
              </figure>
            );
            const text = (
              <div className="station-copy">
                <h3 className="station-title" aria-label={st.title}>
                  <span aria-hidden="true">
                    <WarpChars text={st.title} />
                  </span>
                </h3>
                <p>{st.copy}</p>
              </div>
            );
            return (
              <article
                className={`station station-${st.side}`}
                data-visible="false"
                key={st.title}
              >
                {st.side === "right" ? (
                  <>
                    {text}
                    {clip}
                  </>
                ) : (
                  <>
                    {clip}
                    {text}
                  </>
                )}
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
