"use client";
import {useLayoutEffect,useRef} from 'react';
import type {ScrollPhysics} from '@/lib/scrollPhysics';
import {refreshGeometry} from '@/lib/geometryCache';
import KineticChapters from './KineticChapters';
import AboutManifesto from './AboutManifesto';
export default function StoryStage({engine}:{engine:ScrollPhysics}){
 const root=useRef<HTMLDivElement>(null);
 useLayoutEffect(()=>{
  const el=root.current!,work=document.querySelector<HTMLElement>('.work-scene')!,videoWheel=work.querySelector<HTMLElement>('.video-wheel')!,software=work.querySelector<HTMLElement>('.software-wheel')!,title=work.querySelector<HTMLElement>('.project-metadata')!;
  let height=innerHeight;let lastHidden=false;
  const measure=()=>{height=innerHeight;if(el.offsetHeight>0)engine.configureStory(el.offsetHeight,height);engine.invalidate();};
  const observer=new ResizeObserver(measure);observer.observe(el);window.addEventListener('resize',measure);document.fonts.ready.then(()=>{if(el.isConnected)measure();});measure();
  const update=()=>{const f=engine.read(),p=f.handoff;
   el.style.display='';work.style.display=p<1?'':'none';
   el.style.transform=`translate3d(0,${height-f.storyScrollY}px,0)`;
   el.style.visibility=f.storyScrollY>0?'visible':'hidden';el.inert=f.storyScrollY<=0;
   work.style.transform=`translate3d(0,${-Math.min(height,f.storyScrollY)}px,0)`;
   videoWheel.style.translate='none';videoWheel.style.opacity='1';
   software.style.translate='none';software.style.opacity='1';
   title.style.scale='1';title.style.opacity='1';
   work.style.visibility=p>=1?'hidden':'visible';work.inert=p>=1;
   if(lastHidden!==(p>=1)){lastHidden=p>=1;refreshGeometry();}


  };
  const release=engine.subscribe(update);
  const focus=(event:FocusEvent)=>{const target=event.target as HTMLElement;if(!target.matches(':focus-visible'))return;const top=target.getBoundingClientRect().top;if(top<100||top>height-100){const y=target.getBoundingClientRect().top-el.getBoundingClientRect().top;engine.scrollTo(engine.pinDistance+height+y-height*.45);}};el.addEventListener('focusin',focus);
  return()=>{release();observer.disconnect();window.removeEventListener('resize',measure);el.removeEventListener('focusin',focus);};
 },[engine]);
 return <div ref={root} className="story-stage" id="story" inert onPointerMove={event=>{if(event.pointerType!=='mouse'||matchMedia('(prefers-reduced-motion: reduce)').matches)return;const target=(event.target as Element).closest<HTMLElement>('.contact-links a,.contact-bottom button');if(target){const r=target.getBoundingClientRect();target.style.translate=`${(event.clientX-r.left-r.width/2)*.16}px ${(event.clientY-r.top-r.height/2)*.2}px`;}}} onPointerOut={event=>{const target=(event.target as Element).closest<HTMLElement>('.contact-links a,.contact-bottom button');if(target&&!target.contains(event.relatedTarget as Node))target.style.translate='0px 0px';}}>
  <div className="story-step-edge" aria-hidden="true">{Array.from({length:16},(_,i)=><i key={i} style={{height:`${20+((i*3)%4)*18}px`}}/>)}</div>
  <section className="story-intro story-chapter" aria-labelledby="intro-title"><h2 id="intro-title">HI, I'M<br/><span>VISHWAS.</span><i className="intro-star" aria-hidden="true">✳</i></h2><p className="intro-copy">A creative <span className="inline-pill">video editor ↗</span>, <span className="inline-pill">motion designer ✳</span> and interactive UI / web builder based in Bengaluru. <span className="intro-note">Equal parts instinct & curiosity.</span></p><AboutManifesto engine={engine}/></section>
  <KineticChapters engine={engine}/>
 </div>;
}
