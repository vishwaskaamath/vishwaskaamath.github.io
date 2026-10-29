"use client";
import { requestTick, cancelTick, getFrameDt } from '@/lib/masterTicker';

import { useEffect, useId, useRef } from 'react';
import { cachedBox, observeGeometry,refreshGeometry } from "@/lib/geometryCache";
import WarpedText from './WarpedText';

export default function AboutView({active,reducedMotion,onBurst}:{active:boolean;reducedMotion:boolean;onBurst:(x:number,y:number,count?:number)=>void}) {
  const root=useRef<HTMLElement>(null);
  const displacement=useRef<SVGFEDisplacementMapElement>(null);
  const id=`about-glitch-${useId().replace(/:/g,'')}`;
  useEffect(()=>observeGeometry(root.current!),[]);
  useEffect(()=>{
    const el=root.current!;
    const title=el.querySelector<HTMLElement>('.about-unfold')!;
    if(!active || reducedMotion) { title.style.filter='none'; el.dataset.warpDisabled='false'; return; }
    el.dataset.warpDisabled='true';
    const unlock=window.setTimeout(()=>{el.dataset.warpDisabled='false';refreshGeometry();},1800);
    const animations:Animation[]=[];
    const ease='cubic-bezier(.16,1,.3,1)';
    el.querySelectorAll<SVGGElement>('.about-ring').forEach((ring,i)=>{
      const collapse=450+(8-i)*40;
      animations.push(ring.animate([
        {transform:'scale(0)',opacity:0,offset:0},
        {transform:'scale(0)',opacity:1,offset:i*12/1050},
        {transform:'scale(1)',opacity:1,offset:450/1050,easing:'linear'},
        {transform:'scale(1)',opacity:1,offset:collapse/1050,easing:'cubic-bezier(.76,0,.24,1)'},
        {transform:'scale(0)',opacity:0,offset:(collapse+280)/1050},
        {transform:'scale(0)',opacity:0,offset:1}
      ],{duration:1050,easing:'cubic-bezier(.22,1,.36,1)',fill:'both'}));
    });
    el.querySelectorAll<SVGGElement>('.about-ring-dust').forEach((dust,i)=>{
      animations.push(dust.animate([{transform:'rotate(0deg)'},{transform:`rotate(${i%2?22:-22}deg)`}],{duration:1050,fill:'both'}));
    });
    const cells=Array.from(el.querySelectorAll<HTMLElement>('.about-headline .char-cell'));
    cells.forEach((cell,i)=>animations.push(cell.animate([
      {transform:'translate3d(0,115%,-80px) rotateX(-55deg) scaleY(1.35)',opacity:0,filter:'blur(10px)'},
      {transform:'translate3d(0,0,0) rotateX(0) scaleY(1)',opacity:1,filter:'blur(0px)'}
    ],{duration:650,delay:900+Math.abs(i-(cells.length-1)/2)*32,easing:ease,fill:'both'})));
    animations.push(el.querySelector('.about-bio')!.animate([{opacity:0,transform:'translate(-50%,15px)'},{opacity:1,transform:'translate(-50%,0)'}],{duration:650,delay:1150,easing:ease,fill:'both'}));
    let raf=0,burst=false;const start=performance.now();
    const tick=(now:number)=>{
      const elapsed=now-start;
      if(elapsed>=900 && elapsed<1200){
        if(!burst){const box=cachedBox(el);onBurst(box.x+box.width/2,box.y+box.height/2,65);burst=true;}
        title.style.filter=`url(#${id})`;
        displacement.current?.setAttribute('scale',String(45*(1-(elapsed-900)/300)));
      }else title.style.filter='none';
      if(elapsed<1200)raf=requestTick(tick);
    };
    raf=requestTick(tick);
    return()=>{clearTimeout(unlock);el.dataset.warpDisabled='false';cancelTick(raf);animations.forEach(a=>a.cancel());title.style.filter='none';displacement.current?.setAttribute('scale','0');};
  },[active,reducedMotion,id,onBurst]);
  return <section ref={root} className="about-view" data-active={active} aria-hidden={!active} inert={!active} aria-label="About Vishwas Kamath">
    <svg className="about-tunnel" viewBox="-800 -450 1600 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      {Array.from({length:9},(_,i)=>{const radius=60+i*77.5;return <g key={i} className="about-ring">
        <circle cx="0" cy="0" r={radius} fill="none" stroke="currentColor" strokeWidth="1" />
        <g className="about-ring-dust">{Array.from({length:12},(_,j)=>{const angle=j/12*Math.PI*2+i*.37;return <circle key={j} cx={Math.cos(angle)*radius} cy={Math.sin(angle)*radius} r={.55+(j%3)*.3} fill="currentColor" stroke="none"/>;})}</g>
      </g>;})}
    </svg>
    <svg className="warp-definitions" aria-hidden="true"><defs><filter id={id} x="-20%" y="-50%" width="140%" height="200%" colorInterpolationFilters="sRGB">
      <feTurbulence type="fractalNoise" baseFrequency="0.001 0.18" numOctaves="1" result="noise"/>
      <feColorMatrix in="noise" type="matrix" values="1 0 0 0 0  0 0 0 0 0.5  0 0 1 0 0  0 0 0 1 0" result="horizontalNoise"/>
      <feDisplacementMap ref={displacement} in="SourceGraphic" in2="horizontalNoise" scale="0" xChannelSelector="R" yChannelSelector="G"/>
    </filter></defs></svg>
    <h1 className="about-headline"><span className="about-unfold"><WarpedText radius={130} smoothing={0.1}>HI, I'M VISHWAS.</WarpedText></span></h1>
    <p className="about-bio">I create motion graphics, edit films, and design digital experiences.<br/>Turning ideas into stories you can see, feel, and interact with.</p>
  </section>;
}
