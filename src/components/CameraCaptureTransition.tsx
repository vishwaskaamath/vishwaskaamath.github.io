"use client";
import {useLayoutEffect,useRef,type RefObject} from 'react';
import {flushSync} from 'react-dom';
import {subscribeTicker} from '@/lib/masterTicker';
import {captureFrame,CAPTURE_SWAP_MS,CAPTURE_END_MS} from '@/lib/cameraCapture';
import PixelCamera from './PixelCamera';
export default function CameraCaptureTransition({startedAt,sceneRef,onCapture,onRetire,onComplete}:{startedAt:number;sceneRef:RefObject<HTMLDivElement|null>;onCapture:()=>void;onRetire:()=>void;onComplete:()=>void}){
 const rig=useRef<HTMLDivElement>(null),flash=useRef<HTMLDivElement>(null),halo=useRef<HTMLDivElement>(null);
 const callbacks=useRef({onCapture,onRetire,onComplete});callbacks.current={onCapture,onRetire,onComplete};
 useLayoutEffect(()=>{
  const outgoing=sceneRef.current!,photo=outgoing.querySelector<HTMLElement>('.capture-photo')!;
  let captured=false,retiredAt=-1,finished=false,lastStep=-1;
  const block=(e:Event)=>{if(e instanceof KeyboardEvent&&e.altKey)return;if(e.cancelable)e.preventDefault();e.stopImmediatePropagation();};
  const events=['click','pointerdown','pointerup','wheel','keydown','touchmove'];events.forEach(name=>window.addEventListener(name,block,{capture:true,passive:false}));
  const stop=subscribeTicker(now=>{
   const elapsed=now-startedAt,s=captureFrame(elapsed);
   flash.current!.style.opacity=String(s.flash);halo.current!.style.opacity=s.halo?'1':'0';
   rig.current!.dataset.pressed=String(s.pressed);
   if(!captured&&elapsed>=CAPTURE_SWAP_MS){captured=true;flushSync(()=>callbacks.current.onCapture());outgoing.querySelectorAll("video").forEach(video=>video.pause());}
   if(s.q!==lastStep){lastStep=s.q;rig.current!.style.transform=`translate(-50%,${s.cameraY}vh)`;
    if(captured&&retiredAt<0)photo.style.transform=`perspective(1400px) translate3d(${s.x}px,${s.y}vh,${s.z}px) rotateX(${s.pitch}deg) rotateZ(${s.roll}deg) scale(${s.scale})`;
   }
   if(captured&&retiredAt<0){outgoing.style.opacity=s.photoVisible?'1':'0';outgoing.style.visibility=s.photoVisible?'visible':'hidden';}
   if(retiredAt<0&&captured&&s.y>105){retiredAt=now;outgoing.style.opacity='0';outgoing.style.visibility='hidden';outgoing.style.pointerEvents='none';flushSync(()=>callbacks.current.onRetire());}
   if(!finished&&elapsed>=CAPTURE_END_MS&&retiredAt>=0&&now>retiredAt){finished=true;callbacks.current.onComplete();}
  });
  // Outgoing DOM was unmounted before this cleanup; never restore it to full-screen.
  return()=>{stop();events.forEach(name=>window.removeEventListener(name,block,true));};
 },[startedAt,sceneRef]);
 return <><div ref={flash} className="capture-flash" aria-hidden="true"/><div ref={halo} className="capture-starburst" aria-hidden="true"/><div ref={rig} className="capture-camera-rig" aria-hidden="true"><PixelCamera/></div></>;
}
