"use client";
import { useEffect, useRef, type RefObject } from 'react';
import type { WheelDrag } from '@/hooks/useProjectWheel';
import {spawnRipple,advanceRipples,displaceRipple,type BackgroundRipple} from '@/lib/backgroundRipples';
import { createWaveRenderer } from '@/lib/waveRenderer';

/** Sculpted contours and a separate translucent, intertwined silk ribbon. */
export default function WavyBackground({ reducedMotion, paused = false, dragRef }: { reducedMotion: boolean; paused?: boolean; dragRef: RefObject<WheelDrag> }) {
  const ripplesRef = useRef<BackgroundRipple[]>([]);
  const gpuRef = useRef<HTMLCanvasElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current!;
    const gpu = gpuRef.current!;
    const touch = matchMedia('(pointer: coarse)').matches || innerWidth < 760;
    const safeRenderer = () => {
      if (touch) return null;
      try { return createWaveRenderer(gpu); } catch { return null; }
    };
    let renderer = safeRenderer();
    const setMode = () => { gpu.style.display = renderer ? 'block' : 'none'; canvas.style.display = renderer ? 'none' : 'block'; gpu.parentElement!.dataset.renderer = renderer ? 'webgl' : 'canvas2d'; };
    setMode();
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;
    let width = 0, height = 0, time = 0, raf = 0, previous = 0;
    const motion = matchMedia('(prefers-reduced-motion: reduce)');
    const isStill = () => reducedMotion || motion.matches || (paused && !ripplesRef.current.length);

    const draw = () => {
      if (renderer) { renderer.draw(time,ripplesRef.current); return; }
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#060606';
      ctx.fillRect(0, 0, width, height);
      ctx.lineJoin = 'round';
      ctx.lineCap = 'butt';
      ctx.lineWidth = 3.5;
      // Four quantized lighting paths, plus one silk path: five stroke calls.
      const highlights=Array.from({length:3},()=>new Path2D());
      const bands = Array.from({ length: 4 }, () => new Path2D());
      for (let baseY = -108; baseY <= height + 108; baseY += 12) {
        let px = 0, py = 0, previousBand = -1;
        for (let x = 0; x <= width + 28; x += 28) {
          const phase = x * 0.006 - baseY * 0.004 + time * 0.25;
          const warp = Math.sin(x * 0.0025 + baseY * 0.006 + time * 0.4) * 55
            + Math.cos(phase) * 28 + Math.sin((x + baseY) * 0.004 + time * 0.3) * 18;
          const point=displaceRipple(x,baseY+warp,ripplesRef.current);
          const y=point.y;
          if (x) {
            const bandIndex = Math.min(3, Math.floor((Math.cos(phase) + 1) * 2));
            const band = bands[bandIndex];
            if (bandIndex !== previousBand) band.moveTo(px, py);
            band.lineTo(point.x, y);
            if(point.highlight>.3){const shine=highlights[Math.min(2,Math.floor(point.highlight*3))];shine.moveTo(px,py);shine.lineTo(point.x,y);}
            previousBand = bandIndex;
          }
          px = point.x; py = y;
        }
      }
      bands.forEach((path, i) => {
        ctx.strokeStyle = `rgba(19,19,19,${0.35 + i / 3 * 0.5})`;
        ctx.stroke(path);
      });
      highlights.forEach((path,i)=>{ctx.strokeStyle=`rgba(210,220,235,${.14*(i+1)/3})`;ctx.stroke(path);});
      ctx.lineWidth = 0.7;
      ctx.strokeStyle = 'rgba(190,200,215,0.028)';
      ctx.beginPath();
      for (let i = 0; i < 75; i++) {
        const phase = i * 0.065;
        for (let x = 0; x <= width + 28; x += 28) {
          const spineY = height * 0.5 + Math.sin(x * 0.0022 + time * 0.35) * 110 - (x - width * 0.5) * 0.12;
          const twist = Math.sin(x * 0.0045 - time * 0.5 + phase) * 95 * Math.sin(x * 0.0018 + phase * 0.5)
            + Math.cos(x * 0.008 + time * 0.3 - phase * 1.2) * 35;
          const point=displaceRipple(x,spineY+twist,ripplesRef.current);
          if (!x) ctx.moveTo(point.x, point.y); else ctx.lineTo(point.x, point.y);
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
    const animate = (now: number) => {
      if (document.hidden || isStill()) return;
      if (!touch || now - previous >= 1000 / 30) {
        const dt=previous?Math.min(now-previous,50):1000/60;
        if(!paused) time += dt * 0.00072;
        advanceRipples(ripplesRef.current,dt);
        previous = now;
        draw();
      }
      raf = requestAnimationFrame(animate);
    };
    const restart = () => {
      cancelAnimationFrame(raf);previous=0;
      if (!document.hidden && !isStill()) raf = requestAnimationFrame(animate);
      else draw();
    };
    let pointerId=-1,lastY=0,distance=0;
    const pulse=(event:PointerEvent,small:boolean)=>{
      if(reducedMotion||motion.matches)return;
      spawnRipple(ripplesRef.current,event.clientX,event.clientY,width,height,small);
      restart();
    };
    const down=(event:PointerEvent)=>{
      if(!event.isPrimary||event.button!==0)return;
      pointerId=event.pointerId;lastY=event.clientY;distance=0;pulse(event,true);
    };
    const move=(event:PointerEvent)=>{if(event.pointerId===pointerId){distance+=Math.abs(event.clientY-lastY);lastY=event.clientY;}};
    const up=(event:PointerEvent)=>{
      if(event.pointerId!==pointerId)return;
      distance+=Math.abs(event.clientY-lastY);
      if(distance<=6 && dragRef.current.distance<=6)pulse(event,false);
      pointerId=-1;
    };
    const cancel=()=>{pointerId=-1;};
    window.addEventListener('pointerdown',down,true);
    window.addEventListener('pointermove',move,true);
    window.addEventListener('pointerup',up,true);
    window.addEventListener('pointercancel',cancel,true);
    const lost = (event: Event) => { event.preventDefault(); renderer = null; setMode(); draw(); };
    const restored = () => { renderer = safeRenderer(); setMode(); resize(); };
    gpu.addEventListener('webglcontextlost', lost); gpu.addEventListener('webglcontextrestored', restored);
    resize(); restart();
    window.addEventListener('resize', resize);
    document.addEventListener('visibilitychange', restart);
    motion.addEventListener('change', restart);
    return () => {
      cancelAnimationFrame(raf); renderer?.dispose();
      window.removeEventListener('pointerdown',down,true);
      window.removeEventListener('pointermove',move,true);
      window.removeEventListener('pointerup',up,true);
      window.removeEventListener('pointercancel',cancel,true);
      gpu.removeEventListener('webglcontextlost', lost); gpu.removeEventListener('webglcontextrestored', restored);
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', restart);
      motion.removeEventListener('change', restart);
    };
  }, [reducedMotion, paused, dragRef]);
  return <div className="wavy-background" aria-hidden="true" data-renderer="canvas2d">
    <canvas ref={gpuRef} className="wavy-canvas" /><canvas ref={canvasRef} className="wavy-canvas wavy-backup" />
    <div className="wavy-grain" />
  </div>;
}
