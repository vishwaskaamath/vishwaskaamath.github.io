"use client";
import { requestTick, cancelTick, getFrameDt } from '@/lib/masterTicker';

import { useCallback, useEffect, useRef } from "react";

import { THEME_EVENT, type ThemeRef } from "@/lib/theme";

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  size: number;
};
/** One capped, DPR-aware canvas; no React renders in the animation loop. */
export function useParticles(reducedMotion: boolean, themeRef: ThemeRef) {
  const wakeRef = useRef<() => void>(() => {});
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particles = useRef<Particle[]>([]);
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
    const draw = (now: number) => {
      raf = 0;
      const dt = getFrameDt()*60;
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
        ctx.fillStyle = `rgba(${themeRef.current === "light" ? "40,40,46" : "222,220,212"},${(p.life / p.max) * 0.6})`;
        ctx.fillRect(p.x, p.y, p.size, p.size);
      }
      if (particles.current.length) raf = requestTick(draw);
    };
    const wake = () => {
      if (!raf && !document.hidden) { last = performance.now(); raf = requestTick(draw); }
    };
    wakeRef.current = wake;
    const visibility = () => {
      cancelTick(raf); raf = 0;
      if (!document.hidden && particles.current.length) wake();
    };
    resize();
    window.addEventListener(THEME_EVENT, wake);
    window.addEventListener("resize", resize);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      cancelTick(raf);
      wakeRef.current = () => {};
      window.removeEventListener(THEME_EVENT, wake);
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", visibility);
      particles.current = [];
    };
  }, [reducedMotion, burst, themeRef]);
  return { canvasRef, burst };
}
