"use client";
import { useEffect, useRef } from 'react';
import { drawRibbon, type RibbonPoint } from '@/lib/taperedRibbon';
export default function RibbonCursor({reducedMotion,layerKey}:{reducedMotion:boolean;layerKey:string|null}) {
  const canvasRef=useRef<HTMLCanvasElement>(null);
  const state=useRef({x:0,y:0,active:false,points:[] as RibbonPoint[],reducedMotion});
  state.current.reducedMotion=reducedMotion;
  useEffect(()=>{
    if(!matchMedia('(any-pointer: fine)').matches)return;
    const canvas=canvasRef.current!,ctx=canvas.getContext('2d',{alpha:true,desynchronized:true});if(!ctx)return;
    const s=state.current,fine=matchMedia('(any-pointer: fine)');let raf=0;
    const draw=()=>{
      raf=0;ctx.clearRect(0,0,innerWidth,innerHeight);if(!s.active||document.hidden)return;
      if(s.reducedMotion){
        s.points.forEach(p=>{p.x=s.x;p.y=s.y;});
        ctx.filter='none';ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(s.x,s.y,3.2,0,Math.PI*2);ctx.fill();return;
      }
      s.points[0].x+=(s.x-s.points[0].x)*.55;
      s.points[0].y+=(s.y-s.points[0].y)*.55;
      for(let i=1;i<45;i++){
        s.points[i].x+=(s.points[i-1].x-s.points[i].x)*.52;
        s.points[i].y+=(s.points[i-1].y-s.points[i].y)*.52;
      }
      const moving=s.points.some(p=>Math.hypot(p.x-s.x,p.y-s.y)>.03);
      if(!moving)s.points.forEach(p=>{p.x=s.x;p.y=s.y;});
      drawRibbon(ctx,s.points);
      if(moving)raf=requestAnimationFrame(draw);
    };
    const wake=()=>{if(!raf)raf=requestAnimationFrame(draw);};
    const hide=()=>{s.active=false;s.points.length=0;cancelAnimationFrame(raf);raf=0;ctx.clearRect(0,0,innerWidth,innerHeight);document.documentElement.classList.remove('ribbon-cursor-enabled');};
    const move=(e:PointerEvent)=>{
      if(e.pointerType==='touch'||!fine.matches){hide();return;}
      if(!s.active)s.points=Array.from({length:45},()=>({x:e.clientX,y:e.clientY}));
      s.x=e.clientX;s.y=e.clientY;s.active=true;document.documentElement.classList.add('ribbon-cursor-enabled');wake();
    };
    const resize=()=>{const dpr=Math.min(devicePixelRatio||1,2);canvas.width=Math.round(innerWidth*dpr);canvas.height=Math.round(innerHeight*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);if(s.active)wake();};
    const visibility=()=>{if(document.hidden)hide();};
    const preference=()=>{if(!fine.matches)hide();};
    resize();window.addEventListener('pointermove',move,{passive:true});window.addEventListener('resize',resize);window.addEventListener('blur',hide);document.addEventListener('mouseleave',hide);document.addEventListener('visibilitychange',visibility);fine.addEventListener('change',preference);
    return()=>{hide();window.removeEventListener('pointermove',move);window.removeEventListener('resize',resize);window.removeEventListener('blur',hide);document.removeEventListener('mouseleave',hide);document.removeEventListener('visibilitychange',visibility);fine.removeEventListener('change',preference);};
  },[]);
  useEffect(()=>{const c=canvasRef.current;if(!c||!c.showPopover||!matchMedia('(any-pointer: fine)').matches)return;const f=requestAnimationFrame(()=>{if(c.matches(':popover-open'))c.hidePopover();c.showPopover();});return()=>cancelAnimationFrame(f);},[layerKey]);
  return <canvas ref={canvasRef} className="ribbon-cursor" popover="manual" aria-hidden="true"/>;
}
