"use client";
import {useEffect,useLayoutEffect,useRef,useState,useId} from 'react';
import {createPortal} from 'react-dom';
import {assetUrl} from '@/lib/assetPreloader';
import {subscribeTicker} from '@/lib/masterTicker';
import type {Project} from '@/data/projects';
export type CinemaSession={project:Project;rect:{left:number;top:number;width:number;height:number};time:number;closing:boolean};
const clamp=(x:number)=>Math.max(0,Math.min(1,x));
const ease=(p:number)=>{if(p<=0)return 0;if(p>=1)return 1;let lo=0,hi=1;for(let i=0;i<12;i++){const t=(lo+hi)/2,u=1-t;if(3*u*u*t*.16+3*u*t*t*.3+t*t*t<p)lo=t;else hi=t;}return 1-Math.pow(1-(lo+hi)/2,3);};
const timecode=(n:number)=>`${Math.floor(n/60).toString().padStart(2,'0')}:${Math.floor(n%60).toString().padStart(2,'0')}`;
export default function CinemaPlayer({session,onClose,onDone,reducedMotion}:{session:CinemaSession;onClose:()=>void;onDone:(time:number)=>void;reducedMotion:boolean}){
 const root=useRef<HTMLDivElement>(null),frame=useRef<HTMLDivElement>(null),video=useRef<HTMLVideoElement>(null),backdrop=useRef<HTMLDivElement>(null),clip=useRef<SVGPathElement>(null),range=useRef<HTMLInputElement>(null),clock=useRef<HTMLOutputElement>(null),closeButton=useRef<HTMLButtonElement>(null);
 const callbacks=useRef({onClose,onDone});callbacks.current={onClose,onDone};
 const motion=useRef({progress:0,lastInput:performance.now(),seeking:false});
 const [paused,setPaused]=useState(false),[muted,setMuted]=useState(false),[error,setError]=useState('');
 const clipId=`cinema-${useId().replace(/:/g,'')}`;
 useLayoutEffect(()=>{
  const previous=document.activeElement as HTMLElement|null;closeButton.current?.focus({preventScroll:true});
  const key=(e:KeyboardEvent)=>{motion.current.lastInput=performance.now();if(e.key==='Escape'){e.preventDefault();callbacks.current.onClose();}if(e.key==='Tab'){const items=Array.from(root.current!.querySelectorAll<HTMLElement>('button,input'));const first=items[0],last=items[items.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}};
  const release=()=>{motion.current.seeking=false;};window.addEventListener('pointerup',release);window.addEventListener('pointercancel',release);window.addEventListener('keydown',key);return()=>{window.removeEventListener('pointerup',release);window.removeEventListener('pointercancel',release);window.removeEventListener('keydown',key);previous?.focus({preventScroll:true});};
 },[]);
 useEffect(()=>{
  const v=video.current!;v.muted=false;v.volume=1;
  const ready=()=>{if(session.time>0&&Number.isFinite(v.duration))v.currentTime=Math.min(session.time,Math.max(0,v.duration-.1));void v.play().catch(()=>setPaused(true));};
  v.addEventListener('loadedmetadata',ready);if(v.readyState>=1)ready();
  return()=>{v.removeEventListener('loadedmetadata',ready);v.pause();v.muted=true;};
 },[session.project,session.time]);
 useLayoutEffect(()=>{
  const start=performance.now(),from=motion.current.progress,to=session.closing?0:1,duration=reducedMotion?1:650;
  let target={left:innerWidth*.04,top:innerHeight*.08,width:innerWidth*.92,height:innerHeight*.84},done=false;
  const resize=()=>{done=false;target={left:innerWidth*.04,top:innerHeight*.08,width:innerWidth*.92,height:innerHeight*.84};};window.addEventListener('resize',resize);
  if(session.closing){video.current?.pause();if(video.current)video.current.muted=true;}
  const stop=subscribeTicker(now=>{
   const t=clamp((now-start)/duration),p=from+(to-from)*ease(t);motion.current.progress=p;
   const el=frame.current!,r=session.rect;
   if(t<1 || motion.current.progress!==to || !done){
   el.style.width=`${target.width}px`;el.style.height=`${target.height}px`;
   el.style.transform=`translate3d(${r.left+(target.left-r.left)*p}px,${r.top+(target.top-r.top)*p}px,0) scale(${(r.width+(target.width-r.width)*p)/target.width},${(r.height+(target.height-r.height)*p)/target.height})`;
   el.style.borderRadius=`${18*p}px`;el.style.setProperty('--shutter',String(1-p));
   const a=.025*(1-p),b=.04*(1-p);clip.current?.setAttribute('d',`M ${a} ${b} Q .5 0 ${1-a} ${b} Q 1 .5 ${1-a} ${1-b} Q .5 1 ${a} ${1-b} Q 0 .5 ${a} ${b} Z`);
   backdrop.current!.style.opacity=String(p);
   el.style.filter=!reducedMotion&&now-start<160?'drop-shadow(-4px 0 0 rgba(255,0,80,.6)) drop-shadow(4px 0 0 rgba(0,230,255,.6))':'none';
   }
   if(!session.closing&&t===1)done=true;
   root.current!.dataset.hud=String(!session.closing&&(now-motion.current.lastInput<2500||motion.current.seeking));
   root.current!.style.setProperty('--cinema-progress',String(p));
   const v=video.current!;if(Number.isFinite(v.duration)&&v.duration>0){if(!motion.current.seeking)range.current!.value=String(v.currentTime/v.duration*100);clock.current!.value=`${timecode(v.currentTime)} / ${timecode(v.duration)}`;}
   if(session.closing&&t===1&&!done){done=true;callbacks.current.onDone(video.current?.currentTime||0);}
  });return()=>{stop();window.removeEventListener('resize',resize);};
 },[session.closing,session.rect,reducedMotion]);
 const togglePlay=()=>{const v=video.current!;if(v.paused)void v.play().catch(()=>setError('Playback is unavailable. Please try again.'));else v.pause();};
 return createPortal(<div ref={root} className="cinema-player" role="dialog" aria-modal="true" aria-label={`${session.project.shortTitle} cinema player`} onFocusCapture={()=>{motion.current.lastInput=performance.now();}} onPointerMove={()=>{motion.current.lastInput=performance.now();}} onPointerDown={()=>{motion.current.lastInput=performance.now();}}>
  <div ref={backdrop} className="cinema-backdrop" onClick={()=>callbacks.current.onClose()}/>
  <svg width="0" height="0" aria-hidden="true"><defs><clipPath id={clipId} clipPathUnits="objectBoundingBox"><path ref={clip}/></clipPath></defs></svg>
  <div ref={frame} className="cinema-frame" style={{clipPath:`url(#${clipId})`}}>
   <video ref={video} src={assetUrl(session.project.video.replace('.mp4','-full.mp4'))} poster={assetUrl(session.project.poster)} playsInline preload="auto" onPlay={()=>setPaused(false)} onPause={()=>setPaused(true)} onEnded={()=>setPaused(true)} onError={()=>setError('Unable to load this video. Please close and try again.')} onClick={togglePlay}/>
   <i className="cinema-shutter cinema-shutter-top" aria-hidden="true"/><i className="cinema-shutter cinema-shutter-bottom" aria-hidden="true"/>
   {error&&<p className="cinema-error" role="alert">{error}</p>}
  </div>
  <div className="cinema-top cinema-hud"><p>{session.project.shortTitle} — {session.project.role} / {session.project.year}</p><button ref={closeButton} onClick={()=>callbacks.current.onClose()}>CLOSE [ESC]</button></div>
  <div className="cinema-controls cinema-hud">
   <button onClick={togglePlay} aria-label={paused?'Play video':'Pause video'}>{paused?'PLAY':'PAUSE'}</button>
   <input ref={range} type="range" min="0" max="100" step="0.01" defaultValue="0" aria-label="Video progress" onPointerDown={()=>{motion.current.seeking=true;}} onPointerUp={()=>{motion.current.seeking=false;}} onPointerCancel={()=>{motion.current.seeking=false;}} onChange={e=>{const v=video.current!;if(Number.isFinite(v.duration))v.currentTime=Number(e.target.value)/100*v.duration;motion.current.lastInput=performance.now();}}/>
   <output ref={clock}>00:00 / 00:00</output>
   <button onClick={()=>{const v=video.current!;v.muted=!v.muted;setMuted(v.muted);}} aria-label={muted?'Unmute video':'Mute video'}>{muted?'UNMUTE':'MUTE'}</button>
  </div>
 </div>,document.body);
}
