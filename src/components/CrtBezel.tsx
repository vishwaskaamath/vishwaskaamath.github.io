"use client";
import { useEffect, useId, useRef } from 'react';
import { bezelGeometry, createBoundaryProjector } from '@/lib/bezelGeometry';
import { damp, subscribeProximity } from '@/lib/proximity';

type Speck = { x: number; y: number; vx: number; vy: number; age: number; life: number; size: number };

export default function CrtBezel() {
  const root = useRef<HTMLDivElement>(null);
  const svg = useRef<SVGSVGElement>(null);
  const gradient = useRef<SVGRadialGradientElement>(null);
  const flare = useRef<SVGGElement>(null);
  const bloom = useRef<SVGFilterElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const id = `crt-${useId().replace(/:/g, '')}`;
  useEffect(() => {
    const element = root.current!, screen = svg.current!, surface = canvas.current!;
    const ctx = surface.getContext('2d', { alpha: true, desynchronized: true });
    let w = innerWidth, h = innerHeight, project = createBoundaryProjector(bezelGeometry(w, h).curves);
    let intensity = 0, x = w / 2, y = 20, last = 0, emission = 0;
    const particles: Speck[] = [];
    const resize = () => {
      w = innerWidth; h = innerHeight;
      const shape = bezelGeometry(w, h);
      project = createBoundaryProjector(shape.curves);
      screen.setAttribute('viewBox', `0 0 ${w} ${h}`);
      screen.querySelectorAll('[data-rim]').forEach((path) => path.setAttribute('d', shape.path));
      screen.querySelectorAll('[data-shell]').forEach((path) => path.setAttribute('d', `M0 0H${w}V${h}H0Z ${shape.path}`));
      screen.querySelector('[data-outer-rim]')?.setAttribute('transform', `translate(${w / 2} ${h / 2}) scale(${1 + 10 / w} ${1 + 10 / h}) translate(${-w / 2} ${-h / 2})`);
      const dpr = Math.min(devicePixelRatio || 1, 1.5);
      surface.width = Math.round(w * dpr); surface.height = Math.round(h * dpr);
      ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
      particles.length = 0;
    };
    resize();
    window.addEventListener('resize', resize);
    const unsubscribe = subscribeProximity((pointer) => {
      const now = performance.now(), dt = Math.min(32, now - last || 16.67);
      last = now;
      const closest = pointer.enabled ? project(pointer) : null;
      const target = closest ? Math.max(0, 1 - closest.distance / 150) ** 2 : 0;
      if (!target && !intensity && !particles.length) return;
      return () => {
        if (closest && target) {
          if (intensity < 0.005) { x = closest.x; y = closest.y; }
          else {
            // Re-project the smoothed point, keeping the flare glued to the curve.
            const follow = project({ x: x + (closest.x - x) * 0.23, y: y + (closest.y - y) * 0.23 });
            x = follow.x; y = follow.y;
          }
        }
        intensity = damp(intensity, target, 0.14);
        gradient.current?.setAttribute('cx', String(x));
        gradient.current?.setAttribute('cy', String(y));
        gradient.current?.setAttribute('fx', String(x));
        gradient.current?.setAttribute('fy', String(y));
        bloom.current?.setAttribute('x', String(x - 180));
        bloom.current?.setAttribute('y', String(y - 180));
        flare.current!.style.opacity = String(intensity);
        element.dataset.glow = intensity.toFixed(3);
        element.dataset.edge = String(closest?.edge ?? -1);
        if (ctx) {
          ctx.clearRect(0, 0, w, h);
          ctx.globalCompositeOperation = 'lighter';
          if (pointer.enabled && intensity > 0.5 && target > 0.5 && closest) {
            emission += dt / 1000 * 28 * intensity;
            while (emission >= 1 && particles.length < 60) {
              emission--;
              const scatter = (Math.random() - 0.5) * 42;
              particles.push({ x: x - closest.ny * scatter, y: y + closest.nx * scatter,
                vx: closest.nx * (5 + Math.random() * 10) + (Math.random() - 0.5) * 4,
                vy: closest.ny * (5 + Math.random() * 10) + (Math.random() - 0.5) * 4,
                age: 0, life: 240 + Math.random() * 440, size: 0.35 + Math.random() * 0.65 });
            }
          } else emission = 0;
          for (let i = particles.length - 1; i >= 0; i--) {
            const p = particles[i]; p.age += dt;
            if (p.age >= p.life) { particles.splice(i, 1); continue; }
            p.x += p.vx * dt / 1000; p.y += p.vy * dt / 1000;
            const alpha = Math.sin(Math.PI * p.age / p.life) * 0.48;
            ctx.fillStyle = `rgba(205,255,249,${alpha})`;
            ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
          }
          element.dataset.specks = String(particles.length);
        }
        return intensity > 0 || particles.length > 0;
      };
    });
    return () => { unsubscribe(); window.removeEventListener('resize', resize); };
  }, []);

  return <div className="crt-bezel" ref={root} aria-hidden="true">
    <svg ref={svg} className="crt-frame" preserveAspectRatio="none" viewBox="0 0 1280 720">
      <defs>
        <linearGradient id={`${id}-metal`} x1="0" y1="0" x2="0.8" y2="1">
          <stop offset="0" stopColor="#8b8d89" stopOpacity="0.32" /><stop offset="0.25" stopColor="#111" />
          <stop offset="0.6" stopColor="#565953" stopOpacity="0.35" /><stop offset="1" stopColor="#a3a69e" stopOpacity="0.25" />
        </linearGradient>
        <radialGradient id={`${id}-glow`} ref={gradient} gradientUnits="userSpaceOnUse" cx="640" cy="20" r="140">
          <stop offset="0" stopColor="#fff" stopOpacity="0.95" /><stop offset="0.16" stopColor="#eafffc" stopOpacity="0.85" />
          <stop offset="0.46" stopColor="#a4fff6" stopOpacity="0.7" /><stop offset="0.78" stopColor="#a4fff6" stopOpacity="0.16" /><stop offset="1" stopColor="#a4fff6" stopOpacity="0" />
        </radialGradient>
        <filter id={`${id}-shadow`} x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="7" /></filter>
        <filter id={`${id}-bloom`} ref={bloom} filterUnits="userSpaceOnUse" x="460" y="-160" width="360" height="360"><feGaussianBlur stdDeviation="10" /></filter>
        <filter id={`${id}-grain`}><feTurbulence baseFrequency="0.85" numOctaves="2" stitchTiles="stitch" /><feColorMatrix type="saturate" values="0" /><feComposite in2="SourceGraphic" operator="in" /></filter>
      </defs>
      <path data-rim fill="none" stroke="#000" strokeWidth="22" opacity="0.9" filter={`url(#${id}-shadow)`} />
      <path data-shell fill="#141414" fillRule="evenodd" />
      <path data-shell fill="#fff" fillRule="evenodd" filter={`url(#${id}-grain)`} opacity="0.075" />
      <path data-rim data-outer-rim fill="none" stroke={`url(#${id}-metal)`} strokeWidth="2.5" />
      <path data-rim fill="none" stroke="#050606" strokeWidth="9" />
      <path data-rim fill="none" stroke={`url(#${id}-metal)`} strokeWidth="2" />
      <path data-rim fill="none" stroke="#ccd7cf" strokeWidth="0.5" opacity="0.15" />
      <g ref={flare} className="crt-flare" style={{ opacity: 0 }}>
        <path data-rim fill="none" stroke={`url(#${id}-glow)`} strokeWidth="20" filter={`url(#${id}-bloom)`} />
        <path data-rim fill="none" stroke={`url(#${id}-glow)`} strokeWidth="5" opacity="0.55" />
        <path data-rim fill="none" stroke={`url(#${id}-glow)`} strokeWidth="1.6" />
      </g>
    </svg>
    <canvas ref={canvas} className="crt-specks" />
  </div>;
}
