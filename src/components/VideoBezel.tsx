"use client";
import { cachedBox,observeGeometry,geometryRevision } from "@/lib/geometryCache";
import { getFrameDt } from "@/lib/masterTicker";
import { useThemeRef } from "@/lib/theme";
import { useEffect, useId, useRef, type ReactNode } from 'react';
import { bezelGeometry, createBoundaryProjector } from '@/lib/bezelGeometry';
import { damp, subscribeProximity } from '@/lib/proximity';
import LiquidSurface from './LiquidSurface';

type Speck = { x: number; y: number; vx: number; vy: number; life: number; size: number };

/** The clip, glass and two rims live in the same deformable card-local layer. */
export default function VideoBezel({ children }: { children: ReactNode }) {
  const themeRef = useThemeRef();
  const root = useRef<HTMLDivElement>(null);
  const glass = useRef<HTMLDivElement>(null);
  const id = `video-crt-${useId().replace(/:/g, '')}`;
  useEffect(() => {
    const element = root.current!, layer = glass.current!;
    const releaseGeometry=observeGeometry(element);
    const card = element.closest<HTMLElement>('[data-video]')!;
    const screen = element.querySelector<SVGSVGElement>('.video-rims')!;
    const gradient = screen.querySelector('radialGradient')!;
    const flare = screen.querySelector<SVGGElement>('.video-rim-flare')!;
    const canvas = element.querySelector('canvas')!;
    const ctx = canvas.getContext('2d', { alpha: true, desynchronized: true });
    const probes = Array.from(element.querySelectorAll<HTMLElement>('.card-probe'));
    let w = 1, h = 1, glow = 0, tiltX = 0, tiltY = 0, last = 0, emission = 0;
    let project = createBoundaryProjector(bezelGeometry(400, 240).curves);
    const specks: Speck[] = [];
    const resize = () => {
      w = element.offsetWidth; h = element.offsetHeight;
      if (!w || !h) return;
      const template = bezelGeometry(1000, 600);
      const curves = template.curves.map(c => c.map(p => ({x:p.x*w/1000,y:p.y*h/600}))) as typeof template.curves;
      const pathOf = (cs: typeof curves) => `M ${cs[0][0].x} ${cs[0][0].y} ` + cs.map(c => `C ${c.slice(1).map(p => `${p.x} ${p.y}`).join(' ')}`).join(' ') + ' Z';
      const shape = {curves,path:pathOf(curves)};
      project = createBoundaryProjector(shape.curves);
      screen.setAttribute('viewBox', `0 0 ${w} ${h}`);
      element.querySelectorAll('[data-card-path]').forEach(path => path.setAttribute('d', shape.path));
      element.querySelector('[data-card-clip]')!.setAttribute('d', pathOf(template.curves.map(c => c.map(p => ({x:p.x/1000,y:p.y/600}))) as typeof curves));
      // 3px half-bevel + 3.5px air gap + 0.75px half-outline.
      element.querySelectorAll('[data-floating-rim]').forEach(path => path.setAttribute('transform', `translate(${w/2} ${h/2}) scale(${1+14.5/w} ${1+14.5/h}) translate(${-w/2} ${-h/2})`));
      canvas.width = w; canvas.height = h;
    };
    resize();
    const observer = new ResizeObserver(resize); observer.observe(element);
    const unsubscribe = subscribeProximity(pointer => {
      const active = card.classList.contains('is-active') && pointer.enabled && !card.closest('[data-expanded="true"]');
      if (!active && !glow && !tiltX && !tiltY && !specks.length) return;
      // Unwarped probes invert the carousel's rotation and scale, avoiding feedback.
      const [o, a, b] = probes.map(p => cachedBox(p));
      const ax = (a.x-o.x)/w, ay = (a.y-o.y)/w, bx = (b.x-o.x)/h, by = (b.y-o.y)/h;
      const det = ax*by-ay*bx;
      if (Math.abs(det)<0.001) return;
      const px = pointer.x-o.x, py = pointer.y-o.y;
      const x = (px*by-py*bx)/det, y = (py*ax-px*ay)/det;
      const near = active && x > -100 && x < w+100 && y > -100 && y < h+100;
      const closest = near ? project({x,y}) : null;
      const target = closest ? Math.max(0,1-closest.distance/100)**2 : 0;
      const inside = active && x>=0 && x<=w && y>=0 && y<=h;
      const now = performance.now(), dt = getFrameDt()*1000; last=now;
      return () => {
        glow = damp(glow,target,0.14);
        tiltX = damp(tiltX,inside ? -(y/h-.5)*4 : 0,0.1);
        tiltY = damp(tiltY,inside ? (x/w-.5)*5 : 0,0.1);
        layer.style.transform = `perspective(800px) rotateX(${tiltX}deg) rotateY(${tiltY}deg)`;
        if (closest) { gradient.setAttribute('cx',String(closest.x)); gradient.setAttribute('cy',String(closest.y)); }
        flare.style.opacity = String(glow);
        flare.style.display = glow < .002 ? 'none' : '';
        element.dataset.glow = glow.toFixed(3);
        if (ctx) {
          ctx.clearRect(0,0,w,h); ctx.globalCompositeOperation=themeRef.current==='light'?'source-over':'lighter';
          if (target>.5 && closest) {
            emission += dt*.035*glow;
            while(emission>=1 && specks.length<32) {
              emission--;
              const spread=(Math.random()-.5)*24;
              specks.push({x:closest.x-closest.ny*spread,y:closest.y+closest.nx*spread,vx:closest.nx*12,vy:closest.ny*12,life:1,size:.5+Math.random()});
            }
          } else emission=0;
          for(let i=specks.length-1;i>=0;i--) {
            const p=specks[i]; p.life-=dt/550; p.x+=p.vx*dt/1000; p.y+=p.vy*dt/1000;
            if(p.life<=0){specks.splice(i,1);continue;}
            ctx.fillStyle=`rgba(${themeRef.current==='light'?'55,85,100':'190,255,246'},${p.life*.65})`;
            ctx.beginPath();ctx.arc(p.x,p.y,p.size,0,Math.PI*2);ctx.fill();
          }
        }
        return glow>0 || tiltX!==0 || tiltY!==0 || specks.length>0;
      };
    });
    return () => { releaseGeometry(); observer.disconnect(); unsubscribe(); };
  }, [id, themeRef]);
  return <div className="video-bezel" ref={root}>
    <div className="video-glass" ref={glass}>
      <LiquidSurface className="video-lens">
        <div className="video-aperture" style={{clipPath:`url(#${id}-clip)`}}>{children}</div>
        <svg className="video-rims" aria-hidden="true" preserveAspectRatio="none">
          <defs>
            <clipPath id={`${id}-clip`} clipPathUnits="objectBoundingBox"><path data-card-clip /></clipPath>
            <radialGradient id={`${id}-glow`} gradientUnits="userSpaceOnUse" r="95">
              <stop stopColor="#fff"/><stop offset=".22" stopColor="#e9fffc"/><stop offset=".55" stopColor="#a4fff6" stopOpacity=".65"/><stop offset="1" stopColor="#a4fff6" stopOpacity="0"/>
            </radialGradient>
            <filter id={`${id}-bloom`} x="-30%" y="-40%" width="160%" height="180%"><feGaussianBlur stdDeviation="5"/></filter>
          </defs>
          <path data-card-path fill="none" stroke="#161616" strokeWidth="6"/>
          <path data-card-path fill="none" stroke="#c2cfc5" strokeOpacity=".22" strokeWidth=".65"/>
          <path data-card-path data-floating-rim fill="none" stroke="#d0dbd5" strokeOpacity=".3" strokeWidth="1.5"/>
          <g className="video-rim-flare" style={{display:'none'}} fill="none" stroke={`url(#${id}-glow)`}>
            <g filter={`url(#${id}-bloom)`} opacity=".65"><path data-card-path strokeWidth="9"/><path data-card-path data-floating-rim strokeWidth="4"/></g>
            <path data-card-path strokeWidth="2.5"/><path data-card-path data-floating-rim strokeWidth="1.5"/>
          </g>
        </svg>
        <canvas className="video-rim-specks" aria-hidden="true"/>
      </LiquidSurface>
    </div>
    <i className="card-probe probe-origin"/><i className="card-probe probe-x"/><i className="card-probe probe-y"/>
  </div>;
}
