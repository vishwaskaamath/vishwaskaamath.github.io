"use client";
import { useEffect,useRef } from 'react';
import { subscribeTicker } from '@/lib/masterTicker';
export function useMasterTicker(update:(now:number,dt:number)=>void,enabled=true){
  const ref=useRef(update);ref.current=update;
  useEffect(()=>enabled?subscribeTicker((now,dt)=>ref.current(now,dt)):undefined,[enabled]);
}
