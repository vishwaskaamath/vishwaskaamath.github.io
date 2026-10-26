"use client";
import { useLayoutEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

export type FullscreenSource = {
  rect: { top:number; left:number; width:number; height:number };
  preview: HTMLVideoElement;
  card: HTMLElement;
  trigger: HTMLButtonElement;
  time: number;
  title: string;
};

export default function FullscreenVideo({source,onClose,reducedMotion}: {
  source:FullscreenSource; onClose:()=>void; reducedMotion:boolean;
}) {
  const root=useRef<HTMLDivElement>(null),frame=useRef<HTMLDivElement>(null);
  const video=useRef<HTMLVideoElement>(null),closeButton=useRef<HTMLButtonElement>(null);
  const displacement=useRef<SVGFEDisplacementMapElement>(null),noise=useRef<SVGFETurbulenceElement>(null);
  const closeAction=useRef<()=>void>(()=>{});
  useLayoutEffect(()=>{
    const overlay=root.current!,box=frame.current!,player=video.current!;
    const main=document.querySelector('main')!;
    const wasInert=main.inert;main.inert=true;
    source.card.classList.add('video-is-fullscreen');source.preview.pause();
    let raf=0,animation:Animation|undefined,closing=false,disposed=false;
    const duration=reducedMotion?0:800;
    const sync=()=>{try{player.currentTime=Number.isFinite(player.duration) && source.time>=player.duration-.05 ? 0 : source.time;}catch{/* Metadata is retried when ready. */}};
    sync();player.addEventListener('loadedmetadata',sync,{once:true});
    player.muted=false;player.volume=1;
    void player.play().catch(()=>{overlay.dataset.playback='paused';});
    closeButton.current!.focus({preventScroll:true});
    const bounds=(r:{top:number;left:number;width:number;height:number},radius:string)=>({top:`${r.top}px`,left:`${r.left}px`,width:`${r.width}px`,height:`${r.height}px`,borderRadius:radius});
    const morph=(from:ReturnType<typeof bounds>,to:ReturnType<typeof bounds>,peak:number,done:()=>void)=>{
      cancelAnimationFrame(raf);animation?.cancel();
      Object.assign(box.style,to);
      animation=box.animate([from,to],{duration,easing:'cubic-bezier(0.16, 1, 0.3, 1)',fill:'none'});
      box.style.filter=duration?'url(#liquid-fullscreen-morph)':'none';
      const start=performance.now();
      const tick=(now:number)=>{
        if(disposed)return;
        const t=duration?Math.min(1,(now-start)/duration):1;
        displacement.current!.setAttribute('scale',String(Math.sin(t*Math.PI)*peak));
        noise.current!.setAttribute('baseFrequency',`${.02-.015*t} ${.04-.03*t}`);
        if(t<1)raf=requestAnimationFrame(tick);
        else {box.style.filter='none';displacement.current!.setAttribute('scale','0');done();}
      };
      raf=requestAnimationFrame(tick);
    };
    const full=()=>bounds({top:0,left:0,width:innerWidth,height:innerHeight},'0px');
    overlay.dataset.phase='opening';
    morph(bounds(source.rect,'32px'),full(),120,()=>{overlay.dataset.phase='open';});
    const finish=()=>{
      source.preview.muted=true;
      try{source.preview.currentTime=Number.isFinite(player.duration) ? player.currentTime % player.duration : player.currentTime;}catch{/* Preview may still be loading. */}
      player.pause();player.muted=true;
      source.card.classList.remove('video-is-fullscreen');
      onClose();
    };
    closeAction.current=()=>{
      if(closing)return;closing=true;
      overlay.dataset.phase='closing';
      const current=box.getBoundingClientRect();
      // Re-measure on collapse so viewport resizing cannot leave a stale slot.
      const destination=source.card.getBoundingClientRect();
      morph(bounds(current,getComputedStyle(box).borderRadius),bounds(destination,'32px'),95,finish);
    };
    const key=(event:KeyboardEvent)=>{
      if(event.key==='Escape'){event.preventDefault();event.stopImmediatePropagation();closeAction.current();}
      if(event.key==='Tab'){
        // Keep keyboard focus inside the root modal, including native controls.
        if(event.shiftKey && document.activeElement===closeButton.current){event.preventDefault();player.focus();}
        else if(!event.shiftKey && document.activeElement===player){event.preventDefault();closeButton.current!.focus();}
      }
    };
    const resize=()=>{if(overlay.dataset.phase==='open')Object.assign(box.style,full());};
    const preventScroll=(event:WheelEvent)=>event.preventDefault();
    window.addEventListener('keydown',key,true);window.addEventListener('resize',resize);
    overlay.addEventListener('wheel',preventScroll,{passive:false});
    return()=>{
      disposed=true;cancelAnimationFrame(raf);animation?.cancel();player.pause();
      player.removeEventListener('loadedmetadata',sync);
      main.inert=wasInert;source.card.classList.remove('video-is-fullscreen');
      if(!reducedMotion && !document.hidden) void source.preview.play().catch(()=>{});
      window.removeEventListener('keydown',key,true);window.removeEventListener('resize',resize);
      overlay.removeEventListener('wheel',preventScroll);
      source.trigger.focus({preventScroll:true});
    };
  },[source,onClose,reducedMotion]);
  return createPortal(<div ref={root} className="fullscreen-video-root" role="dialog" aria-modal="true" aria-label={`${source.title} fullscreen player`}>
    <svg className="warp-definitions" aria-hidden="true"><defs>
      <filter id="liquid-fullscreen-morph" x="-20%" y="-20%" width="140%" height="140%" colorInterpolationFilters="sRGB">
        <feTurbulence ref={noise} type="fractalNoise" baseFrequency="0.012 0.025" numOctaves="2" result="warp"/>
        <feDisplacementMap ref={displacement} in="SourceGraphic" in2="warp" scale="0" xChannelSelector="R" yChannelSelector="G"/>
      </filter>
    </defs></svg>
    <div className="fullscreen-video-frame" ref={frame} style={{...source.rect,borderRadius:32}}>
      <video ref={video} src={source.preview.currentSrc || source.preview.src} poster={source.preview.poster} playsInline controls autoPlay loop tabIndex={0}/>
    </div>
    <button ref={closeButton} className="fullscreen-video-close" onClick={()=>closeAction.current()}>CLOSE [ESC]</button>
  </div>,document.body);
}
