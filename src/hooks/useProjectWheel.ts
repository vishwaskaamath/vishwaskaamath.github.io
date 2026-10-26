"use client";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { ScrollPhysics } from "@/lib/scrollPhysics";

export function useProjectWheel(count: number, disabled: boolean, reducedMotion: boolean) {
  const engine = useMemo(() => new ScrollPhysics(count), [count]);
  const index = useRef(0);
  const options = useRef({ disabled, reducedMotion });
  options.current = { disabled, reducedMotion };

  const select = useCallback((next: number, force = false) => {
    if (options.current.disabled && !force) return;
    engine.select(next, performance.now());
  }, [engine]);

  useEffect(() => {
    let raf = 0;

    let dragging = false;
    let touchX = 0;
    let touchY = 0;
    const blocked = (target: EventTarget | null) =>
      target instanceof Element && !!target.closest("dialog,input,textarea,select,[contenteditable='true']");

    const frame = (now: number) => {
      const current = engine.advance(now, options.current.reducedMotion);
      index.current = current.index;
      raf = requestAnimationFrame(frame);
    };
    const wheel = (event: WheelEvent) => {
      if (options.current.disabled || event.ctrlKey || blocked(event.target)) return;
      event.preventDefault();
      engine.wheel(event.deltaY, performance.now());
    };
    const key = (event: KeyboardEvent) => {
      if (options.current.disabled || blocked(event.target)) return;
      if (["ArrowDown", "ArrowRight", "ArrowUp", "ArrowLeft"].includes(event.key)) {
        event.preventDefault();
        engine.step(["ArrowDown", "ArrowRight"].includes(event.key) ? 1 : -1, performance.now());
      }
    };
    const start = (event: TouchEvent) => {
      if (options.current.disabled || blocked(event.target) || event.touches.length !== 1) return;
      if (event.target instanceof Element && event.target.closest("button:not(.video-hit),a")) return;
      dragging = true;
      touchX = event.touches[0].clientX;
      touchY = event.touches[0].clientY;
    };
    const move = (event: TouchEvent) => {
      if (!dragging || options.current.disabled || event.touches.length !== 1) return;
      const dx = touchX - event.touches[0].clientX;
      const dy = touchY - event.touches[0].clientY;
      const delta = Math.abs(dy) > Math.abs(dx) ? dy : dx;
      touchX = event.touches[0].clientX;
      touchY = event.touches[0].clientY;
      if (delta) {
        event.preventDefault();
        engine.add(delta * 0.004, performance.now());
      }
    };
    const end = () => { dragging = false; };
    const visibility = () => {
      cancelAnimationFrame(raf);
      if (!document.hidden) raf = requestAnimationFrame(frame);
    };

    raf = requestAnimationFrame(frame);
    window.addEventListener("wheel", wheel, { passive: false });
    window.addEventListener("keydown", key);
    window.addEventListener("touchstart", start, { passive: true });
    window.addEventListener("touchmove", move, { passive: false });
    window.addEventListener("touchend", end, { passive: true });
    window.addEventListener("touchcancel", end, { passive: true });
    document.addEventListener("visibilitychange", visibility);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("wheel", wheel);
      window.removeEventListener("keydown", key);
      window.removeEventListener("touchstart", start);
      window.removeEventListener("touchmove", move);
      window.removeEventListener("touchend", end);
      window.removeEventListener("touchcancel", end);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [engine]);

  return { index: index.current, engine, select };
}
