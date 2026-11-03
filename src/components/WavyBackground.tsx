"use client";
import {subscribeTicker,damp} from '@/lib/masterTicker';
import {useThemeRef,THEME_EVENT} from '@/lib/theme';
import {useEffect,useRef,type RefObject} from 'react';
import type {WheelDrag} from '@/hooks/useProjectWheel';
import type {ScrollPhysics} from '@/lib/scrollPhysics';
import {spawnPulse,advancePulses,type ContourPulse} from '@/lib/contourPulse';
import {projects} from '@/data/projects';
import {createWaveRenderer} from '@/lib/waveRenderer';

/** Sparse editorial backdrop; all input and motion stay outside React state. */
export default function WavyBackground({reducedMotion,paused=false,dragRef,engine}:{reducedMotion:boolean;paused?:boolean;dragRef:RefObject<WheelDrag>;engine:ScrollPhysics}){
 const themeRef=useThemeRef(),canvasRef=useRef<HTMLCanvasElement>(null),phaseRef=useRef(0),upper=useRef<HTMLDivElement>(null),lower=useRef<HTMLDivElement>(null);
 const options=useRef({reducedMotion,paused});options.current={reducedMotion,paused};
 useEffect(()=>{
  const renderer=createWaveRenderer(canvasRef.current!);if(!renderer)return;
  const pulses:ContourPulse[]=[],motion=matchMedia('(prefers-reduced-motion: reduce)');
  let mouseX=innerWidth*.5,mouseY=innerHeight*.5,x=mouseX,y=mouseY,energy=0,dirty=true;
  let pointerId=-1,lastY=0,distance=0,lastIndex=-1,drift=0,frameDt=1/60;
  const draw=()=>renderer.draw(phaseRef.current,pulses,themeRef.current==='light',{mouseX:x,mouseY:y,energy,palette:projects[engine.read().index]?.accentPalette,dt:frameDt});
  const resize=()=>{renderer.resize(innerWidth,innerHeight);dirty=true;draw();};
  const invalidate=()=>{dirty=true;};
  const unsubscribe=subscribeTicker((_now,dt)=>{
   if(document.hidden)return;frameDt=dt;
   const index=engine.read().index,project=projects[index];
   if(index!==lastIndex){lastIndex=index;dirty=true;const label=`${String(index+1).padStart(2,'0')} // ${project.role.includes('MOTION')?'MOTION':project.role.includes('WEB')?'INTERACTION':'EDITING'}`;if(upper.current)upper.current.textContent=label;if(lower.current)lower.current.textContent=label;}
   const still=options.current.reducedMotion||motion.matches;
   const nextX=still?mouseX:damp(x,mouseX,5,dt),nextY=still?mouseY:damp(y,mouseY,5,dt);
   const nextEnergy=still?0:damp(energy,Math.min(3,Math.abs(engine.read().scrollVelocity)),5,dt);
   const moving=Math.abs(nextX-x)+Math.abs(nextY-y)+Math.abs(nextEnergy-energy)>.02;
   x=nextX;y=nextY;energy=nextEnergy;
   if(!still&&!options.current.paused)drift+=dt*(.08+energy*.4);
   const shift=Math.sin(drift)*innerWidth*.045+(x/innerWidth-.5)*24;
   if(upper.current)upper.current.style.transform=`translate3d(${shift}px,0,0)`;if(lower.current)lower.current.style.transform=`translate3d(${-shift}px,0,0)`;
   const animate=!still&&!options.current.paused&&engine.view==='work';
   if(animate)phaseRef.current+=dt*(.36+energy*.65);
   const pulsing=pulses.length>0;advancePulses(pulses,dt*1000);
   if(dirty||animate||moving||pulsing){draw();dirty=false;}
  });
  const down=(event:PointerEvent)=>{if(!event.isPrimary||event.button!==0)return;pointerId=event.pointerId;lastY=event.clientY;distance=0;};
  const move=(event:PointerEvent)=>{mouseX=event.clientX;mouseY=event.clientY;if(event.pointerId===pointerId){distance+=Math.abs(event.clientY-lastY);lastY=event.clientY;}};
  const up=(event:PointerEvent)=>{if(event.pointerId!==pointerId)return;distance+=Math.abs(event.clientY-lastY);if(distance<=6&&dragRef.current.distance<=6){window.dispatchEvent(new CustomEvent('portfolio-clean-click',{detail:{x:event.clientX,y:event.clientY}}));if(!options.current.reducedMotion&&!motion.matches)spawnPulse(pulses,event.clientX,event.clientY);dirty=true;}pointerId=-1;};
  const cancel=()=>{pointerId=-1;};
  window.addEventListener('pointerdown',down,true);window.addEventListener('pointermove',move,true);window.addEventListener('pointerup',up,true);window.addEventListener('pointercancel',cancel,true);
  window.addEventListener('resize',resize);window.addEventListener(THEME_EVENT,invalidate);window.addEventListener('portfolio-warmup',invalidate);document.addEventListener('visibilitychange',invalidate);motion.addEventListener('change',invalidate);resize();
  return()=>{unsubscribe();renderer.dispose();window.removeEventListener('pointerdown',down,true);window.removeEventListener('pointermove',move,true);window.removeEventListener('pointerup',up,true);window.removeEventListener('pointercancel',cancel,true);window.removeEventListener('resize',resize);window.removeEventListener(THEME_EVENT,invalidate);window.removeEventListener('portfolio-warmup',invalidate);document.removeEventListener('visibilitychange',invalidate);motion.removeEventListener('change',invalidate);};
 },[dragRef,engine,themeRef]);
 return <div className="wavy-background" aria-hidden="true" data-renderer="canvas2d"><canvas ref={canvasRef} className="wavy-canvas"/><div className="atmosphere-watermark upper" ref={upper}>01 // MOTION</div><div className="atmosphere-watermark lower" ref={lower}>01 // MOTION</div><div className="wavy-grain"/></div>;
}
