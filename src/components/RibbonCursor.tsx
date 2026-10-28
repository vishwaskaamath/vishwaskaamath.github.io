"use client";
import { useEffect, useRef, type RefObject } from 'react';
import type { WheelDrag } from '@/hooks/useProjectWheel';
import { recordPoint, expireHistory, sampleCatmullRom, drawCapsules, type RibbonPoint } from '@/lib/taperedRibbon';
export default function RibbonCursor({reducedMotion,layerKey,dragRef}:{reducedMotion:boolean;layerKey:string|null;dragRef:RefObject<WheelDrag>}) {
  const canvasRef=useRef<HTMLCanvasElement>(null);
  const state=useRef({x:0,y:0,headX:0,headY:0,active:false,reducedMotion});
  const historyRef=useRef<RibbonPoint[]>([]);
  state.current.reducedMotion=reducedMotion;
  useEffect(()=>{
    if(!matchMedia('(any-pointer: fine)').matches)return;
    const canvas=canvasRef.current!,ctx=canvas.getContext('2d',{alpha:true,desynchronized:true});if(!ctx)return;
    const halo=document.createElement("canvas"),haloCtx=halo.getContext("2d")!;
    const s=state.current,fine=matchMedia('(any-pointer: fine)');let raf=0,last=0,flashAt=-1000;
    const dust:{x:number;y:number;vx:number;vy:number;size:number;alpha:number;age:number}[]=[];
    const draw=(now:number)=>{
      const dt=Math.min(32,last?now-last:16.67);last=now;const step=dt/(1000/60);
      raf=0;ctx.clearRect(0,0,innerWidth,innerHeight);if(!s.active||document.hidden)return;
      if(s.reducedMotion){
        historyRef.current.length=0;
        ctx.filter='none';ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(s.x,s.y,dragRef.current.isDragging?4.5:3.2,0,Math.PI*2);ctx.fill();return;
      }
      s.headX+=(s.x-s.headX)*.65;s.headY+=(s.y-s.headY)*.65;
      const moving=Math.hypot(s.headX-s.x,s.headY-s.y)>.03;
      if(!moving){s.headX=s.x;s.headY=s.y;}
      expireHistory(historyRef.current,now);
      // Only the live head moves. Previously recorded points are immutable.
      if(moving||historyRef.current.length)recordPoint(historyRef.current,s.headX,s.headY,now);
      const dense=sampleCatmullRom([{x:s.headX,y:s.headY,time:now},...historyRef.current]);
      const flash=Math.max(0,1-(now-flashAt)/120);
      const baseRadius=dragRef.current.isDragging?4.5:3.2;
      haloCtx.clearRect(0,0,innerWidth,innerHeight);
      drawCapsules(haloCtx,dense,now,true);
      // Blur the assembled halo once, rather than rasterizing every capsule with blur.
      ctx.globalCompositeOperation='lighten';ctx.filter='blur(5px)';
      ctx.drawImage(halo,0,0,halo.width,halo.height,0,0,innerWidth,innerHeight);
      ctx.filter='none';drawCapsules(ctx,dense,now);
      const radius=baseRadius+(7-baseRadius)*flash;
      ctx.filter='blur(5px)';ctx.fillStyle=`rgba(255,255,255,${flash>0?.65:.45})`;
      ctx.beginPath();ctx.arc(s.headX,s.headY,radius*1.6,0,Math.PI*2);ctx.fill();
      ctx.filter='none';ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(s.headX,s.headY,radius,0,Math.PI*2);ctx.fill();
      ctx.globalCompositeOperation='lighter';
      for(let i=dust.length-1;i>=0;i--){const p=dust[i];p.age+=dt;
        if(p.age>=600){dust.splice(i,1);continue;}
        const drag=Math.pow(.91,step);
        p.x+=p.vx*(1-drag)/(1-.91);p.y+=p.vy*(1-drag)/(1-.91);
        p.vx*=drag;p.vy*=drag;p.alpha*=Math.pow(.93,step);
        ctx.fillStyle=`rgba(232,237,245,${p.alpha*Math.min(1,(600-p.age)/100)})`;
        ctx.beginPath();ctx.arc(p.x,p.y,p.size/2,0,Math.PI*2);ctx.fill();
      }
      ctx.globalCompositeOperation='source-over';
      if(moving||historyRef.current.length||dust.length||flash>0)raf=requestAnimationFrame(draw);
    };
    const wake=()=>{if(!raf)raf=requestAnimationFrame(draw);};
    const hide=()=>{s.active=false;historyRef.current.length=0;cancelAnimationFrame(raf);raf=0;ctx.clearRect(0,0,innerWidth,innerHeight);document.documentElement.classList.remove('ribbon-cursor-enabled');};
    const move=(e:PointerEvent)=>{
      if(e.pointerType==='touch'||!fine.matches){hide();return;}
      if(!s.active){s.headX=e.clientX;s.headY=e.clientY;}
      else{s.headX+=(e.clientX-s.headX)*.65;s.headY+=(e.clientY-s.headY)*.65;}
      const now=performance.now();expireHistory(historyRef.current,now);recordPoint(historyRef.current,s.headX,s.headY,now);
      s.x=e.clientX;s.y=e.clientY;s.active=true;document.documentElement.classList.add('ribbon-cursor-enabled');wake();
    };
    const click=(event:Event)=>{
      if(s.reducedMotion||!fine.matches)return;
      const {x,y}=(event as CustomEvent<{x:number;y:number}>).detail;
      if(!s.active){s.headX=x;s.headY=y;}
      s.x=x;s.y=y;s.active=true;s.headX=x;s.headY=y;recordPoint(historyRef.current,x,y,performance.now());flashAt=performance.now();
      for(let i=0;i<32;i++){const theta=Math.random()*Math.PI*2+.35,speed=3+Math.random()*6.5;
        dust.push({x,y,vx:Math.cos(theta)*speed,vy:Math.sin(theta)*speed,size:.8+Math.random(),alpha:1,age:0});}
      if(dust.length>160)dust.splice(0,dust.length-160);wake();
    };
    window.addEventListener('portfolio-clean-click',click);
    const resize=()=>{const dpr=Math.min(devicePixelRatio||1,2);canvas.width=Math.round(innerWidth*dpr);canvas.height=Math.round(innerHeight*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);halo.width=canvas.width;halo.height=canvas.height;haloCtx.setTransform(dpr,0,0,dpr,0,0);if(s.active)wake();};
    const visibility=()=>{if(document.hidden)hide();};
    const preference=()=>{if(!fine.matches)hide();};
    resize();window.addEventListener('pointermove',move,{passive:true,capture:true});window.addEventListener('pointerdown',wake);window.addEventListener('pointerup',wake);window.addEventListener('pointercancel',wake);window.addEventListener('resize',resize);window.addEventListener('blur',hide);document.addEventListener('mouseleave',hide);document.addEventListener('visibilitychange',visibility);fine.addEventListener('change',preference);
    return()=>{window.removeEventListener("portfolio-clean-click",click);hide();window.removeEventListener('pointermove',move,true);window.removeEventListener('pointerdown',wake);window.removeEventListener('pointerup',wake);window.removeEventListener('pointercancel',wake);window.removeEventListener('resize',resize);window.removeEventListener('blur',hide);document.removeEventListener('mouseleave',hide);document.removeEventListener('visibilitychange',visibility);fine.removeEventListener('change',preference);};
  },[dragRef]);
  useEffect(()=>{const c=canvasRef.current;if(!c||!c.showPopover||!matchMedia('(any-pointer: fine)').matches)return;const f=requestAnimationFrame(()=>{if(c.matches(':popover-open'))c.hidePopover();c.showPopover();});return()=>cancelAnimationFrame(f);},[layerKey]);
  return <canvas ref={canvasRef} className="ribbon-cursor" popover="manual" aria-hidden="true"/>;
}
