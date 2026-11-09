"use client";
import { useEffect, useRef, type RefObject } from "react";
import { damp, subscribeTicker } from "@/lib/masterTicker";
import { createWaveRenderer } from "@/lib/waveRenderer";

/** The About story's palette: orange, wine and deep teal. */
const PALETTE = ["#FF4D1C", "#702633", "#18564e"];

/**
 * The About page's backdrop for the résumé page: soft colour field, the
 * cursor-led ribbon and falling embers that speed up while you scroll.
 * Same renderer as the portfolio (WavyBackground), driven by the résumé's own
 * scroller instead of the portfolio's scroll engine.
 */
export default function ResumeBackground({
  scroller,
}: {
  scroller: RefObject<HTMLDivElement | null>;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const renderer = createWaveRenderer(canvas.current!);
    if (!renderer) return;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    let mouseX = innerWidth * 0.5,
      mouseY = innerHeight * 0.5,
      x = mouseX,
      y = mouseY,
      energy = 0,
      velocity = 0,
      phase = 0,
      lastScroll = scroller.current?.scrollTop ?? 0;
    const resize = () => renderer.resize(innerWidth, innerHeight);
    const move = (event: PointerEvent) => {
      mouseX = event.clientX;
      mouseY = event.clientY;
    };
    resize();
    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", move, { passive: true });
    const stop = subscribeTicker((_now, dt) => {
      if (document.hidden) return;
      const still = reduced.matches;
      const top = scroller.current?.scrollTop ?? 0;
      // Same units as the About story: px per second / 400.
      velocity = damp(
        velocity,
        (top - lastScroll) / Math.max(dt, 0.001) / 400,
        6,
        dt,
      );
      lastScroll = top;
      x = still ? mouseX : damp(x, mouseX, 5, dt);
      y = still ? mouseY : damp(y, mouseY, 5, dt);
      energy = still ? 0 : damp(energy, Math.min(3, Math.abs(velocity)), 5, dt);
      if (!still) phase += dt * 0.36;
      renderer.draw(phase, [], {
        mouseX: x,
        mouseY: y,
        energy,
        palette: PALETTE,
        dt,
        velocity,
        story: true,
        storyProgress: 0,
        ribbonAlpha: 0.45,
      });
    });
    return () => {
      stop();
      renderer.dispose();
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", move);
    };
  }, [scroller]);
  return (
    <div className="cut-bg" aria-hidden="true">
      <canvas ref={canvas} />
    </div>
  );
}
