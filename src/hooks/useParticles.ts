"use client";
import { useCallback, useEffect, useRef } from "react";

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  size: number;
};
type Ripple = {
  x: number;
  y: number;
  started: number;
  max: number;
  dots: { angle: number; offset: number; size: number }[];
};

/** One capped, DPR-aware canvas; no React renders in the animation loop. */
export function useParticles(reducedMotion: boolean) {
  const wakeRef = useRef<() => void>(() => {});
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particles = useRef<Particle[]>([]);
  const ripples = useRef<Ripple[]>([]);
  const burst = useCallback(
    (x: number, y: number, count = 75) => {
      if (reducedMotion) return;
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2,
          speed = 0.6 + Math.random() * 3;
        particles.current.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 40 + Math.random() * 30,
          max: 70,
          size: 0.5 + Math.random(),
        });
      }
      particles.current = particles.current.slice(-650);
      wakeRef.current();
    },
    [reducedMotion],
  );

  useEffect(() => {
    const canvas = canvasRef.current,
      ctx = canvas?.getContext("2d");
    if (!canvas || !ctx || reducedMotion) return;
    let width = innerWidth,
      height = innerHeight,
      raf = 0,
      last = 0;
    const resize = () => {
      width = innerWidth;
      height = innerHeight;
      const dpr = Math.min(devicePixelRatio, 1.5);
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    const click = (event: PointerEvent) => {
      if (
        (event.target as HTMLElement).closest(
          "button,a,dialog,video,[data-interactive]",
        )
      )
        return;
      ripples.current.push({
        x: event.clientX,
        y: event.clientY,
        started: performance.now(),
        max: Math.hypot(width, height),
        dots: Array.from({ length: 650 }, () => ({
          angle: Math.random() * Math.PI * 2,
          offset: (Math.random() - 0.5) * 25,
          size: 0.4 + Math.random() * 1.1,
        })),
      });
      ripples.current = ripples.current.slice(-3);
      burst(event.clientX, event.clientY, 45);
    };
    const draw = (now: number) => {
      raf = 0;
      const dt = Math.min((now - last) / 16.67 || 1, 2);
      last = now;
      ctx.clearRect(0, 0, width, height);
      for (let i = particles.current.length - 1; i >= 0; i--) {
        const p = particles.current[i];
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.life -= dt;
        if (p.life <= 0) {
          particles.current.splice(i, 1);
          continue;
        }
        ctx.fillStyle = `rgba(222,220,212,${(p.life / p.max) * 0.6})`;
        ctx.fillRect(p.x, p.y, p.size, p.size);
      }
      ripples.current = ripples.current.filter((r) => now - r.started < 1700);
      for (const r of ripples.current) {
        const progress = (now - r.started) / 1700,
          radius = (1 - Math.pow(1 - progress, 2)) * r.max;
        ctx.fillStyle = `rgba(232,229,219,${(1 - progress) * 0.48})`;
        for (const dot of r.dots) {
          const rad = radius + dot.offset;
          ctx.fillRect(
            r.x + Math.cos(dot.angle) * rad,
            r.y + Math.sin(dot.angle) * rad,
            dot.size,
            dot.size,
          );
        }
      }
      if (particles.current.length || ripples.current.length) raf = requestAnimationFrame(draw);
    };
    const wake = () => {
      if (!raf && !document.hidden) { last = performance.now(); raf = requestAnimationFrame(draw); }
    };
    wakeRef.current = wake;
    const visibility = () => {
      cancelAnimationFrame(raf); raf = 0;
      if (!document.hidden && (particles.current.length || ripples.current.length)) wake();
    };
    resize();
    window.addEventListener("resize", resize);
    window.addEventListener("pointerdown", click);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      cancelAnimationFrame(raf);
      wakeRef.current = () => {};
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointerdown", click);
      document.removeEventListener("visibilitychange", visibility);
      particles.current = [];
      ripples.current = [];
    };
  }, [reducedMotion, burst]);
  return { canvasRef, burst };
}
