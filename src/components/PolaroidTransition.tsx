"use client";
import { useLayoutEffect,useRef,type RefObject } from 'react';
import { flushSync } from 'react-dom';
import { subscribeTicker } from '@/lib/masterTicker';
import { photoFrame,PHOTO_SWAP_MS,PHOTO_END_MS } from '@/lib/polaroidTransition';
export default function PolaroidTransition({startedAt,sceneRef,onSwap,onComplete}:{startedAt:number;sceneRef:RefObject<HTMLDivElement|null>;onSwap:()=>void;onComplete:()=>void}){
 const flash=useRef<HTMLDivElement>(null),wire=useRef<SVGSVGElement>(null);
 const callbacks=useRef({onSwap,onComplete});callbacks.current={onSwap,onComplete};
 useLayoutEffect(()=>{
  const scene=sceneRef.current!,flight=scene.querySelector<HTMLElement>('.photo-flight')!,frame=scene.querySelector<HTMLElement>('.polaroid-frame')!;
  let swapped=false,finished=false;
  const block=(event:Event)=>{if(event.cancelable)event.preventDefault();event.stopImmediatePropagation();};
  const events=['click','pointerdown','pointerup','wheel','keydown','touchmove'];events.forEach(name=>window.addEventListener(name,block,{capture:true,passive:false}));
  const stop=subscribeTicker(now=>{
   const elapsed=now-startedAt,s=photoFrame(elapsed);
   const capturing=!swapped&&elapsed>=PHOTO_SWAP_MS;
   if(capturing){swapped=true;flushSync(()=>callbacks.current.onSwap());}
   // Guarantee one fully white rendered frame exactly when the DOM swaps.
   flash.current!.style.opacity=String(capturing?1:s.flash);
   wire.current!.style.opacity=String(s.wire);
   if(swapped){flight.style.transform=`translate3d(${s.x}vw,${s.y}vh,0)`;frame.style.transform=`perspective(1100px) translateZ(${s.z}px) scale(${s.scale}) rotateZ(${s.swing}deg) rotateY(${s.yaw}deg)`;}
   if(!finished&&elapsed>=PHOTO_END_MS){finished=true;callbacks.current.onComplete();}
  });
  return()=>{stop();flight.style.transform='';frame.style.transform='';events.forEach(name=>window.removeEventListener(name,block,true));};
 },[startedAt,sceneRef]);
 return <><svg ref={wire} className="photo-wire" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><path d="M -10 34 L 115 6"/></svg><div ref={flash} className="camera-flash" aria-hidden="true"/></>;
}
