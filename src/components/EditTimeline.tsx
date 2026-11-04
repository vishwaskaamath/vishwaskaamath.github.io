"use client";
import {useEffect,useRef} from 'react';
import type {Project} from '@/data/projects';
import {subscribeTicker,damp} from '@/lib/masterTicker';
import {assetUrl} from '@/lib/assetPreloader';
export const editCraft=(p:Project)=>p.role.includes('MOTION')?'Pace + Keyframe + Sequence':p.role.includes('WEB')?'Interaction + Timing + Flow':'Rhythm Cut + SFX + Grade';
export default function EditTimeline({project,index}:{project:Project;index:number}){
 const root=useRef<HTMLDivElement>(null);
 useEffect(()=>{const el=root.current!,head=el.querySelector<HTMLElement>('.sequence-playhead')!,label=el.querySelector<HTMLElement>('.sequence-timecode')!;let hover=false,x=.5,y=.5,rx=0,ry=0,lastSeek=0;
 const move=(e:PointerEvent)=>{const r=el.getBoundingClientRect();hover=true;x=Math.max(0,Math.min(1,(e.clientX-r.left)/r.width));y=(e.clientY-r.top)/r.height;};const leave=()=>hover=false;
 el.addEventListener('pointermove',move);el.addEventListener('pointerleave',leave);
 const stop=subscribeTicker((now,dt)=>{if(document.hidden||el.closest('[inert]')||el.closest('[data-software]')?.getAttribute('aria-hidden')!=='false')return;
 const video=document.querySelector<HTMLVideoElement>(`[data-video="${index}"] video`);const duration=video?.duration??0,valid=Number.isFinite(duration)&&duration>0;
 if(hover&&valid&&video&&now-lastSeek>100){video.currentTime=x*duration;lastSeek=now;}
 const progress=hover?x:valid?(video!.currentTime/duration):0;head.style.left=`${15+progress*70}%`;
 const seconds=valid?progress*duration:0;label.textContent=`00:${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(Math.floor(seconds)%60).padStart(2,'0')}:${String(Math.floor(seconds%1*24)).padStart(2,'0')}`;
 rx=damp(rx,hover?(y-.5)*-16:0,10,dt);ry=damp(ry,hover?(x-.5)*20:0,10,dt);el.style.transform=`rotateX(${rx}deg) rotateY(${ry}deg)`;
 });return()=>{stop();el.removeEventListener('pointermove',move);el.removeEventListener('pointerleave',leave);};},[index]);
 return <div className="sequence-perspective"><div ref={root} className="edit-sequence" data-edit-sequence aria-label={`${project.shortTitle} edit sequence`}>
 <header><b>SEQUENCE {String(index+1).padStart(2,'0')}</b><span>CUT · FX · TRANSITION</span></header>
 <div className="sequence-tracks"><div className="sequence-ruler"/><div className="sequence-playhead"><span className="sequence-timecode">00:00:00:00</span><i/></div>
 {['FX','V1','A1','A2'].map((lane,row)=><div className={`sequence-lane lane-${row}`} key={lane}><small>{lane}</small><div className="sequence-clips">{Array.from({length:row===1?3:2},(_,j)=><span className="sequence-clip" key={j} style={{flex:1+((index+j+row)%3)*.3}}>{row===0?'◇     ◇':row===1?<><img src={assetUrl(project.poster)} alt=""/><i className="dissolve"/></>:<svg viewBox="0 0 100 18" preserveAspectRatio="none" aria-hidden="true">{Array.from({length:30},(_,k)=><path key={k} d={`M ${k*3.4} ${9-(2+(k*7+index*3+j)%7)} V ${9+(2+(k*7+index*3+j)%7)}`} stroke="currentColor" strokeWidth="1"/>)}<path d="M0 13 Q25 3 50 10 T100 6" fill="none" stroke="#d4fff0" strokeWidth=".6"/><circle cx="50" cy="10" r="1.5" fill="#fff"/></svg>}</span>)}</div></div>)}
 </div></div></div>;
}
