"use client";
import { useEffect, useRef } from "react";
import { subscribeTicker } from "@/lib/masterTicker";
import type { ScrollPhysics } from "@/lib/scrollPhysics";
const clamp = (x: number) => Math.max(0, Math.min(1, x));
const out = (x: number) => 1 - Math.pow(1 - clamp(x), 3);
const ease = (x: number) => {
  x = clamp(x);
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
};
export default function StoryNavigation({ engine }: { engine: ScrollPhysics }) {
  const canvas = useRef<HTMLCanvasElement>(null),
    hud = useRef<HTMLDivElement>(null),
    button = useRef<HTMLButtonElement>(null);
  const navigate = useRef<(view: "work" | "about") => void>(() => {});
  useEffect(() => {
    const c = canvas.current!,
      ctx = c.getContext("2d")!,
      main = c.closest("main")!;
    let width = innerWidth,
      height = innerHeight,
      elapsed = 0,
      active = false,
      swapped = false,
      buffer = 0,
      destination: "work" | "about" = "about";
    const stamps = new Map<string, HTMLCanvasElement>();
    const bake = () => {
      width = innerWidth;
      height = innerHeight;
      c.width = width;
      c.height = height;
      stamps.clear();
      for (const word of ["ABOUT", "WORK"]) {
        const stamp = document.createElement("canvas");
        stamp.width = width;
        stamp.height = height;
        const s = stamp.getContext("2d")!;
        s.font = `700 ${Math.round(Math.min(width * 0.36, height * 0.58))}px "Bebas Neue", sans-serif`;
        s.fillStyle = "#111113";
        s.fillText(word, width * 0.035, height * 0.95);
        stamps.set(word, stamp);
      }
    };
    bake();
    document.fonts.load('700 100px "Bebas Neue"').then(() => {
      if (c.isConnected) bake();
    });
    window.addEventListener("resize", bake);
    navigate.current = (view) => {
      if (active || view === engine.view || main.dataset.cinema !== "closed")
        return;
      active = true;
      main.dataset.storyTransition = "true";
      document.documentElement.dataset.storyTransition = "true";
      destination = view;
      elapsed = 0;
      swapped = false;
      buffer = 0;
      engine.locked = true;
      main.inert = true;
      c.style.visibility = "visible";
    };
    const open = () => navigate.current("about");
    window.addEventListener("portfolio:story", open);
    engine.onBoundary = () => navigate.current("work");
    const sync = () => {
      const about = engine.view === "about";
      const b = button.current!;
      const label = about ? "BACK TO WORK" : "ABOUT & CONTACT";
      if (b.dataset.label !== label) {
        b.dataset.label = label;
        b.querySelectorAll(".portal-label").forEach(
          (el) => (el.textContent = label),
        );
        b.setAttribute(
          "aria-label",
          about ? "Back to work" : "About and contact",
        );
      }
      hud.current!.dataset.view = engine.view;
    };
    const off = engine.subscribe(sync);
    const stop = subscribeTicker((_now, dt) => {
      if (!active) return;
      if (buffer > 0) buffer--;
      else elapsed += Math.min(dt * 1000, 16.67);
      if (elapsed >= 680 && !swapped) {
        swapped = true;
        engine.setView(destination);
        buffer = 2;
        document.title =
          destination === "about"
            ? "Vishwas Kamath — About"
            : "Vishwas Kamath — Motion Portfolio";
      }
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = "#F3EFE6";
      const cover = elapsed < 600,
        uncover = elapsed >= 780,
        wave = cover
          ? (elapsed / 600) * 1.15
          : uncover
            ? ((elapsed - 780) / 600) * 1.15
            : 2;
      const cw = width / 16,
        ch = height / 10;
      for (let col = 0; col < 16; col++)
        for (let row = 0; row < 10; row++) {
          const threshold =
            (col / 15) * 0.42 +
            ((9 - row) / 9) * 0.48 +
            ((col * 3) % 4) * 0.035;
          const local = clamp((wave - threshold) / 0.14);
          const fill = uncover ? 1 - ease(local) : out(local);
          if (fill > 0)
            ctx.fillRect(
              col * cw - 0.5,
              row * ch + (cover ? ch * (1 - fill) : 0) - 0.5,
              cw + 1,
              ch * fill + 1,
            );
        }
      const enter = out((elapsed - 140) / 280),
        exit = ease((elapsed - 780) / 600),
        offset = elapsed < 780 ? 140 * (1 - enter) : -180 * exit;
      ctx.globalCompositeOperation = "source-atop";
      ctx.globalAlpha = elapsed < 780 ? enter : 1 - exit;
      const stamp = stamps.get(destination.toUpperCase());
      if (stamp) ctx.drawImage(stamp, 0, offset);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";
      if (elapsed >= 1380) {
        active = false;
        ctx.clearRect(0, 0, width, height);
        c.style.visibility = "hidden";
        delete main.dataset.storyTransition;
        delete document.documentElement.dataset.storyTransition;
        engine.locked = false;
        main.inert = false;
        button.current?.focus({ preventScroll: true });
      }
    });
    return () => {
      off();
      stop();
      engine.onBoundary = null;
      engine.locked = false;
      main.inert = false;
      delete main.dataset.storyTransition;
      delete document.documentElement.dataset.storyTransition;
      window.removeEventListener("portfolio:story", open);
      window.removeEventListener("resize", bake);
    };
  }, [engine]);
  useEffect(() => {
    const wrap = hud.current!,
      b = button.current!;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    let box = { left: 0, right: 0, top: 0, bottom: 0 },
      pulled = false;
    // The wrapper is never transformed, so its box is the pill's rest position.
    const measure = () => {
      const r = wrap.getBoundingClientRect();
      box = { left: r.left, right: r.right, top: r.top, bottom: r.bottom };
    };
    const release = () => {
      if (!pulled) return;
      pulled = false;
      b.style.setProperty("--mx", "0px");
      b.style.setProperty("--my", "0px");
    };
    const move = (event: PointerEvent) => {
      if (event.pointerType !== "mouse" || reduced.matches) return;
      const x = event.clientX,
        y = event.clientY;
      const gap = Math.hypot(
        Math.max(box.left - x, 0, x - box.right),
        Math.max(box.top - y, 0, y - box.bottom),
      );
      if (gap > 110) return release();
      pulled = true;
      const cx = (box.left + box.right) / 2,
        cy = (box.top + box.bottom) / 2;
      b.style.setProperty("--mx", `${((x - cx) * 0.14).toFixed(2)}px`);
      b.style.setProperty("--my", `${((y - cy) * 0.14).toFixed(2)}px`);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(wrap);
    window.addEventListener("resize", measure);
    window.addEventListener("pointermove", move, { passive: true });
    document.documentElement.addEventListener("pointerleave", release);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
      window.removeEventListener("pointermove", move);
      document.documentElement.removeEventListener("pointerleave", release);
    };
  }, []);
  // Two crisp 13px arrows (the second waits above, out of view).
  const arrow = (
    <svg viewBox="0 0 13 13" aria-hidden="true">
      <path d="M6.5 1.5v10M2 7l4.5 4.5L11 7" />
    </svg>
  );

  return (
    <>
      <div ref={hud} className="reel-scroll-prompt story-portal">
        <button
          ref={button}
          className="portal-pill"
          aria-label="About and contact"
          onClick={() =>
            navigate.current(engine.view === "work" ? "about" : "work")
          }
        >
          <span className="portal-flood" aria-hidden="true" />
          <span className="portal-title" aria-hidden="true">
            <span className="portal-roll">
              <span className="portal-label">ABOUT & CONTACT</span>
              <span className="portal-label">ABOUT & CONTACT</span>
            </span>
          </span>
          <span className="portal-circle" aria-hidden="true">
            <span className="portal-arrows">
              {arrow}
              {arrow}
            </span>
          </span>
        </button>
      </div>
      <canvas
        ref={canvas}
        className="story-transition-canvas"
        aria-hidden="true"
      />
    </>
  );
}
