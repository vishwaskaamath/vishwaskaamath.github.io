"use client";
import {useEffect,useRef} from 'react';
import {Moon,Sun,Volume2,VolumeX} from 'lucide-react';
import type {ScrollPhysics} from '@/lib/scrollPhysics';
export default function GlassHeader({engine,playing,onAudio,light,onTheme,onStory}:{engine:ScrollPhysics;playing:boolean;onAudio:()=>void;light:boolean;onTheme:()=>void;onStory:()=>void}){
 const progress=useRef<HTMLOutputElement>(null);
 useEffect(()=>engine.subscribe(f=>{if(progress.current)progress.current.value=`${String(Math.round(f.progress*100)).padStart(2,'0')}%`;}),[engine]);
 return <header className="minimal-hud"><div className="minimal-controls"><output ref={progress} aria-label="Page scroll progress">00%</output><button onClick={onAudio} aria-label={playing?'Mute ambient audio':'Enable ambient audio'} aria-pressed={playing}>{playing?<Volume2 size={17}/>:<VolumeX size={17}/>}</button><button onClick={onTheme} aria-label={light?'Switch to dark mode':'Switch to white mode'} aria-pressed={light}>{light?<Moon size={17}/>:<Sun size={17}/>}</button></div></header>;
}
