"use client";
import { requestTick, cancelTick, getFrameDt } from '@/lib/masterTicker';

import { useEffect, useId, useRef } from 'react';
import { actualProgressRef,assetStatus,preloadAssets,continueStreaming } from '@/lib/assetPreloader';
import { drawLightTrail, recordPoint, type TrailPoint } from '@/lib/lightTrail';

export default function LoadingScreen({onComplete}:{onComplete:()=>void}) {
  const root=useRef<HTMLDivElement>(null),canvas=useRef<HTMLCanvasElement>(null);
  const counter=useRef<HTMLSpanElement>(null),hole=useRef<SVGCircleElement>(null),displace=useRef<SVGFEDisplacementMapElement>(null);
  const status=useRef<HTMLSpanElement>(null),actions=useRef<HTMLDivElement>(null);
  const state=useRef({time:0,points:[] as TrailPoint[]});
  const id=`intro-${useId().replace(/:/g,'')}`;
  useEffect(()=>{
    const element=root.current!,surface=canvas.current!,ctx=surface.getContext('2d',{alpha:true,desynchronized:true});

    const reduce=matchMedia('(prefers-reduced-motion: reduce)');
    void preloadAssets();
    document.documentElement.dataset.loading='true';
    const siblings=Array.from(element.parentElement!.children).filter(e=>e!==element) as HTMLElement[];
    const inert=siblings.map(e=>e.inert);siblings.forEach(e=>e.inert=true);
    let raf=0,last=0,revealAt=-1,w=innerWidth,h=innerHeight;
    const s=state.current;s.time=0;s.points.length=0;
    const resize=()=>{w=innerWidth;h=innerHeight;surface.width=w;surface.height=h;element.querySelector('svg')!.setAttribute('viewBox',`0 0 ${w} ${h}`);hole.current!.setAttribute('cx',String(w/2));hole.current!.setAttribute('cy',String(h/2));const filter=element.querySelector('filter')!;filter.setAttribute('width',String(w));filter.setAttribute('height',String(h));};
    const tick=(now:number)=>{
      if(!root.current||!counter.current||!hole.current||!displace.current)return;
      if(document.hidden){last=0;raf=requestTick(tick);return;}
      s.time+=last?Math.min(now-last,50):0;last=now;
      const p=actualProgressRef.current/100,angle=s.time*.01047;
      if(status.current)status.current.textContent=assetStatus.phase==='error'?'Some assets could not load.':assetStatus.phase==='warming'?'Preparing graphics':`Loading assets · ${(assetStatus.loadedBytes/1048576).toFixed(1)} / ${(assetStatus.totalBytes/1048576).toFixed(1)} MB`;
      if(actions.current)actions.current.hidden=assetStatus.phase!=='error';
      if(p>=1&&revealAt<0)revealAt=s.time;
      counter.current!.textContent=String(Math.floor(p*100)).padStart(2,'0');
      ctx?.clearRect(0,0,w,h);
      if(revealAt<0){
        const blend=Math.max(0,Math.min(1,(p-0.55)/0.4));
        const ease=blend*blend*(3-2*blend);
        const radius=Math.min(64,w*0.14);
        const x=w/2+Math.sin(angle)*(Math.min(w*0.28,240)*(1-ease)+radius*ease);
        const y=h/2+Math.sin(angle*2)*Math.min(h*0.16,100)*(1-ease)+Math.cos(angle)*radius*ease;
        recordPoint(s.points,x,y);
        for(const point of s.points)point.age+=2.7*getFrameDt();
        while(s.points.length&&s.points[0].age>=1)s.points.shift();
        if(ctx&&!reduce.matches)drawLightTrail(ctx,s.points,{x,y});
      } else {
        const q=Math.min(1,(s.time-revealAt)/(reduce.matches?1:900)),ease=q*q*(3-2*q);
        const r=Math.min(64,w*0.14)+(Math.hypot(w,h)*0.6+140)*ease;
        hole.current!.setAttribute('r',String(r));
        const scale=120*(1-q);
        displace.current!.setAttribute('scale',String(scale));
        hole.current!.style.filter=scale>=0.5?`url(#${id}-liquid)`:'none';
        counter.current!.style.opacity=String(Math.max(0,1-q*5));
        const ring:TrailPoint[]=[];
        for(let i=0;i<=96;i++){const a=i/96*Math.PI*2;ring.push({x:w/2+Math.cos(a)*r,y:h/2+Math.sin(a)*r,age:q});}
        if(ctx&&!reduce.matches)drawLightTrail(ctx,ring);
        if(q>=1){onComplete();return;}
      }
      raf=requestTick(tick);
    };
    resize();raf=requestTick(tick);window.addEventListener('resize',resize);
    return()=>{cancelTick(raf);delete document.documentElement.dataset.loading;siblings.forEach((e,i)=>e.inert=inert[i]);window.removeEventListener('resize',resize);};
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
    <div className="loading-details"><span ref={status}>Loading assets</span><div ref={actions} hidden>
      <button onClick={()=>void preloadAssets()}>Retry downloads</button>
      <button onClick={()=>void continueStreaming()}>Continue with streaming</button>
    </div></div>
    <span ref={counter} className="loading-counter" aria-hidden="true">00</span>
  </div>;
}
