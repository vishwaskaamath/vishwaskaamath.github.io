"use client";
import { requestTick, cancelTick, getFrameDt } from '@/lib/masterTicker';

import { useThemeRef, THEME_EVENT } from "@/lib/theme";
import { useEffect, useRef, type RefObject } from 'react';
import type { WheelDrag } from '@/hooks/useProjectWheel';
import {spawnPulse,advancePulses,type ContourPulse} from '@/lib/contourPulse';
import { createWaveRenderer } from '@/lib/waveRenderer';

/** Sculpted contours and a separate translucent, intertwined silk ribbon. */
export default function WavyBackground({ reducedMotion, paused = false, dragRef }: { reducedMotion: boolean; paused?: boolean; dragRef: RefObject<WheelDrag> }) {
  const themeRef = useThemeRef();
  const phaseRef = useRef(0);
  const pulsesRef = useRef<ContourPulse[]>([]);
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
    const ctx = canvas.getContext('2d', { alpha: false, desynchronized: true });
    if (!ctx) return;
    let width = 0, height = 0, time = phaseRef.current, raf = 0, previous = 0;
    const motion = matchMedia('(prefers-reduced-motion: reduce)');
    const isStill = () => reducedMotion || motion.matches || (paused && !pulsesRef.current.length);

    const draw = () => {
      if (renderer) { renderer.draw(time,pulsesRef.current,themeRef.current === 'light'); return; }
      ctx.globalAlpha = 1;
      const light = themeRef.current === 'light';
      ctx.fillStyle = light ? '#f6f6f4' : '#060606';
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
          const y=baseY+warp;
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
        ctx.strokeStyle = light ? `rgba(20,20,24,${0.04 + i / 3 * 0.10})` : `rgba(19,19,19,${0.35 + i / 3 * 0.5})`;
        ctx.stroke(path);
      });
      ctx.lineWidth = 0.7;
      ctx.globalCompositeOperation = light ? 'multiply' : 'source-over';
      ctx.strokeStyle = light ? 'rgba(12,12,15,0.045)' : 'rgba(190,200,215,0.028)';
      const mesh=new Path2D();
      for (let i = 0; i < 75; i++) {
        const phase = i * 0.065;
        for (let x = 0; x <= width + 28; x += 28) {
          const spineY = height * 0.5 + Math.sin(x * 0.0022 + time * 0.35) * 110 - (x - width * 0.5) * 0.12;
          const twist = Math.sin(x * 0.0045 - time * 0.5 + phase) * 95 * Math.sin(x * 0.0018 + phase * 0.5)
            + Math.cos(x * 0.008 + time * 0.3 - phase * 1.2) * 35;
          const y=spineY+twist;
          if (!x) mesh.moveTo(x,y); else mesh.lineTo(x,y);
        }
      }
      ctx.stroke(mesh);
      ctx.globalCompositeOperation=light ? 'multiply' : 'lighter';
      const pulseColor=light ? '15,15,20' : '210,220,235';
      for(const p of pulsesRef.current){
        const outer=p.radius+70,inner=Math.max(0,p.radius-70);
        const glow=ctx.createRadialGradient(p.x,p.y,inner,p.x,p.y,outer);
        glow.addColorStop(0,`rgba(${pulseColor},0)`);
        glow.addColorStop(Math.max(.001,(p.radius-inner)/(outer-inner)),`rgba(${pulseColor},${.16*p.alpha})`);
        glow.addColorStop(1,`rgba(${pulseColor},0)`);ctx.strokeStyle=glow;
        ctx.lineWidth=3.5;bands.forEach(path=>ctx.stroke(path));
        ctx.lineWidth=.7;ctx.stroke(mesh);
      }
      ctx.globalCompositeOperation='source-over';
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
      {
        const dt=getFrameDt()*1000;
        if(!paused) {time += dt * 0.00072;phaseRef.current=time;}
        advancePulses(pulsesRef.current,dt);
        previous = now;
        draw();
      }
      raf = requestTick(animate);
    };
    const restart = () => {
      cancelTick(raf);previous=0;
      if (!document.hidden && !isStill()) raf = requestTick(animate);
      else draw();
    };
    let pointerId=-1,lastY=0,distance=0;
    const pulse=(event:PointerEvent)=>{
      window.dispatchEvent(new CustomEvent("portfolio-clean-click",{detail:{x:event.clientX,y:event.clientY}}));
      if(reducedMotion||motion.matches)return;
      spawnPulse(pulsesRef.current,event.clientX,event.clientY);
      restart();
    };
    const down=(event:PointerEvent)=>{
      if(!event.isPrimary||event.button!==0)return;
      pointerId=event.pointerId;lastY=event.clientY;distance=0;
    };
    const move=(event:PointerEvent)=>{if(event.pointerId===pointerId){distance+=Math.abs(event.clientY-lastY);lastY=event.clientY;}};
    const up=(event:PointerEvent)=>{
      if(event.pointerId!==pointerId)return;
      distance+=Math.abs(event.clientY-lastY);
      if(distance<=6 && dragRef.current.distance<=6)pulse(event);
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
    window.addEventListener('portfolio-warmup',draw);
    window.addEventListener(THEME_EVENT, draw);
    window.addEventListener('resize', resize);
    document.addEventListener('visibilitychange', restart);
    motion.addEventListener('change', restart);
    return () => {
      cancelTick(raf); renderer?.dispose();
      window.removeEventListener('pointerdown',down,true);
      window.removeEventListener('pointermove',move,true);
      window.removeEventListener('pointerup',up,true);
      window.removeEventListener('pointercancel',cancel,true);
      gpu.removeEventListener('webglcontextlost', lost); gpu.removeEventListener('webglcontextrestored', restored);
      window.removeEventListener('portfolio-warmup',draw);
      window.removeEventListener(THEME_EVENT, draw);
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', restart);
      motion.removeEventListener('change', restart);
    };
  }, [reducedMotion, paused, dragRef, themeRef]);
  return <div className="wavy-background" aria-hidden="true" data-renderer="canvas2d">
    <canvas ref={gpuRef} className="wavy-canvas" /><canvas ref={canvasRef} className="wavy-canvas wavy-backup" />
    <div className="wavy-grain" />
  </div>;
}
