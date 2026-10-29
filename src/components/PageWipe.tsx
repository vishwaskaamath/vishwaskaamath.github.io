"use client";
import {useLayoutEffect,useRef} from 'react';
import {flushSync} from 'react-dom';
import {subscribeTicker} from '@/lib/masterTicker';
import {useThemeRef} from '@/lib/theme';
import {wipeTiles,tileFill,labelPose,createWipeClock,advanceWipeClock,WIPE_REVEAL_MS,WIPE_END_MS,ABOUT_REVEAL_MS} from '@/lib/pageWipe';
export default function PageWipe({startedAt,destination,onSwap,onReveal,onComplete}:{startedAt:number;destination:string;onSwap:()=>void;onReveal:()=>void;onComplete:()=>void}){
 const canvas=useRef<HTMLCanvasElement>(null),clockRef=useRef(createWipeClock(0));
 const theme=useThemeRef(),callbacks=useRef({onSwap,onReveal,onComplete});callbacks.current={onSwap,onReveal,onComplete};
 useLayoutEffect(()=>{
  const surface=canvas.current!,ctx=surface.getContext('2d',{alpha:true,desynchronized:true});
  let width=0,height=0,fontSize=0,finished=false,revealed=false;
  clockRef.current=createWipeClock(performance.now());
  const resize=()=>{width=window.innerWidth;height=window.innerHeight;fontSize=Math.min(128,Math.max(64,width*.09));const dpr=Math.min(window.devicePixelRatio||1,2);surface.width=Math.round(width*dpr);surface.height=Math.round(height*dpr);ctx?.setTransform(dpr,0,0,dpr,0,0);};
  resize();window.addEventListener('resize',resize);
  const block=(e:Event)=>{if(e instanceof KeyboardEvent&&e.altKey)return;if(e.cancelable)e.preventDefault();e.stopImmediatePropagation();};
  const events=['click','pointerdown','pointerup','wheel','keydown','touchmove'];events.forEach(name=>window.addEventListener(name,block,{capture:true,passive:false}));
  const stop=subscribeTicker(now=>{
   const swap=advanceWipeClock(clockRef.current,now);
   const elapsed=clockRef.current.elapsed,light=theme.current==='light';
   if(ctx){
    ctx.globalCompositeOperation='source-over';ctx.globalAlpha=1;
    ctx.clearRect(0,0,width,height);ctx.fillStyle=light?'#111113':'#F3EFE6';
    const cw=width/16,ch=height/10;
    for(const tile of wipeTiles){const fill=tileFill(elapsed,tile.threshold);if(fill<=0)continue;const y=tile.row*ch+(elapsed<WIPE_REVEAL_MS?ch*(1-fill):0);ctx.fillRect(tile.col*cw-.5,y-.5,cw+1,ch*fill+1);}
    const pose=labelPose(elapsed);
    ctx.globalCompositeOperation='source-atop';ctx.globalAlpha=pose.alpha;
    ctx.fillStyle=light?'#F3EFE6':'#111113';ctx.font=`700 ${fontSize}px "Bebas Neue", sans-serif`;ctx.textAlign='left';ctx.textBaseline='alphabetic';
    ctx.fillText(destination,width*.05,height*.9+pose.offset);
    ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';
   }
   if(swap)flushSync(()=>callbacks.current.onSwap());
   if(!revealed&&elapsed>=ABOUT_REVEAL_MS){revealed=true;callbacks.current.onReveal();}
   if(!finished&&elapsed>=WIPE_END_MS){finished=true;callbacks.current.onComplete();}
  });
  return()=>{stop();events.forEach(name=>window.removeEventListener(name,block,true));window.removeEventListener('resize',resize);};
 },[startedAt,theme,destination]);
 return <canvas ref={canvas} className="page-block-wipe" aria-hidden="true"/>;
}
