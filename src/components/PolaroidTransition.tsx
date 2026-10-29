"use client";
import { useLayoutEffect,useRef,type RefObject } from 'react';
import { flushSync } from 'react-dom';
import { subscribeTicker } from '@/lib/masterTicker';
import { photoFrame,PHOTO_SWAP_MS,PHOTO_HIDE_MS,PHOTO_END_MS } from '@/lib/polaroidTransition';
export default function PolaroidTransition({startedAt,sceneRef,incomingRef,onSwap,onHide,onComplete}:{startedAt:number;sceneRef:RefObject<HTMLDivElement|null>;incomingRef:RefObject<HTMLDivElement|null>;onSwap:()=>void;onHide:()=>void;onComplete:()=>void}){
 const flash=useRef<HTMLDivElement>(null),wire=useRef<HTMLDivElement>(null);
 const callbacks=useRef({onSwap,onHide,onComplete});callbacks.current={onSwap,onHide,onComplete};
 useLayoutEffect(()=>{
  const scene=sceneRef.current!,flight=scene.querySelector<HTMLElement>('.photo-flight')!,frame=scene.querySelector<HTMLElement>('.polaroid-frame')!;
  let swapped=false,finished=false,hiddenAt=-1;
  const incoming=incomingRef.current!;
  const block=(event:Event)=>{if(event.cancelable)event.preventDefault();event.stopImmediatePropagation();};
  const events=['click','pointerdown','pointerup','wheel','keydown','touchmove'];events.forEach(name=>window.addEventListener(name,block,{capture:true,passive:false}));
  const stop=subscribeTicker(now=>{
   const elapsed=now-startedAt,s=photoFrame(elapsed);
   const capturing=!swapped&&elapsed>=PHOTO_SWAP_MS;
   if(capturing){swapped=true;flushSync(()=>callbacks.current.onSwap());}
   // Guarantee one fully white rendered frame exactly when the DOM swaps.
   flash.current!.style.opacity=String(capturing?1:s.flash);
   wire.current!.style.opacity=String(s.wire);
   if(swapped){flight.style.transform=`translateX(${s.x}vw)`;frame.style.transform=`perspective(1400px) translateZ(${s.z}px) rotateZ(${s.swing}deg) rotateY(${s.yaw}deg) rotateX(${s.pitch}deg)`;incoming.style.filter=s.blur>.01?`blur(${s.blur}px) brightness(${s.brightness})`:'none';}
   if(hiddenAt<0&&elapsed>=PHOTO_HIDE_MS){hiddenAt=now;scene.style.opacity='0';scene.style.visibility='hidden';flushSync(()=>callbacks.current.onHide());}
   if(!finished&&hiddenAt>=0&&now>hiddenAt&&elapsed>=PHOTO_END_MS){finished=true;callbacks.current.onComplete();}
  });
  return()=>{stop();flight.style.transform='';frame.style.transform='';scene.style.opacity='';scene.style.visibility='';incoming.style.filter='';events.forEach(name=>window.removeEventListener(name,block,true));};
 },[startedAt,sceneRef,incomingRef]);
 return <><div ref={wire} className="photo-wire" aria-hidden="true"/><div ref={flash} className="camera-flash" aria-hidden="true"/></>;
}
