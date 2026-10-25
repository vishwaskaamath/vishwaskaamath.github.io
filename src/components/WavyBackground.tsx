"use client";
import { useEffect, useRef } from 'react';

/** Sculpted contours and a separate translucent, intertwined silk ribbon. */
export default function WavyBackground({ reducedMotion }: { reducedMotion: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;
    let width = 0, height = 0, time = 0, raf = 0;
    const motion = matchMedia('(prefers-reduced-motion: reduce)');
    const isStill = () => reducedMotion || motion.matches;

    const draw = () => {
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#060606';
      ctx.fillRect(0, 0, width, height);
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.lineWidth = 3.5;
      // Overscan by the full warp amplitude so the viewport edges stay filled.
      // About 90 contours at 1080px, plus the offscreen safety margin.
      for (let baseY = -108; baseY <= height + 108; baseY += 12) {
        const light = ctx.createLinearGradient(0, 0, width, 0);
        for (let x = 0; x < width; x += 64) {
          const alpha = 0.35 + (Math.cos(x * 0.006 - baseY * 0.004 + time * 0.25) + 1) * 0.25;
          light.addColorStop(x / width, `rgba(19,19,19,${alpha})`);
        }
        const endAlpha = 0.35 + (Math.cos(width * 0.006 - baseY * 0.004 + time * 0.25) + 1) * 0.25;
        light.addColorStop(1, `rgba(19,19,19,${endAlpha})`);
        ctx.strokeStyle = light;
        ctx.beginPath();
        for (let x = 0; x <= width + 8; x += 8) {
          const warp = Math.sin(x * 0.0025 + baseY * 0.006 + time * 0.4) * 55
            + Math.cos(x * 0.006 - baseY * 0.004 + time * 0.25) * 28
            + Math.sin((x + baseY) * 0.004 + time * 0.3) * 18;
          const y = baseY + warp;
          if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }

      ctx.lineWidth = 0.7;
      ctx.strokeStyle = 'rgba(190,200,215,0.028)';
      // Separate strokes preserve translucent accumulation at the pinch nodes.
      for (let i = 0; i < 75; i++) {
        const phase = i * 0.065;
        ctx.beginPath();
        for (let x = 0; x <= width + 8; x += 8) {
          const spineY = height * 0.5
            + Math.sin(x * 0.0022 + time * 0.35) * 110
            - (x - width * 0.5) * 0.12;
          const twist = Math.sin(x * 0.0045 - time * 0.5 + phase) * 95 * Math.sin(x * 0.0018 + phase * 0.5)
            + Math.cos(x * 0.008 + time * 0.3 - phase * 1.2) * 35;
          if (x === 0) ctx.moveTo(x, spineY + twist); else ctx.lineTo(x, spineY + twist);
        }
        ctx.stroke();
      }
    };
    const resize = () => {
      width = innerWidth; height = innerHeight;
      const dpr = Math.min(devicePixelRatio || 1, 1.5, Math.sqrt(2200000 / (width * height)));
      canvas.width = Math.max(1, Math.round(width * dpr));
      canvas.height = Math.max(1, Math.round(height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      draw();
    };
    const animate = () => {
      if (document.hidden || isStill()) return;
      time += 0.012;
      draw();
      raf = requestAnimationFrame(animate);
    };
    const restart = () => {
      cancelAnimationFrame(raf);
      if (!document.hidden && !isStill()) raf = requestAnimationFrame(animate);
      else draw();
    };
    resize(); restart();
    window.addEventListener('resize', resize);
    document.addEventListener('visibilitychange', restart);
    motion.addEventListener('change', restart);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', restart);
      motion.removeEventListener('change', restart);
    };
  }, [reducedMotion]);
  return <div className="wavy-background" aria-hidden="true" data-renderer="canvas2d">
    <canvas ref={canvasRef} className="wavy-canvas" />
    <div className="wavy-grain" />
  </div>;
}
