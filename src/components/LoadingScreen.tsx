"use client";
import { useEffect, useId, useRef } from 'react';
import { drawLightTrail, recordPoint, type TrailPoint } from '@/lib/lightTrail';

export default function LoadingScreen({onComplete}:{onComplete:()=>void}) {
  const root=useRef<HTMLDivElement>(null),canvas=useRef<HTMLCanvasElement>(null);
  const counter=useRef<HTMLSpanElement>(null),hole=useRef<SVGCircleElement>(null),displace=useRef<SVGFEDisplacementMapElement>(null);
  const state=useRef({time:0,points:[] as TrailPoint[]});
  const id=`intro-${useId().replace(/:/g,'')}`;
  useEffect(()=>{
    if(matchMedia('(max-width: 759px), (pointer: coarse)').matches){onComplete();return;}
    const element=root.current!,surface=canvas.current!,ctx=surface.getContext('2d',{alpha:true,desynchronized:true});
    if(!ctx){onComplete();return;}
    const reduce=matchMedia('(prefers-reduced-motion: reduce)');
    if(reduce.matches){onComplete();return;}
    document.documentElement.dataset.loading='true';
    const siblings=Array.from(element.parentElement!.children).filter(e=>e!==element) as HTMLElement[];
    const inert=siblings.map(e=>e.inert);siblings.forEach(e=>e.inert=true);
    let raf=0,last=0,w=innerWidth,h=innerHeight;
    const s=state.current;s.time=0;s.points.length=0;
    const resize=()=>{w=innerWidth;h=innerHeight;surface.width=w;surface.height=h;element.querySelector('svg')!.setAttribute('viewBox',`0 0 ${w} ${h}`);hole.current!.setAttribute('cx',String(w/2));hole.current!.setAttribute('cy',String(h/2));const filter=element.querySelector('filter')!;filter.setAttribute('width',String(w));filter.setAttribute('height',String(h));};
    const tick=(now:number)=>{
      if(document.hidden){last=0;raf=requestAnimationFrame(tick);return;}
      s.time+=last?Math.min(now-last,50):0;last=now;
      const p=Math.min(1,s.time/2400),angle=p*Math.PI*8;
      counter.current!.textContent=String(Math.floor(p*100)).padStart(2,'0');
      ctx.clearRect(0,0,w,h);
      if(s.time<2400){
        const blend=Math.max(0,Math.min(1,(p-0.55)/0.4));
        const ease=blend*blend*(3-2*blend);
        const radius=Math.min(64,w*0.14);
        const x=w/2+Math.sin(angle)*(Math.min(w*0.28,240)*(1-ease)+radius*ease);
        const y=h/2+Math.sin(angle*2)*Math.min(h*0.16,100)*(1-ease)+Math.cos(angle)*radius*ease;
        recordPoint(s.points,x,y);
        for(const point of s.points)point.age+=0.045;
        while(s.points.length&&s.points[0].age>=1)s.points.shift();
        drawLightTrail(ctx,s.points,{x,y});
      } else {
        const q=Math.min(1,(s.time-2400)/900),ease=q*q*(3-2*q);
        const r=Math.min(64,w*0.14)+(Math.hypot(w,h)*0.6+140)*ease;
        hole.current!.setAttribute('r',String(r));
        const scale=120*(1-q);
        displace.current!.setAttribute('scale',String(scale));
        hole.current!.style.filter=scale>=0.5?`url(#${id}-liquid)`:'none';
        counter.current!.style.opacity=String(Math.max(0,1-q*5));
        const ring:TrailPoint[]=[];
        for(let i=0;i<=96;i++){const a=i/96*Math.PI*2;ring.push({x:w/2+Math.cos(a)*r,y:h/2+Math.sin(a)*r,age:q});}
        drawLightTrail(ctx,ring);
        if(q>=1){onComplete();return;}
      }
      raf=requestAnimationFrame(tick);
    };
    const preference=()=>{if(reduce.matches){cancelAnimationFrame(raf);onComplete();}};
    resize();raf=requestAnimationFrame(tick);window.addEventListener('resize',resize);reduce.addEventListener('change',preference);
    return()=>{cancelAnimationFrame(raf);delete document.documentElement.dataset.loading;siblings.forEach((e,i)=>e.inert=inert[i]);window.removeEventListener('resize',resize);reduce.removeEventListener('change',preference);};
  },[id,onComplete]);
  return <div ref={root} className="loading-screen" role="status" aria-label="Opening portfolio">
    <svg width="100%" height="100%" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <filter id={`${id}-liquid`} filterUnits="userSpaceOnUse" x="0" y="0" width="1280" height="720" colorInterpolationFilters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency="0.015" numOctaves="1" seed="4" result="noise"/>
          <feDisplacementMap ref={displace} in="SourceGraphic" in2="noise" scale="120" xChannelSelector="R" yChannelSelector="G"/>
        </filter>
        <mask id={`${id}-mask`} maskUnits="userSpaceOnUse" x="0" y="0" width="100%" height="100%" style={{maskType:'luminance'}}>
          <rect width="100%" height="100%" fill="white"/>
          <circle ref={hole} r="0" fill="black"/>
        </mask>
      </defs>
      <rect width="100%" height="100%" fill="#060606" mask={`url(#${id}-mask)`}/>
    </svg>
    <canvas ref={canvas} aria-hidden="true"/>
    <span ref={counter} className="loading-counter" aria-hidden="true">00</span>
  </div>;
}
