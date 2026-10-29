"use client";
import {useLayoutEffect,useRef} from 'react';
import {flushSync} from 'react-dom';
import {subscribeTicker} from '@/lib/masterTicker';
import {useThemeRef} from '@/lib/theme';
import {wipeTiles,tileFill,clamp,WIPE_SWAP_MS,WIPE_REVEAL_MS,WIPE_END_MS} from '@/lib/pageWipe';
export default function PageWipe({startedAt,destination,onSwap,onComplete}:{startedAt:number;destination:string;onSwap:()=>void;onComplete:()=>void}){
 const canvas=useRef<HTMLCanvasElement>(null), label=useRef<HTMLSpanElement>(null);
 const theme=useThemeRef(),callbacks=useRef({onSwap,onComplete});callbacks.current={onSwap,onComplete};
 useLayoutEffect(()=>{
  const surface=canvas.current!,ctx=surface.getContext('2d',{alpha:true,desynchronized:true});
  let width=0,height=0,swapped=false,finished=false;
  const resize=()=>{width=window.innerWidth;height=window.innerHeight;const dpr=Math.min(window.devicePixelRatio||1,2);surface.width=Math.round(width*dpr);surface.height=Math.round(height*dpr);ctx?.setTransform(dpr,0,0,dpr,0,0);};
  resize();window.addEventListener('resize',resize);
  // Exact CSS cubic-bezier(0.16,1,0.3,1), evaluated without DOM animations.
  const labelEase=(p:number)=>{p=clamp(p);let lo=0,hi=1;for(let i=0;i<12;i++){const t=(lo+hi)/2,u=1-t,x=3*u*u*t*.16+3*u*t*t*.3+t*t*t;if(x<p)lo=t;else hi=t;}return 1-Math.pow(1-(lo+hi)/2,3);};
  const block=(e:Event)=>{if(e instanceof KeyboardEvent&&e.altKey)return;if(e.cancelable)e.preventDefault();e.stopImmediatePropagation();};
  const events=['click','pointerdown','pointerup','wheel','keydown','touchmove'];events.forEach(name=>window.addEventListener(name,block,{capture:true,passive:false}));
  const stop=subscribeTicker(now=>{
   const elapsed=now-startedAt,light=theme.current==='light';
   if(ctx){
    ctx.clearRect(0,0,width,height);ctx.fillStyle=light?'#111113':'#F3EFE6';
    const cw=width/16,ch=height/10;
    for(const tile of wipeTiles){const fill=tileFill(elapsed,tile.threshold);if(fill<=0)continue;const y=tile.row*ch+(elapsed<WIPE_REVEAL_MS?ch*(1-fill):0);ctx.fillRect(tile.col*cw-.5,y-.5,cw+1,ch*fill+1);}
   }
   if(label.current){const leaving=elapsed>=WIPE_REVEAL_MS,p=labelEase(leaving?(elapsed-WIPE_REVEAL_MS)/240:(elapsed-140)/280);label.current.style.transform=`translateY(${leaving?-p*100:(1-p)*100}%)`;label.current.style.opacity=String(leaving?1-p:p);label.current.style.color=light?'#F3EFE6':'#111113';}
   if(!swapped&&elapsed>=WIPE_SWAP_MS){swapped=true;flushSync(()=>callbacks.current.onSwap());}
   if(!finished&&elapsed>=WIPE_END_MS){finished=true;callbacks.current.onComplete();}
  });
  return()=>{stop();window.removeEventListener('resize',resize);events.forEach(name=>window.removeEventListener(name,block,true));};
 },[startedAt,theme]);
 return <><canvas ref={canvas} className="page-block-wipe" aria-hidden="true"/><div className="page-wipe-label" aria-hidden="true"><span ref={label}>{destination}</span></div></>;
}
