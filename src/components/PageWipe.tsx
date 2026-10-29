"use client";
import { useLayoutEffect, useRef } from 'react';
import { subscribeTicker } from '@/lib/masterTicker';
import { wipeTiles, tileCovered, WIPE_SWAP_MS, WIPE_END_MS } from '@/lib/pageWipe';

export default function PageWipe({startedAt,onSwap,onComplete}:{startedAt:number;onSwap:()=>void;onComplete:()=>void}) {
  const root=useRef<HTMLDivElement>(null);
  const callbacks=useRef({onSwap,onComplete});callbacks.current={onSwap,onComplete};
  useLayoutEffect(()=>{
    const tiles=Array.from(root.current!.children) as HTMLElement[];
    const shown=tiles.map(()=>false);
    let swapped=false,finished=false;
    // Capture intercepts interaction without swallowing pointermove: the ribbon stays live.
    const block=(event:Event)=>{if(event.cancelable)event.preventDefault();event.stopImmediatePropagation();};
    const events=['click','pointerdown','pointerup','wheel','keydown','touchmove'];
    events.forEach(name=>window.addEventListener(name,block,{capture:true,passive:false}));
    const stop=subscribeTicker(now=>{
      const elapsed=now-startedAt;
      tiles.forEach((tile,i)=>{const visible=tileCovered(elapsed,wipeTiles[i].delay);if(visible!==shown[i]){tile.style.opacity=visible?'1':'0';shown[i]=visible;}});
      if(!swapped&&elapsed>=WIPE_SWAP_MS){swapped=true;callbacks.current.onSwap();}
      if(!finished&&elapsed>=WIPE_END_MS){finished=true;callbacks.current.onComplete();}
    });
    return()=>{stop();events.forEach(name=>window.removeEventListener(name,block,true));};
  },[startedAt]);
  return <div ref={root} className="page-block-wipe" aria-hidden="true">{wipeTiles.map((tile,i)=><i key={i} data-col={tile.col} data-row={tile.row}/>)}</div>;
}
