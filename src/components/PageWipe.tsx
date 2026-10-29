"use client";
import {useLayoutEffect,useRef} from 'react';
import {flushSync} from 'react-dom';
import {subscribeTicker} from '@/lib/masterTicker';
import {wipeTiles,tileCovered,WIPE_SWAP_MS,WIPE_END_MS} from '@/lib/pageWipe';
export default function PageWipe({startedAt,onSwap,onComplete}:{startedAt:number;onSwap:()=>void;onComplete:()=>void}){
 const root=useRef<HTMLDivElement>(null),callbacks=useRef({onSwap,onComplete});callbacks.current={onSwap,onComplete};
 useLayoutEffect(()=>{
  const tiles=Array.from(root.current!.children) as HTMLElement[],shown=tiles.map(()=>false);
  let swapped=false,finished=false;
  const block=(e:Event)=>{if(e instanceof KeyboardEvent&&e.altKey)return;if(e.cancelable)e.preventDefault();e.stopImmediatePropagation();};
  const events=['click','pointerdown','pointerup','wheel','keydown','touchmove'];events.forEach(name=>window.addEventListener(name,block,{capture:true,passive:false}));
  const stop=subscribeTicker(now=>{
   const elapsed=now-startedAt;
   tiles.forEach((tile,i)=>{const visible=tileCovered(elapsed,wipeTiles[i].delay);if(visible!==shown[i]){tile.style.opacity=visible?'1':'0';shown[i]=visible;}});
   if(!swapped&&elapsed>=WIPE_SWAP_MS){swapped=true;flushSync(()=>callbacks.current.onSwap());}
   if(!finished&&elapsed>=WIPE_END_MS){finished=true;callbacks.current.onComplete();}
  });
  return()=>{stop();events.forEach(name=>window.removeEventListener(name,block,true));};
 },[startedAt]);
 return <div ref={root} className="page-block-wipe" aria-hidden="true">{wipeTiles.map((t,i)=><i key={i} data-col={t.col} data-row={t.row}/>)}</div>;
}
