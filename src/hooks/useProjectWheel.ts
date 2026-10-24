"use client";
import { useCallback, useEffect, useRef, useState } from "react";

export function useProjectWheel(
  count: number,
  disabled: boolean,
  reducedMotion: boolean,
) {
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const lastStep = useRef(0);
  const select = useCallback(
    (next: number, force = false) => {
      const now = performance.now();
      if (
        (disabled && !force) ||
        (!force && now - lastStep.current < (reducedMotion ? 180 : 850))
      )
        return;
      lastStep.current = now;
      setDirection(next > index ? 1 : -1);
      setIndex(((next % count) + count) % count);
    },
    [count, disabled, index, reducedMotion],
  );
  const step = useCallback(
    (delta: number) => select(index + delta),
    [select, index],
  );
  useEffect(() => {
    let accumulated = 0,
      lastWheel = 0,
      startX = 0,
      startY = 0;
    const wheel = (event: WheelEvent) => {
      if (
        disabled ||
        event.ctrlKey ||
        (event.target as HTMLElement).closest("dialog")
      )
        return;
      event.preventDefault();
      const now = performance.now();
      if (now - lastWheel > 150) accumulated = 0;
      lastWheel = now;
      accumulated += event.deltaY * (event.deltaMode === 1 ? 16 : 1);
      if (Math.abs(accumulated) > 36) {
        step(Math.sign(accumulated));
        accumulated = 0;
      }
    };
    const key = (event: KeyboardEvent) => {
      if (
        disabled ||
        (event.target as HTMLElement).closest("input,textarea,select,dialog")
      )
        return;
      if (
        ["ArrowDown", "ArrowRight", "ArrowUp", "ArrowLeft"].includes(event.key)
      ) {
        event.preventDefault();
        step(["ArrowDown", "ArrowRight"].includes(event.key) ? 1 : -1);
      }
    };
    const start = (event: TouchEvent) => {
      startX = event.touches[0].clientX;
      startY = event.touches[0].clientY;
    };
    const end = (event: TouchEvent) => {
      if (disabled || (event.target as HTMLElement).closest("dialog,button,a"))
        return;
      const dx = startX - event.changedTouches[0].clientX,
        dy = startY - event.changedTouches[0].clientY;
      const delta = Math.abs(dy) > Math.abs(dx) ? dy : dx;
      if (Math.abs(delta) > 45) step(Math.sign(delta));
    };
    window.addEventListener("wheel", wheel, { passive: false });
    window.addEventListener("keydown", key);
    window.addEventListener("touchstart", start, { passive: true });
    window.addEventListener("touchend", end, { passive: true });
    return () => {
      window.removeEventListener("wheel", wheel);
      window.removeEventListener("keydown", key);
      window.removeEventListener("touchstart", start);
      window.removeEventListener("touchend", end);
    };
  }, [disabled, step]);
  return { index, direction, step, select };
}
