"use client";

import { useEffect, useRef } from "react";

const POINT_COUNT = 28;
const HEAD_LERP = 0.35;
const CHAIN_LERP = 0.42;

export default function RibbonCursor({ reducedMotion, layerKey }: {
  reducedMotion: boolean;
  layerKey: string | null;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const preferences = useRef({ reducedMotion });
  preferences.current.reducedMotion = reducedMotion;

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d", { alpha: true, desynchronized: true });
    if (!canvas || !ctx) return;
    const finePointer = matchMedia("(any-pointer: fine)");
    const points = Array.from({ length: POINT_COUNT }, () => ({ x: 0, y: 0 }));
    let mouseX = 0;
    let mouseY = 0;
    let width = innerWidth;
    let height = innerHeight;
    let active = false;
    let raf = 0;

    const reset = () => points.forEach((point) => { point.x = mouseX; point.y = mouseY; });
    const clear = () => ctx.clearRect(0, 0, width, height);
    const hide = () => {
      active = false;
      cancelAnimationFrame(raf);
      raf = 0;
      clear();
      document.documentElement.classList.remove("ribbon-cursor-enabled");
    };
    const strokePass = (bloom: boolean) => {
      ctx.shadowColor = "rgba(255, 255, 255, 0.95)";
      ctx.shadowBlur = bloom ? 20 : 0;
      const end = bloom ? POINT_COUNT / 2 : POINT_COUNT;
      for (let i = 0; i < end; i++) {
        const point = points[i];
        const previous = points[Math.max(0, i - 1)];
        const next = points[Math.min(POINT_COUNT - 1, i + 1)];
        const startX = i ? (previous.x + point.x) / 2 : point.x;
        const startY = i ? (previous.y + point.y) / 2 : point.y;
        const endX = (point.x + next.x) / 2;
        const endY = (point.y + next.y) / 2;
        if (Math.abs(endX - startX) + Math.abs(endY - startY) < 0.01) continue;
        const taper = i / (POINT_COUNT - 1);
        ctx.lineWidth = 5.5 + (0.2 - 5.5) * taper;
        ctx.strokeStyle = `rgba(255, 255, 255, ${(1 - taper) * (bloom ? 0.45 : 1)})`;
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.quadraticCurveTo(point.x, point.y, endX, endY);
        ctx.stroke();
      }
    };
    const draw = () => {
      raf = 0;
      if (!active || document.hidden) return;
      if (preferences.current.reducedMotion) reset();
      else {
        points[0].x += (mouseX - points[0].x) * HEAD_LERP;
        points[0].y += (mouseY - points[0].y) * HEAD_LERP;
        for (let i = 1; i < POINT_COUNT; i++) {
          points[i].x += (points[i - 1].x - points[i].x) * CHAIN_LERP;
          points[i].y += (points[i - 1].y - points[i].y) * CHAIN_LERP;
        }
      }
      const settled = points.every((point) => Math.abs(point.x - mouseX) + Math.abs(point.y - mouseY) < 0.025);
      if (settled) reset();
      clear();
      ctx.globalCompositeOperation = "lighter";
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      if (!settled) {
        strokePass(true);
        strokePass(false);
      }
      ctx.fillStyle = "#ffffff";
      ctx.shadowColor = "rgba(255, 255, 255, 0.95)";
      ctx.shadowBlur = 20;
      ctx.beginPath();
      ctx.arc(points[0].x, points[0].y, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      // A settled cursor keeps its final glowing dot without wasting idle frames.
      if (!settled) raf = requestAnimationFrame(draw);
    };
    const wake = () => { if (!raf && active && !document.hidden) raf = requestAnimationFrame(draw); };
    const move = (event: MouseEvent) => {
      if (!finePointer.matches) return;
      mouseX = event.clientX;
      mouseY = event.clientY;
      if (!active) {
        reset();
        active = true;
        document.documentElement.classList.add("ribbon-cursor-enabled");
      }
      wake();
    };
    const touch = (event: PointerEvent) => { if (event.pointerType === "touch") hide(); };
    const resize = () => {
      width = innerWidth;
      height = innerHeight;
      const dpr = Math.min(devicePixelRatio || 1, 1.5);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      wake();
    };
    const visibility = () => { if (document.hidden) hide(); };
    const pointerChange = () => { if (!finePointer.matches) hide(); };

    resize();
    window.addEventListener("mousemove", move, { passive: true });
    window.addEventListener("pointerdown", touch, { passive: true });
    window.addEventListener("resize", resize);
    window.addEventListener("blur", hide);
    document.addEventListener("mouseleave", hide);
    document.addEventListener("visibilitychange", visibility);
    finePointer.addEventListener("change", pointerChange);
    return () => {
      hide();
      window.removeEventListener("mousemove", move);
      window.removeEventListener("pointerdown", touch);
      window.removeEventListener("resize", resize);
      window.removeEventListener("blur", hide);
      document.removeEventListener("mouseleave", hide);
      document.removeEventListener("visibilitychange", visibility);
      finePointer.removeEventListener("change", pointerChange);
    };
  }, []);

  useEffect(() => {
    // Native dialogs outrank ordinary z-index. A non-interactive manual popover
    // keeps this one canvas above the dialog, without stealing focus or clicks.
    const canvas = canvasRef.current;
    if (!canvas || typeof canvas.showPopover !== "function") return;
    const frame = requestAnimationFrame(() => {
      if (canvas.matches(":popover-open")) canvas.hidePopover();
      canvas.showPopover();
    });
    return () => cancelAnimationFrame(frame);
  }, [layerKey]);

  return <canvas ref={canvasRef} className="ribbon-cursor" popover="manual" aria-hidden="true" />;
}
