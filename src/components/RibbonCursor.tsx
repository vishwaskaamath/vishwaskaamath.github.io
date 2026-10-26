"use client";
import { useEffect, useRef } from 'react';
import { drawLightTrail, recordPoint, type TrailPoint } from '@/lib/lightTrail';
export default function RibbonCursor({reducedMotion,layerKey}:{reducedMotion:boolean;layerKey:string|null}) {
  const canvasRef=useRef<HTMLCanvasElement>(null);
  const state=useRef({x:0,y:0,active:false,points:[] as TrailPoint[],reducedMotion});
  state.current.reducedMotion=reducedMotion;
  useEffect(()=>{
    const canvas=canvasRef.current!,ctx=canvas.getContext('2d',{alpha:true,desynchronized:true});if(!ctx)return;
    const s=state.current,fine=matchMedia('(any-pointer: fine)');let raf=0;
    const draw=()=>{
      raf=0;ctx.clearRect(0,0,innerWidth,innerHeight);if(!s.active||document.hidden)return;
      const path=s.reducedMotion?[]:s.points.slice();
      const last=path[path.length-1];
      if(!last||last.x!==s.x||last.y!==s.y)path.push({x:s.x,y:s.y,age:0});
      else path[path.length-1]={...last,age:0};
      drawLightTrail(ctx,path,{x:s.x,y:s.y});
      for(const p of s.points)p.age+=0.045;
      while(s.points.length&&s.points[0].age>=1)s.points.shift();
      if(s.points.length&&!s.reducedMotion)raf=requestAnimationFrame(draw);
    };
    const wake=()=>{if(!raf)raf=requestAnimationFrame(draw);};
    const hide=()=>{s.active=false;s.points.length=0;cancelAnimationFrame(raf);raf=0;ctx.clearRect(0,0,innerWidth,innerHeight);document.documentElement.classList.remove('ribbon-cursor-enabled');};
    const move=(e:PointerEvent)=>{
      if(e.pointerType==='touch'||!fine.matches){hide();return;}
      for(const p of e.getCoalescedEvents?.().length?e.getCoalescedEvents():[e])recordPoint(s.points,p.clientX,p.clientY);
      s.x=e.clientX;s.y=e.clientY;s.active=true;document.documentElement.classList.add('ribbon-cursor-enabled');wake();
    };
    const resize=()=>{const dpr=Math.min(devicePixelRatio||1,1.5);canvas.width=Math.round(innerWidth*dpr);canvas.height=Math.round(innerHeight*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);if(s.active)wake();};
    const visibility=()=>{if(document.hidden)hide();};
    const preference=()=>{if(!fine.matches)hide();};
    resize();window.addEventListener('pointermove',move,{passive:true});window.addEventListener('resize',resize);window.addEventListener('blur',hide);document.addEventListener('mouseleave',hide);document.addEventListener('visibilitychange',visibility);fine.addEventListener('change',preference);
    return()=>{hide();window.removeEventListener('pointermove',move);window.removeEventListener('resize',resize);window.removeEventListener('blur',hide);document.removeEventListener('mouseleave',hide);document.removeEventListener('visibilitychange',visibility);fine.removeEventListener('change',preference);};
  },[]);
  useEffect(()=>{const c=canvasRef.current;if(!c||!c.showPopover)return;const f=requestAnimationFrame(()=>{if(c.matches(':popover-open'))c.hidePopover();c.showPopover();});return()=>cancelAnimationFrame(f);},[layerKey]);
  return <canvas ref={canvasRef} className="ribbon-cursor" popover="manual" aria-hidden="true"/>;
}
