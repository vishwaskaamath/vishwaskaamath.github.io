"use client";
import { useLayoutEffect, useRef } from "react";
import type { ScrollPhysics } from "@/lib/scrollPhysics";
import { refreshGeometry } from "@/lib/geometryCache";
import { subscribeTicker } from "@/lib/masterTicker";
import { attachHeadingWarp } from "@/lib/headingWarp";
import KineticChapters from "./KineticChapters";
import AboutManifesto from "./AboutManifesto";
import RevealText from "./RevealText";
import MarkerDraw from "./MarkerDraw";

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));
const easeInOut = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

const SPEC: [string, string][] = [
  ["ROLE", "VIDEO EDITOR, MOTION & UI/UX DESIGNER"],
  ["BASE", "BENGALURU, IN"],
  ["PIPELINE", "PREMIERE / AFTER EFFECTS / BLENDER / FIGMA"],
  ["FOR", "BRANDS, AGENCIES & CREATIVE STUDIOS"],
];

/** Offset of `node` inside `root` from layout (transforms ignored). */
function offsetWithin(node: HTMLElement, root: HTMLElement) {
  let y = 0,
    el: HTMLElement | null = node;
  while (el && el !== root) {
    y += el.offsetTop;
    el = el.offsetParent as HTMLElement | null;
  }
  return y;
}

export default function StoryStage({ engine }: { engine: ScrollPhysics }) {
  const root = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const el = root.current!,
      work = document.querySelector<HTMLElement>(".work-scene")!,
      videoWheel = work.querySelector<HTMLElement>(".video-wheel")!,
      software = work.querySelector<HTMLElement>(".software-wheel")!,
      title = work.querySelector<HTMLElement>(".project-metadata")!;
    let height = innerHeight;
    let lastHidden = false;
    const measure = () => {
      height = innerHeight;
      if (el.offsetHeight > 0) engine.configureStory(el.offsetHeight, height);
      engine.invalidate();
    };
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    window.addEventListener("resize", measure);
    document.fonts.ready.then(() => {
      if (el.isConnected) measure();
    });
    measure();
    const update = () => {
      const f = engine.read(),
        p = f.handoff;
      el.style.display = engine.view === "about" ? "" : "none";
      work.style.display = engine.view === "work" ? "" : "none";
      el.style.transform = `translate3d(0,${height - f.storyScrollY}px,0)`;
      el.style.visibility = f.storyScrollY > 0 ? "visible" : "hidden";
      el.inert = f.storyScrollY <= 0;
      videoWheel.style.translate = `${-12 * p}vw ${-8 * p}vh`;
      videoWheel.style.opacity = String(1 - p);
      software.style.translate = `${12 * p}vw ${-8 * p}vh`;
      software.style.opacity = String(1 - p);
      title.style.scale = String(1 - 0.1 * p);
      title.style.opacity = String(1 - p);
      work.style.visibility = p >= 1 ? "hidden" : "visible";
      work.inert = p >= 1;
      if (lastHidden !== p >= 1) {
        lastHidden = p >= 1;
        refreshGeometry();
      }
    };
    const release = engine.subscribe(update);
    const focus = (event: FocusEvent) => {
      const target = event.target as HTMLElement;
      if (!target.matches(":focus-visible")) return;
      const top = target.getBoundingClientRect().top;
      if (top < 100 || top > height - 100) {
        const y =
          target.getBoundingClientRect().top - el.getBoundingClientRect().top;
        engine.scrollTo(y - height * 0.45);
      }
    };
    el.addEventListener("focusin", focus);
    return () => {
      release();
      observer.disconnect();
      window.removeEventListener("resize", measure);
      el.removeEventListener("focusin", focus);
    };
  }, [engine]);

  // Landing-style character warp on the hero heading.
  useLayoutEffect(
    () =>
      attachHeadingWarp(
        root.current!.querySelector<HTMLElement>(".about-hero")!,
      ),
    [],
  );

  // About motion loop: heading rise-reveals, the 3D fly-through
  // tilt of the falling background, and the pinned film aperture with its
  // rolling, draggable strip. One ticker, direct transform writes, no React
  // state, and nothing is measured per frame.
  useLayoutEffect(() => {
    const el = root.current!;
    const canvas = document.querySelector<HTMLElement>(".wavy-canvas");
    const intro = el.querySelector<HTMLElement>(".story-intro")!;
    const tear = el.querySelector<HTMLElement>(".tear-section")!;
    const pin = tear.querySelector<HTMLElement>(".tear-pin")!;
    const reel = tear.querySelector<HTMLElement>(".tear-strip-angle")!;
    const track = reel.querySelector<HTMLElement>(".tear-strip")!;
    const rises = Array.from(
      el.querySelectorAll<HTMLElement>("[data-rise]"),
    ).map((node) => ({ node, y: 0, shown: "" }));
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    let tearY = 0,
      tearH = 1,
      introH = 1,
      canvasKey = "",
      setWidth = 1,
      reelPos = 0,
      lastView = engine.view,
      lastKey = "";
    // Film drag: 1:1 while held, then the throw coasts and decays.
    const drag = { on: false, id: -1, lastX: 0, velocity: 0 };
    const measure = () => {
      if (!el.offsetHeight) return;
      introH = intro.offsetHeight || 1;
      tearY = offsetWithin(tear, el);
      tearH = tear.offsetHeight || 1;
      rises.forEach((r) => (r.y = offsetWithin(r.node, el)));
      lastKey = "";
    };
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    window.addEventListener("resize", measure);
    document.fonts.ready.then(() => el.isConnected && measure());
    measure();
    // The track holds the frames twice; one set is the seamless loop. Its
    // width is cached here and never read inside the frame loop.
    const measureReel = () => {
      setWidth = track.scrollWidth / 2 || 1;
    };
    const reelObserver = new ResizeObserver(measureReel);
    reelObserver.observe(track);
    window.addEventListener("resize", measureReel);
    measureReel();

    const down = (event: PointerEvent) => {
      if (event.button !== 0) return;
      drag.on = true;
      drag.id = event.pointerId;
      drag.lastX = event.clientX;
      drag.velocity = 0;
      try {
        reel.setPointerCapture(event.pointerId);
      } catch {}
      reel.dataset.dragging = "true";
    };
    const move = (event: PointerEvent) => {
      if (!drag.on || event.pointerId !== drag.id) return;
      const dx = event.clientX - drag.lastX;
      drag.lastX = event.clientX;
      reelPos -= dx;
      drag.velocity = drag.velocity * 0.4 - dx * 0.6;
    };
    const up = (event: PointerEvent) => {
      if (!drag.on || event.pointerId !== drag.id) return;
      drag.on = false;
      try {
        reel.releasePointerCapture(event.pointerId);
      } catch {}
      delete reel.dataset.dragging;
    };
    reel.addEventListener("pointerdown", down);
    reel.addEventListener("pointermove", move);
    reel.addEventListener("pointerup", up);
    reel.addEventListener("pointercancel", up);

    // Film aperture: hold the reel on screen for a stretch of scroll. This
    // runs in the scroll engine's own update, in the same step that moves the
    // page, so the pin never trails the page by a frame (which read as the
    // reel jerking up and down while scrolling).
    let pinKey = "";
    const releasePin = engine.subscribe((frame) => {
      if (engine.view !== "about") return;
      const local = frame.virtualScrollY - tearY;
      const vh = innerHeight;
      if (local < -vh || local > tearH) return;
      const pinned = Math.max(0, Math.min(tearH - vh, local)).toFixed(1);
      if (pinned === pinKey) return;
      pinKey = pinned;
      pin.style.transform = `translate3d(0,${pinned}px,0)`;
    });

    const stop = subscribeTicker((_now, dt) => {
      if (engine.view !== lastView) {
        lastView = engine.view;
        if (engine.view === "about") measure();
        else {
          // Leaving About: headings drop back so they rise again next time.
          rises.forEach((r) => {
            r.shown = "false";
            r.node.dataset.revealed = "false";
          });
          if (canvas) {
            canvas.style.transform = "";
            canvasKey = "";
          }
        }
      }
      if (engine.view !== "about" || document.hidden) return;
      const still = reduced.matches;
      const scroll = engine.read().virtualScrollY;
      const vh = innerHeight,
        vw = innerWidth;

      // Fly-through: the falling background tilts back in 3D as the story
      // begins and drifts with the scroll. Scale keeps every edge of the
      // canvas off screen at any tilt (checked for the full 24 degrees).
      if (canvas) {
        const t = still ? 0 : easeInOut(clamp01(scroll / (introH * 0.55)));
        const drift = still ? 0 : Math.sin(scroll * 0.0011) * 14;
        const ck = `${t.toFixed(3)}|${drift.toFixed(1)}`;
        if (ck !== canvasKey) {
          canvasKey = ck;
          canvas.style.transform =
            t === 0 && drift === 0
              ? ""
              : `perspective(900px) rotateX(${(t * 24).toFixed(2)}deg) translate3d(0,${(drift - t * 20).toFixed(1)}px,0) scale(${(1.2 + t * 0.32).toFixed(3)})`;
        }
      }

      // Film reel: its X position depends only on time and the cursor,
      // never on scroll. A constant time-delta glide, plus drag and its
      // throw (decayed per 60fps-frame equivalent so it feels the same at
      // 60 or 120 Hz), wrapped with a positive modulo so it never jumps.
      // Scroll only decides whether the reel is on screen at all.
      const local = scroll - tearY;
      const tearVisible = local > -vh && local < tearH;
      if (tearVisible) {
        const ms = Math.min(32, dt * 1000);
        const frames = ms / (1000 / 60);
        if (!drag.on) {
          drag.velocity *= Math.pow(0.94, frames);
          if (Math.abs(drag.velocity) < 0.02) drag.velocity = 0;
          reelPos += (still ? 0 : 0.055 * ms) + drag.velocity * frames;
        }
        reelPos = ((reelPos % setWidth) + setWidth) % setWidth;
        track.style.transform = `translate3d(${(-reelPos).toFixed(2)}px,0,0)`;
      }

      const key = `${scroll.toFixed(1)}|${vw}|${vh}`;
      if (key === lastKey) return;
      lastKey = key;

      // 1. Headings rise into their masks once their top passes 78% of the
      //    screen, and sink back if you scroll back down past it.
      rises.forEach((r) => {
        const on = still || r.y - scroll < vh * 0.78 ? "true" : "false";
        if (on === r.shown) return;
        r.shown = on;
        r.node.dataset.revealed = on;
      });
    });
    return () => {
      stop();
      releasePin();
      observer.disconnect();
      reelObserver.disconnect();
      window.removeEventListener("resize", measure);
      window.removeEventListener("resize", measureReel);
      reel.removeEventListener("pointerdown", down);
      reel.removeEventListener("pointermove", move);
      reel.removeEventListener("pointerup", up);
      reel.removeEventListener("pointercancel", up);
      if (canvas) canvas.style.transform = "";
    };
  }, [engine]);

  return (
    <div
      ref={root}
      className="story-stage"
      id="story"
      inert
      onPointerMove={(event) => {
        if (
          event.pointerType !== "mouse" ||
          matchMedia("(prefers-reduced-motion: reduce)").matches
        )
          return;
        const target = (event.target as Element).closest<HTMLElement>(
          ".contact-links a,.contact-bottom button",
        );
        if (target) {
          const r = target.getBoundingClientRect();
          target.style.translate = `${(event.clientX - r.left - r.width / 2) * 0.16}px ${(event.clientY - r.top - r.height / 2) * 0.2}px`;
        }
      }}
      onPointerOut={(event) => {
        const target = (event.target as Element).closest<HTMLElement>(
          ".contact-links a,.contact-bottom button",
        );
        if (target && !target.contains(event.relatedTarget as Node))
          target.style.translate = "0px 0px";
      }}
    >
      <div className="story-step-edge" aria-hidden="true">
        {Array.from({ length: 16 }, (_, i) => (
          <i key={i} style={{ height: `${20 + ((i * 3) % 4) * 18}px` }} />
        ))}
      </div>
      <section
        className="story-intro story-chapter"
        aria-labelledby="intro-title"
      >
        <h2
          id="intro-title"
          className="about-hero"
          data-rise
          aria-label="Vishwas Kamath — Motion & Visual Editor"
        >
          <RevealText className="hero-line hero-solid" text="VISHWAS KAMATH" />
          <RevealText
            className="hero-line hero-outline"
            text="MOTION & VISUAL EDITOR"
            start={13}
          />
        </h2>
        <div className="about-spec">
          <dl className="about-spec-table">
            {SPEC.map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
        </div>
        <AboutManifesto engine={engine} />
      </section>
      <KineticChapters engine={engine} />
      <MarkerDraw engine={engine} />
    </div>
  );
}
