"use client";
import { requestTick, cancelTick, getFrameDt } from '@/lib/masterTicker';

import { useEffect, useLayoutEffect, useId, useRef } from 'react';
import { cachedBox, observeGeometry,refreshGeometry } from "@/lib/geometryCache";
import WarpedText from './WarpedText';

export default function AboutView({active,reducedMotion,onBurst,revealAt}:{active:boolean;reducedMotion:boolean;revealAt:number;onBurst:(x:number,y:number,count?:number)=>void}) {
  const root=useRef<HTMLElement>(null);
  const displacement=useRef<SVGFEDisplacementMapElement>(null);
  const id=`about-glitch-${useId().replace(/:/g,'')}`;
  useEffect(()=>observeGeometry(root.current!),[]);
  useLayoutEffect(()=>{
    const el=root.current!;
    const title=el.querySelector<HTMLElement>('.about-unfold')!;
    if(!active || reducedMotion) { title.style.filter='none'; el.dataset.warpDisabled='false'; return; }
    el.dataset.warpDisabled='true';
    const delay=Math.max(0,revealAt-performance.now());
    const unlock=window.setTimeout(()=>{el.dataset.warpDisabled='false';refreshGeometry();},delay+550+18*14);
    const animations:Animation[]=[];
    const ease='cubic-bezier(.16,1,.3,1)';
    const cells=Array.from(el.querySelectorAll<HTMLElement>('.about-headline .char-cell'));
    cells.forEach((cell,i)=>animations.push(cell.animate([
      {transform:'translate3d(0,45px,0)',opacity:0},
      {transform:'translate3d(0,0,0)',opacity:1}
    ],{duration:550,delay:delay+i*18,easing:ease,fill:'both'})));
    animations.push(el.querySelector('.about-bio')!.animate([{opacity:0,transform:'translate(-50%,15px)'},{opacity:1,transform:'translate(-50%,0)'}],{duration:550,delay,easing:ease,fill:'both'}));
    let raf=0,burst=false;const start=performance.now();
    const tick=(now:number)=>{
      const elapsed=now-start;
      if(elapsed>=delay && elapsed<delay+300){
        if(!burst){const box=cachedBox(el);onBurst(box.x+box.width/2,box.y+box.height/2,65);burst=true;}
        title.style.filter=`url(#${id})`;
        displacement.current?.setAttribute('scale',String(45*(1-(elapsed-delay)/300)));
      }else title.style.filter='none';
      if(elapsed<delay+300)raf=requestTick(tick);
    };
    raf=requestTick(tick);
    return()=>{clearTimeout(unlock);el.dataset.warpDisabled='false';cancelTick(raf);animations.forEach(a=>a.cancel());title.style.filter='none';displacement.current?.setAttribute('scale','0');};
  },[active,reducedMotion,id,onBurst,revealAt]);
  return <section ref={root} className="about-view" data-active={active} aria-hidden={!active} inert={!active} aria-label="About Vishwas Kamath">
    <svg className="warp-definitions" aria-hidden="true"><defs><filter id={id} x="-20%" y="-50%" width="140%" height="200%" colorInterpolationFilters="sRGB">
      <feTurbulence type="fractalNoise" baseFrequency="0.001 0.18" numOctaves="1" result="noise"/>
      <feColorMatrix in="noise" type="matrix" values="1 0 0 0 0  0 0 0 0 0.5  0 0 1 0 0  0 0 0 1 0" result="horizontalNoise"/>
      <feDisplacementMap ref={displacement} in="SourceGraphic" in2="horizontalNoise" scale="0" xChannelSelector="R" yChannelSelector="G"/>
    </filter></defs></svg>
    <h1 className="about-headline"><span className="about-unfold"><WarpedText radius={130} smoothing={0.1}>HI, I'M VISHWAS.</WarpedText></span></h1>
    <p className="about-bio">I create motion graphics, edit films, and design digital experiences.<br/>Turning ideas into stories you can see, feel, and interact with.</p>
  </section>;
}
