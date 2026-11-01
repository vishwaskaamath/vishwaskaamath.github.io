"use client";
import {useLayoutEffect,useRef,type CSSProperties} from 'react';
import type {ScrollPhysics} from '@/lib/scrollPhysics';
import {THEME_EVENT,useThemeRef} from '@/lib/theme';
import {wordRevealColor,clamp01} from '@/lib/manifestoReveal';

const copy="I blend rhythm-driven video editing and motion graphics with interactive Next.js experiences. Based in Bengaluru, I bring BBA finance and strategy into the creative process — shaping every cut, frame and interface with intention. From the first idea to the final build, I make stories feel sharp, human and impossible to scroll past.";
const stickers=[{word:'editing',text:'Cut to the beat',at:.32,tilt:-5},{word:'interface',text:'Motion + UI under one roof',at:.62,tilt:4},{word:'build,',text:'Built from scratch in BLR',at:.86,tilt:-3}];
const nodes=[{label:'VIDEO EDITING',at:.23},{label:'MOTION GRAPHICS',at:.52},{label:'UI / UX & WEB',at:.82}];
export default function AboutManifesto({engine}:{engine:ScrollPhysics}){
 const root=useRef<HTMLDivElement>(null),theme=useThemeRef();
 useLayoutEffect(()=>{
  const el=root.current!,story=el.closest<HTMLElement>('.story-stage')!;
  const paragraph=el.querySelector<HTMLElement>('.scroll-manifesto')!,trail=el.querySelector<HTMLElement>('.manifesto-trail')!;
  const words=Array.from(el.querySelectorAll<HTMLElement>('.scroll-word'));
  const badges=Array.from(el.querySelectorAll<HTMLElement>('.manifesto-sticker'));
  const path=el.querySelector<SVGPathElement>('.manifesto-path')!,pen=el.querySelector<SVGGElement>('.manifesto-pen')!;
  const labels=Array.from(el.querySelectorAll<SVGGElement>('.manifesto-node'));
  const motion=matchMedia('(prefers-reduced-motion: reduce)');
  let paragraphY=0,paragraphHeight=1,trailY=0,trailHeight=1,height=innerHeight,length=1,previous='';
  const render=()=>{
   const scroll=engine.read().storyScrollY,top=height-scroll+paragraphY;
   const p=motion.matches?1:clamp01((height*.82-top)/(paragraphHeight+height*.47));
   const pathTop=height-scroll+trailY;
   const draw=motion.matches?1:clamp01((height*.88-pathTop)/(trailHeight+height*.25));
   const key=`${p.toFixed(5)}:${draw.toFixed(5)}:${theme.current}`;if(key===previous)return;previous=key;
   words.forEach((word,i)=>word.style.color=wordRevealColor(i,words.length,p,theme.current==='light'));
   badges.forEach((badge,i)=>badge.dataset.visible=String(p>=stickers[i].at));
   path.style.strokeDashoffset=String(length*(1-draw));
   const pt=path.getPointAtLength(draw*length),ahead=path.getPointAtLength(Math.min(length,draw*length+2)),behind=path.getPointAtLength(Math.max(0,draw*length-2));
   const angle=Math.atan2(ahead.y-behind.y,ahead.x-behind.x)*180/Math.PI;
   pen.setAttribute('transform',`translate(${pt.x} ${pt.y}) rotate(${angle})`);pen.style.opacity=draw>0?'1':'0';
   labels.forEach((label,i)=>label.dataset.visible=String(draw>=nodes[i].at));
  };
  const measure=()=>{
   height=innerHeight;const origin=story.getBoundingClientRect().top,p=paragraph.getBoundingClientRect(),t=trail.getBoundingClientRect();
   paragraphY=p.top-origin;paragraphHeight=p.height;trailY=t.top-origin;trailHeight=t.height;
   length=path.getTotalLength();path.style.strokeDasharray=String(length);
   labels.forEach((label,i)=>{const point=path.getPointAtLength(length*nodes[i].at);label.setAttribute('transform',`translate(${point.x} ${point.y})`);});
   previous='';render();
  };
  const observer=new ResizeObserver(measure);observer.observe(story);observer.observe(el);
  const unsubscribe=engine.subscribe(render);window.addEventListener('resize',measure);window.addEventListener(THEME_EVENT,render);motion.addEventListener('change',measure);
  document.fonts.ready.then(()=>{if(el.isConnected)measure();});measure();
  return()=>{unsubscribe();observer.disconnect();window.removeEventListener('resize',measure);window.removeEventListener(THEME_EVENT,render);motion.removeEventListener('change',measure);};
 },[engine,theme]);
 return <div className="about-manifesto" ref={root}>
  <div className="manifesto-editorial"><p className="manifesto-kicker">A BIT ABOUT ME</p>
   <p className="scroll-manifesto">{copy.split(' ').map((word,i)=>{const sticker=stickers.find(s=>s.word===word);return <span key={i} className="scroll-word">{word}{sticker&&<span className="manifesto-sticker" data-visible="false" style={{'--tilt':`${sticker.tilt}deg`} as CSSProperties} aria-hidden="true">{sticker.text}</span>}{' '}</span>;})}</p>
  </div>
  <div className="manifesto-trail" aria-label="From video editing and motion graphics to UI, UX and web design">
   <svg viewBox="0 0 600 360" fill="none" role="img" aria-label="Creative disciplines connected by a hand-drawn orange path">
    <path className="manifesto-path" d="M65 12 C65 80 500 4 500 90 C500 174 90 96 90 205 C90 295 490 188 490 278 C490 330 350 332 350 355"/>
    {nodes.map(node=><g className="manifesto-node" data-visible="false" key={node.label}><g className="manifesto-node-content"><rect x="-87" y="-20" width="174" height="40" rx="20"/><text textAnchor="middle" dominantBaseline="central">{node.label}</text></g></g>)}
    <g className="manifesto-pen" aria-hidden="true"><path d="M0 0 L-14 -8 L-40 -8 L-40 8 L-14 8 Z" fill="#f3efe6" stroke="#ff4d1c" strokeWidth="2"/><path d="M0 0 L-14 -8 L-14 8 Z" fill="#ff4d1c"/><path d="M-33 -8 V8 M-27 -8 V8" stroke="#111113" strokeWidth="2"/><circle cx="0" cy="0" r="2.5" fill="#ff4d1c"/></g>
   </svg>
  </div>
 </div>;
}
