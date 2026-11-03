"use client";
import {useLayoutEffect,useRef} from 'react';
import {subscribeTicker,damp} from '@/lib/masterTicker';
import type {ScrollPhysics} from '@/lib/scrollPhysics';

export function LiquidDivider({engine,dark=false}:{engine:ScrollPhysics;dark?:boolean}){
 const ref=useRef<SVGSVGElement>(null);
 useLayoutEffect(()=>{const paths=ref.current!.querySelectorAll('path');let last=engine.read().virtualScrollY,v=0;const reduced=matchMedia('(prefers-reduced-motion: reduce)');return subscribeTicker((now,dt)=>{if(engine.view!=='about'||document.hidden)return;const y=engine.read().virtualScrollY;v=damp(v,Math.max(-25,Math.min(25,(y-last)/Math.max(dt,.001)*.015)),8,dt);last=y;const t=reduced.matches?0:now*.00055;paths.forEach((p,i)=>{const a=65+Math.sin(t+i*.4)*24+v,b=65+Math.cos(t*.8+i)*27-v;p.setAttribute('d',`M0 ${70+i*8} C250 ${a-65},350 ${b+65},600 ${70+i*8} S950 ${a},1200 ${70+i*8} L1200 132 L0 132Z`);});});},[engine]);
 return <svg ref={ref} className="liquid-divider" viewBox="0 0 1200 130" preserveAspectRatio="none" aria-hidden="true"><path fill="#FF4D1C"/><path fill={dark?'#09090b':'#F3EFE6'}/></svg>;
}
