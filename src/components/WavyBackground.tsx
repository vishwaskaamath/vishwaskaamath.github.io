"use client";
import { useEffect, useRef } from 'react';
import { createWaveRenderer } from '@/lib/waveRenderer';

/** Sculpted contours and a separate translucent, intertwined silk ribbon. */
export default function WavyBackground({ reducedMotion, paused = false }: { reducedMotion: boolean; paused?: boolean }) {
  const gpuRef = useRef<HTMLCanvasElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current!;
    const gpu = gpuRef.current!;
    let renderer = createWaveRenderer(gpu);
    const setMode = () => { gpu.style.display = renderer ? 'block' : 'none'; canvas.style.display = renderer ? 'none' : 'block'; gpu.parentElement!.dataset.renderer = renderer ? 'webgl' : 'canvas2d'; };
    setMode();
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;
    let width = 0, height = 0, time = 0, raf = 0;
    const motion = matchMedia('(prefers-reduced-motion: reduce)');
    const isStill = () => reducedMotion || paused || motion.matches;

    const draw = () => {
      if (renderer) { renderer.draw(time); return; }
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#060606';
      ctx.fillRect(0, 0, width, height);
      ctx.lineJoin = 'round';
      ctx.lineCap = 'butt';
      ctx.lineWidth = 3.5;
      // Four quantized lighting paths, plus one silk path: five stroke calls.
      const bands = Array.from({ length: 4 }, () => new Path2D());
      for (let baseY = -108; baseY <= height + 108; baseY += 12) {
        let px = 0, py = 0, previousBand = -1;
        for (let x = 0; x <= width + 28; x += 28) {
          const phase = x * 0.006 - baseY * 0.004 + time * 0.25;
          const warp = Math.sin(x * 0.0025 + baseY * 0.006 + time * 0.4) * 55
            + Math.cos(phase) * 28 + Math.sin((x + baseY) * 0.004 + time * 0.3) * 18;
          const y = baseY + warp;
          if (x) {
            const bandIndex = Math.min(3, Math.floor((Math.cos(phase) + 1) * 2));
            const band = bands[bandIndex];
            if (bandIndex !== previousBand) band.moveTo(px, py);
            band.lineTo(x, y);
            previousBand = bandIndex;
          }
          px = x; py = y;
        }
      }
      bands.forEach((path, i) => {
        ctx.strokeStyle = `rgba(19,19,19,${0.35 + i / 3 * 0.5})`;
        ctx.stroke(path);
      });
      ctx.lineWidth = 0.7;
      ctx.strokeStyle = 'rgba(190,200,215,0.028)';
      ctx.beginPath();
      for (let i = 0; i < 75; i++) {
        const phase = i * 0.065;
        for (let x = 0; x <= width + 28; x += 28) {
          const spineY = height * 0.5 + Math.sin(x * 0.0022 + time * 0.35) * 110 - (x - width * 0.5) * 0.12;
          const twist = Math.sin(x * 0.0045 - time * 0.5 + phase) * 95 * Math.sin(x * 0.0018 + phase * 0.5)
            + Math.cos(x * 0.008 + time * 0.3 - phase * 1.2) * 35;
          if (!x) ctx.moveTo(x, spineY + twist); else ctx.lineTo(x, spineY + twist);
        }
      }
      ctx.stroke();
    };
    const resize = () => {
      width = innerWidth; height = innerHeight;
      renderer?.resize(width, height);
      canvas.width = width;
      canvas.height = height;
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
    const lost = (event: Event) => { event.preventDefault(); renderer = null; setMode(); draw(); };
    const restored = () => { renderer = createWaveRenderer(gpu); setMode(); resize(); };
    gpu.addEventListener('webglcontextlost', lost); gpu.addEventListener('webglcontextrestored', restored);
    resize(); restart();
    window.addEventListener('resize', resize);
    document.addEventListener('visibilitychange', restart);
    motion.addEventListener('change', restart);
    return () => {
      cancelAnimationFrame(raf); renderer?.dispose();
      gpu.removeEventListener('webglcontextlost', lost); gpu.removeEventListener('webglcontextrestored', restored);
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', restart);
      motion.removeEventListener('change', restart);
    };
  }, [reducedMotion, paused]);
  return <div className="wavy-background" aria-hidden="true" data-renderer="canvas2d">
    <canvas ref={gpuRef} className="wavy-canvas" /><canvas ref={canvasRef} className="wavy-canvas wavy-backup" />
    <div className="wavy-grain" />
  </div>;
}
