"use client";
import { useMasterTicker } from './useMasterTicker';

import { useCallback, useEffect, useMemo, useRef } from "react";
import { setGeometryMoving } from "@/lib/geometryCache";
import { ScrollPhysics } from "@/lib/scrollPhysics";

export type WheelDrag = { isDragging: boolean; lastY: number; distance: number; velocity: number; wasDragged: boolean; pointerId: number };

export function useProjectWheel(count: number, disabled: boolean, reducedMotion: boolean) {
  const engine = useMemo(() => new ScrollPhysics(count), [count]);
  const index = useRef(0);
  const dragRef = useRef<WheelDrag>({isDragging:false,lastY:0,distance:0,velocity:0,wasDragged:false,pointerId:-1});
  const options = useRef({ disabled, reducedMotion });
  options.current = { disabled, reducedMotion };

  const select = useCallback((next: number, force = false) => {
    if (options.current.disabled && !force) return;
    engine.select(next, performance.now());
  }, [engine]);

  useMasterTicker((now, dt) => {
    const current = options.current.disabled ? engine.read() : engine.advance(now, options.current.reducedMotion, dt);
    setGeometryMoving(!options.current.disabled && !current.settled);
    index.current = current.index;
  });

  useEffect(() => {

    const drag = dragRef.current;
    const blocked = (target: EventTarget | null) =>
      target instanceof Element && !!target.closest("dialog,input,textarea,select,[contenteditable='true']");

    const wheel = (event: WheelEvent) => {
      if (options.current.disabled || event.ctrlKey || blocked(event.target)) return;
      event.preventDefault();
      engine.wheel(-event.deltaY, performance.now());
    };
    const key = (event: KeyboardEvent) => {
      if (options.current.disabled || blocked(event.target)) return;
      if (["ArrowDown", "ArrowRight", "ArrowUp", "ArrowLeft"].includes(event.key)) {
        event.preventDefault();
        engine.step(["ArrowDown", "ArrowRight"].includes(event.key) ? 1 : -1, performance.now());
      }
    };
    const start = (event: PointerEvent) => {
      if (!event.isPrimary || event.button !== 0) return;
      drag.wasDragged = false; drag.distance = 0;
      if (options.current.disabled || blocked(event.target)) return;
      if (event.target instanceof Element && event.target.closest("button:not(.video-hit):not(.view-project-button),a,[role='button']:not(.video-hit)")) return;
      drag.isDragging = true; drag.lastY = event.clientY; drag.velocity = 0; drag.pointerId = event.pointerId;
      engine.beginDrag();
      document.documentElement.dataset.wheelDragging = 'true';
    };
    const end = (event?: PointerEvent) => {
      if (!drag.isDragging || (event && event.pointerId !== drag.pointerId)) return;
      drag.isDragging = false; drag.wasDragged = drag.distance > 6;
      engine.endDrag(drag.wasDragged ? -drag.velocity : 0, performance.now());
      delete document.documentElement.dataset.wheelDragging;
    };
    const move = (event: PointerEvent) => {
      if (!drag.isDragging || event.pointerId !== drag.pointerId) return;
      if (options.current.disabled) { drag.velocity = 0; end(); return; }
      const deltaY = event.clientY - drag.lastY;
      drag.lastY = event.clientY; drag.distance += Math.abs(deltaY); drag.velocity = deltaY;
      drag.wasDragged = drag.distance > 6;
      engine.add(deltaY * 0.0045, performance.now());
      if (drag.wasDragged && event.cancelable) event.preventDefault();
    };
    const click = (event: MouseEvent) => {
      if (drag.wasDragged && event.detail !== 0) { event.preventDefault(); event.stopImmediatePropagation(); }
    };
    const ghost = (event: DragEvent) => { if ((event.target as Element)?.closest('.portfolio')) event.preventDefault(); };
    const blur = () => { drag.velocity = 0; end(); };
    const visibility = () => {
      if (document.hidden) blur();
    };

    window.addEventListener("wheel", wheel, { passive: false });
    window.addEventListener("keydown", key);
    window.addEventListener("pointerdown", start, true);
    window.addEventListener("pointermove", move, {passive:false});
    window.addEventListener("pointerup", end);
    window.addEventListener("pointercancel", end);
    window.addEventListener("click", click, true);
    window.addEventListener("dragstart", ghost);
    window.addEventListener("blur", blur);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      window.removeEventListener("wheel", wheel);
      window.removeEventListener("keydown", key);
      window.removeEventListener("pointerdown", start, true);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", end);
      window.removeEventListener("pointercancel", end);
      window.removeEventListener("click", click, true);
      window.removeEventListener("dragstart", ghost);
      window.removeEventListener("blur", blur);
      blur();
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [engine]);

  return { index: index.current, engine, select, dragRef };
}
