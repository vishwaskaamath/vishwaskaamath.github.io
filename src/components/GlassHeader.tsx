"use client";
import {useEffect,useLayoutEffect,useRef,useState} from 'react';
import {Moon,Sun} from 'lucide-react';
const labels=['About','Lab','Work','Studio','Contact'] as const;
export default function GlassHeader({active,onNavigate,onHome,playing,onAudio,light,onTheme}:{active:string;onNavigate:(name:string)=>void;onHome:()=>void;playing:boolean;onAudio:()=>void;light:boolean;onTheme:()=>void}){
 const nav=useRef<HTMLElement>(null),indicator=useRef<HTMLSpanElement>(null);
 const [clock,setClock]=useState('--:--');
 useEffect(()=>{const update=()=>setClock(new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Kolkata',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date()));update();const timer=setInterval(update,1000);return()=>clearInterval(timer);},[]);
 useLayoutEffect(()=>{const dock=nav.current!;const update=()=>{const item=dock.querySelector<HTMLElement>('[aria-current="page"]');if(item&&indicator.current){indicator.current.style.width=`${item.offsetWidth}px`;indicator.current.style.height=`${item.offsetHeight}px`;indicator.current.style.transform=`translate3d(${item.offsetLeft}px,${item.offsetTop}px,0)`;}};update();const observer=new ResizeObserver(update);observer.observe(dock);dock.querySelectorAll('button').forEach(b=>observer.observe(b));return()=>observer.disconnect();},[active]);
 return <header className="hud-header glass-hud">
  <button className="identity" onClick={onHome} aria-label="Vishwas Kamath, home"><span className="monogram">v<span>k</span><i/></span><span className="identity-copy"><b className="identity-name">VISHWAS KAMATH</b><span><i className="status-led"/>CREATIVE DIRECTION &amp; MOTION</span></span></button>
  <nav ref={nav} className="main-nav" aria-label="Main navigation"><span ref={indicator} className="nav-pill" aria-hidden="true"/>{labels.map(label=><button key={label} className={active===label.toLowerCase()?'nav-active':''} aria-current={active===label.toLowerCase()?'page':undefined} onClick={()=>onNavigate(label.toLowerCase())}><span className="nav-slot"><span>{label}</span><span aria-hidden="true">{label}</span></span></button>)}</nav>
  <div className="telemetry-pod"><span className="telemetry-clock" aria-label={`Bengaluru time ${clock} IST`}>BLR · {clock.split(':')[0]}<span className="clock-colon">:</span>{clock.split(':')[1]} IST</span><span className="nav-divider" aria-hidden="true"/><button className="equalizer-button" onClick={onAudio} aria-label={playing?'Mute ambient audio':'Enable ambient audio'} aria-pressed={playing}><span className="equalizer" aria-hidden="true">{[0,1,2,3].map(i=><i key={i} style={{animationDelay:`${i*-.19}s`}}/>)}</span></button><button className="theme-toggle" onClick={onTheme} aria-label={light?'Switch to dark mode':'Switch to white mode'} aria-pressed={light}>{light?<Moon size={16}/>:<Sun size={16}/>}</button></div>
 </header>;
}
