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
  let sections:{top:number;height:number;cream:boolean;workflow:boolean}[]=[],lastStoryY=0,storyVelocity=0,lastView=engine.view;
  const tools=Array.from(document.querySelectorAll<HTMLElement>('.hardware-tool'));
  const measure=()=>{sections=Array.from(document.querySelectorAll<HTMLElement>('.story-stage .story-chapter')).map(el=>({top:el.getBoundingClientRect().top-(document.querySelector('.story-stage')?.getBoundingClientRect().top??0),height:el.offsetHeight,cream:el.matches('.story-capabilities,.story-contact'),workflow:el.matches('.story-workflow')}));};
  const observer=new ResizeObserver(measure);const story=document.querySelector('.story-stage');if(story)observer.observe(story);measure();
  const draw=()=>{
   const frame=engine.read(),about=engine.view==='about',scroll=about?frame.virtualScrollY:0;
   const chapter=sections.find(s=>scroll+innerHeight*.5>=s.top&&scroll+innerHeight*.5<s.top+s.height);
   const activeTool=tools.find(el=>el.dataset.active==='true');
   const brand=activeTool?activeTool.style.getPropertyValue('--tool-brand').trim():'';
   const palette=about?(chapter?.workflow?[brand||'#a855f7','#38bdf8','#f97316']:['#FF4D1C','#702633','#18564e']):projects[frame.index]?.accentPalette;
   const dynamics={mouseX:x,mouseY:y,energy,palette,dt:frameDt,velocity:about?storyVelocity:frame.scrollVelocity,label:`${String(frame.index+1).padStart(2,'0')} // ${projects[frame.index].shortTitle.toUpperCase()}`,story:about,storyProgress:about?frame.progress:0,ribbonAlpha:about?.45:1};
   renderer.draw(phaseRef.current,pulses,themeRef.current==='light',dynamics);

  };
  const resize=()=>{renderer.resize(innerWidth,innerHeight);measure();dirty=true;draw();};
  const invalidate=()=>{dirty=true;};
  const unsubscribe=subscribeTicker((_now,dt)=>{
   if(document.hidden)return;frameDt=dt;
   const sy=engine.view==='about'?engine.read().virtualScrollY:0;if(lastView!==engine.view){lastStoryY=sy;storyVelocity=0;lastView=engine.view;}storyVelocity=damp(storyVelocity,(sy-lastStoryY)/Math.max(dt,.001)/400,6,dt);lastStoryY=sy;
   const index=engine.read().index,project=projects[index];
   if(index!==lastIndex){lastIndex=index;dirty=true;const label=`${String(index+1).padStart(2,'0')} // ${project.role.includes('MOTION')?'MOTION':project.role.includes('WEB')?'INTERACTION':'EDITING'}`;if(upper.current)upper.current.textContent=label;if(lower.current)lower.current.textContent=label;}
   const still=options.current.reducedMotion||motion.matches;
   const nextX=still?mouseX:damp(x,mouseX,5,dt),nextY=still?mouseY:damp(y,mouseY,5,dt);
   const nextEnergy=still?0:damp(energy,Math.min(3,Math.abs(engine.view==='about'?storyVelocity:engine.read().scrollVelocity)),5,dt);
   const moving=Math.abs(nextX-x)+Math.abs(nextY-y)+Math.abs(nextEnergy-energy)>.02;
   x=nextX;y=nextY;energy=nextEnergy;
   if(!still&&!options.current.paused)drift+=dt*(.08+energy*.4);
   const shift=Math.sin(drift)*innerWidth*.045+(x/innerWidth-.5)*24;
   if(upper.current)upper.current.style.transform=`translate3d(${shift}px,0,0)`;if(lower.current)lower.current.style.transform=`translate3d(${-shift}px,0,0)`;
   const animate=!still&&!options.current.paused;
   if(animate)phaseRef.current+=dt*.36;
   const pulsing=pulses.length>0;advancePulses(pulses,dt*1000);
   if(dirty||animate||moving||pulsing){draw();dirty=false;}
  });
  const down=(event:PointerEvent)=>{if(!event.isPrimary||event.button!==0)return;pointerId=event.pointerId;lastY=event.clientY;distance=0;};
  const move=(event:PointerEvent)=>{mouseX=event.clientX;mouseY=event.clientY;if(event.pointerId===pointerId){distance+=Math.abs(event.clientY-lastY);lastY=event.clientY;}};
  const up=(event:PointerEvent)=>{if(event.pointerId!==pointerId)return;distance+=Math.abs(event.clientY-lastY);if(distance<=6&&dragRef.current.distance<=6){window.dispatchEvent(new CustomEvent('portfolio-clean-click',{detail:{x:event.clientX,y:event.clientY}}));if(!options.current.reducedMotion&&!motion.matches)spawnPulse(pulses,event.clientX,event.clientY);dirty=true;}pointerId=-1;};
  const cancel=()=>{pointerId=-1;};
  window.addEventListener('pointerdown',down,true);window.addEventListener('pointermove',move,true);window.addEventListener('pointerup',up,true);window.addEventListener('pointercancel',cancel,true);
  window.addEventListener('resize',resize);window.addEventListener(THEME_EVENT,invalidate);window.addEventListener('portfolio-warmup',invalidate);document.addEventListener('visibilitychange',invalidate);motion.addEventListener('change',invalidate);resize();
  return()=>{unsubscribe();observer.disconnect();renderer.dispose();window.removeEventListener('pointerdown',down,true);window.removeEventListener('pointermove',move,true);window.removeEventListener('pointerup',up,true);window.removeEventListener('pointercancel',cancel,true);window.removeEventListener('resize',resize);window.removeEventListener(THEME_EVENT,invalidate);window.removeEventListener('portfolio-warmup',invalidate);document.removeEventListener('visibilitychange',invalidate);motion.removeEventListener('change',invalidate);};
 },[dragRef,engine,themeRef]);
 return <div className="wavy-background" aria-hidden="true" data-renderer="canvas2d"><canvas ref={canvasRef} className="wavy-canvas"/><div className="wavy-grain"/></div>;
}
