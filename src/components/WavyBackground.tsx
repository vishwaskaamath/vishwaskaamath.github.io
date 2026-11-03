"use client";
import {useEffect,useRef,type RefObject} from 'react';
import {subscribeTicker,damp} from '@/lib/masterTicker';
import type {WheelDrag} from '@/hooks/useProjectWheel';
import type {ScrollPhysics} from '@/lib/scrollPhysics';
export default function WavyBackground({engine,reducedMotion}:{engine:ScrollPhysics;reducedMotion:boolean;paused?:boolean;dragRef:RefObject<WheelDrag>}){
 const flecks=useRef<HTMLCanvasElement>(null),ruler=useRef<HTMLCanvasElement>(null);
 useEffect(()=>{
  const c=flecks.current!,r=ruler.current!,ctx=c.getContext('2d')!,rc=r.getContext('2d')!;
  let w=innerWidth,h=innerHeight,mx=w/2,my=h/2,x=0,y=0;
  const points=Array.from({length:85},(_,i)=>({x:((i*673+97)%997)/997,y:((i*389+37)%991)/991,size:1+(i%7)/4}));
  const resize=()=>{w=innerWidth;h=innerHeight;c.width=w;c.height=h;r.width=w;r.height=32;};resize();
  const move=(e:PointerEvent)=>{mx=e.clientX;my=e.clientY;};window.addEventListener('pointermove',move);window.addEventListener('resize',resize);
  const stop=subscribeTicker((_now,dt)=>{
   x=damp(x,(mx/w-.5)*-8,5,dt);y=damp(y,(my/h-.5)*-8,5,dt);ctx.clearRect(0,0,w,h);
   points.forEach((p,i)=>{ctx.fillStyle=i%2?'rgba(243,239,230,.28)':'rgba(25,25,40,.22)';ctx.beginPath();ctx.ellipse(p.x*w+(reducedMotion?0:x),p.y*h+(reducedMotion?0:y),p.size,p.size*.55,i,0,Math.PI*2);ctx.fill();});
   rc.clearRect(0,0,w,32);for(let i=0;i<=100;i++){const px=w*i/100;rc.fillStyle=Math.abs(mx-px)<55?'#F3EFE6':i%5===0?'rgba(243,239,230,.6)':'rgba(243,239,230,.3)';rc.fillRect(px,32-(i%5===0?10:5),1,i%5===0?10:5);}
   rc.font='7px monospace';rc.fillStyle='rgba(243,239,230,.65)';['REEL','CUT','MOTION','VFX','UI/UX','ABOUT','CONTACT'].forEach((label,i)=>rc.fillText(label,w*(.05+i*.15),17));
   rc.fillStyle='#FF4D1C';rc.fillRect(engine.read().progress*(w-3),20,3,12);
  });return()=>{stop();window.removeEventListener('pointermove',move);window.removeEventListener('resize',resize);};
 },[engine,reducedMotion]);
 return <><div className="paper-background" aria-hidden="true"/><div className="paper-texture" aria-hidden="true"><div className="paper-fiber"/><canvas ref={flecks}/></div><canvas ref={ruler} className="paper-ruler" aria-hidden="true"/></>;
}
