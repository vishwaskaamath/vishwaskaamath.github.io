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
  const svg=trail.querySelector('svg')!,anchor=story.querySelector<HTMLElement>('.capabilities-trail-anchor')!,originDot=el.querySelector<SVGCircleElement>('.manifesto-origin')!;
  const path=el.querySelector<SVGPathElement>('.manifesto-path')!,pen=el.querySelector<SVGGElement>('.manifesto-pen')!;
  const labels=Array.from(el.querySelectorAll<SVGGElement>('.manifesto-node'));
  const motion=matchMedia('(prefers-reduced-motion: reduce)');
  let paragraphY=0,paragraphHeight=1,trailY=0,trailHeight=1,height=innerHeight,length=1,previous='';
  const render=()=>{
   const scroll=engine.read().storyScrollY,top=height-scroll+paragraphY;
   const p=motion.matches?1:clamp01((height*.82-top)/Math.max(1,paragraphHeight));
   const pathTop=height-scroll+trailY;
   // Clip the document-flow trail below the fixed brand HUD, including its marker.
   svg.style.clipPath=`inset(${Math.max(0,84-pathTop)}px 0 0 0)`;
   const draw=motion.matches?1:clamp01((height*.82-pathTop)/Math.max(1,trailHeight));
   const key=`${p.toFixed(5)}:${draw.toFixed(5)}:${theme.current}`;if(key===previous)return;previous=key;
   words.forEach((word,i)=>word.style.color=wordRevealColor(i,words.length,p,theme.current==='light'));
   badges.forEach((badge,i)=>badge.dataset.visible=String(p>=stickers[i].at));
   const drawLength=length*draw;
   path.style.strokeDasharray=String(length);path.style.strokeDashoffset=String(length-drawLength);
   const pt=path.getPointAtLength(drawLength),behind=path.getPointAtLength(Math.max(0,drawLength-2));
   const angle=Math.atan2(pt.y-behind.y,pt.x-behind.x)*180/Math.PI;
   anchor.dataset.docked=String(draw===1);
   pen.setAttribute('transform',`translate(${pt.x} ${pt.y}) rotate(${angle})`);pen.style.opacity=draw>0?'1':'0';
   labels.forEach((label,i)=>label.dataset.visible=String(draw>=nodes[i].at));
  };
  const measure=()=>{
   height=innerHeight;const origin=story.getBoundingClientRect().top,p=paragraph.getBoundingClientRect(),t=trail.getBoundingClientRect();
   paragraphY=p.top-origin;paragraphHeight=p.height;trailY=t.top-origin;
   const a=anchor.getBoundingClientRect(),lastWord=words[words.length-1].getBoundingClientRect();
   const scale=600/Math.max(1,t.width),endX=(a.left+a.width/2-t.left)*scale,endY=(a.top+a.height/2-t.top)*scale;
   trailHeight=Math.max(1,a.top+a.height/2-t.top);
   const startX=Math.max(20,Math.min(580,(lastWord.left+lastWord.width/2-t.left)*scale));
   const h=Math.max(360,endY),y1=h*.2,y2=h*.43,y3=h*.65;
   svg.setAttribute('viewBox',`0 0 600 ${h+8}`);svg.style.height=`${(h+8)/scale}px`;
   path.setAttribute('d',`M${startX} 0 C${startX} ${y1*.4} 490 ${y1*.25} 490 ${y1} C490 ${y1+h*.17} 100 ${y2-h*.15} 100 ${y2} C100 ${y2+h*.18} 490 ${y3-h*.15} 490 ${y3} C490 ${h*.85} ${endX} ${endY-80} ${endX} ${endY-40} L${endX} ${endY}`);
   originDot.setAttribute('cx',String(startX));
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
    <circle className="manifesto-origin" cx="65" cy="0" r="5" fill="#ff4d1c"/>
    <path className="manifesto-path" d="M65 12 C65 80 500 4 500 90 C500 174 90 96 90 205 C90 295 490 188 490 278 C490 330 350 332 350 355"/>
    {nodes.map(node=><g className="manifesto-node" data-visible="false" key={node.label}><g className="manifesto-node-content"><rect x="-87" y="-20" width="174" height="40" rx="20"/><text textAnchor="middle" dominantBaseline="central">{node.label}</text></g></g>)}
    <g className="manifesto-pen" aria-hidden="true"><path d="M0 0 L-14 -8 L-40 -8 L-40 8 L-14 8 Z" fill="#f3efe6" stroke="#ff4d1c" strokeWidth="2"/><path d="M0 0 L-14 -8 L-14 8 Z" fill="#ff4d1c"/><path d="M-33 -8 V8 M-27 -8 V8" stroke="#111113" strokeWidth="2"/><circle cx="0" cy="0" r="2.5" fill="#ff4d1c"/></g>
   </svg>
  </div>
 </div>;
}
