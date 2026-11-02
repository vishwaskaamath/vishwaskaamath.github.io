"use client";
import {useEffect,useRef,type RefObject} from 'react';
import {Moon,Sun} from 'lucide-react';
import {subscribeTicker,damp} from '@/lib/masterTicker';
import type {ScrollPhysics} from '@/lib/scrollPhysics';
export default function GlassHeader({engine,playing,onAudio,light,onTheme,audio}:{engine:ScrollPhysics;playing:boolean;onAudio:()=>void;light:boolean;onTheme:()=>void;audio:RefObject<HTMLAudioElement|null>}){
 const progress=useRef<HTMLOutputElement>(null);
 const disc=useRef<HTMLSpanElement>(null),fill=useRef<HTMLSpanElement>(null),bars=useRef<HTMLSpanElement>(null);
 const live=useRef(playing); live.current=playing;
 useEffect(()=>engine.subscribe(f=>{if(progress.current)progress.current.value=`${String(Math.round(f.progress*100)).padStart(2,'0')}%`;}),[engine]);
 useEffect(()=>{
  let angle=0,speed=0,energy=0;
  return subscribeTicker((now,dt)=>{
   speed=damp(speed,live.current?360/3.5:0,live.current?7:3.5,dt);
   energy=damp(energy,live.current?1:0,10,dt); angle=(angle+speed*dt)%360;
   if(disc.current)disc.current.style.transform=`rotate(${angle}deg)`;
   const track=audio.current;
   if(fill.current)fill.current.style.transform=`scaleX(${track&&Number.isFinite(track.duration)&&track.duration>0?track.currentTime/track.duration:0})`;
   bars.current?.querySelectorAll('i').forEach((bar,i)=>{bar.style.height=`${3+energy*11*(.5+.5*Math.sin(now*.001*(2*Math.PI/(.45+i*.075))+i*1.4))}px`;});
  });
 },[audio]);
 return <header className="minimal-hud"><div className="minimal-controls">
  <button className={`music-pill ${playing?'is-playing':''}`} onClick={onAudio} aria-label={playing?'Pause ambient track':'Play ambient track'} aria-pressed={playing}>
   <span ref={disc} className="music-vinyl" aria-hidden="true"><i/></span>
   <span className="music-copy"><span className="music-title"><span>UNREQUITED</span><span aria-hidden="true">UNREQUITED</span></span><span className="music-status">AMBIENT • {playing?'ON':'OFF'}</span></span>
   <span ref={bars} className="music-bars" aria-hidden="true">{[0,1,2,3,4].map(i=><i key={i}/>)}</span>
   <span className="music-progress" aria-hidden="true"><span ref={fill}/></span>
  </button>
  <output ref={progress} aria-label="Page scroll progress">00%</output>
  <button className="hud-theme" onClick={onTheme} aria-label={light?'Switch to dark mode':'Switch to white mode'} aria-pressed={light}>{light?<Moon size={17}/>:<Sun size={17}/>}</button>
 </div></header>;
}
