"use client";
import {useEffect,useRef} from 'react';
import {subscribeTicker} from '@/lib/masterTicker';
import type {ScrollPhysics} from '@/lib/scrollPhysics';
import {useThemeRef} from '@/lib/theme';
const clamp=(x:number)=>Math.max(0,Math.min(1,x));
const out=(x:number)=>1-Math.pow(1-clamp(x),3);
const ease=(x:number)=>{x=clamp(x);return x<.5?4*x*x*x:1-Math.pow(-2*x+2,3)/2;};
export default function StoryNavigation({engine}:{engine:ScrollPhysics}){
 const canvas=useRef<HTMLCanvasElement>(null),hud=useRef<HTMLDivElement>(null),button=useRef<HTMLButtonElement>(null),theme=useThemeRef();
 const navigate=useRef<(view:'work'|'about')=>void>(()=>{});
 useEffect(()=>{
  const c=canvas.current!,ctx=c.getContext('2d')!,main=c.closest('main')!;
  let width=innerWidth,height=innerHeight,elapsed=0,active=false,swapped=false,buffer=0,destination:'work'|'about'='about';
  const stamps=new Map<string,HTMLCanvasElement>();
  const bake=()=>{width=innerWidth;height=innerHeight;c.width=width;c.height=height;stamps.clear();for(const word of ['ABOUT','WORK'])for(const light of [false,true]){const stamp=document.createElement('canvas');stamp.width=width;stamp.height=height;const s=stamp.getContext('2d')!;s.font=`700 ${Math.round(Math.min(width*.36,height*.58))}px "Bebas Neue", sans-serif`;s.fillStyle=light?'#F3EFE6':'#111113';s.fillText(word,width*.035,height*.95);stamps.set(word+light,stamp);}};
  bake();document.fonts.load('700 100px "Bebas Neue"').then(()=>{if(c.isConnected)bake();});window.addEventListener('resize',bake);
  navigate.current=view=>{if(active||view===engine.view||main.dataset.cinema!=='closed')return;active=true;destination=view;elapsed=0;swapped=false;buffer=0;engine.locked=true;main.inert=true;c.style.visibility='visible';};
  const open=()=>navigate.current('about');window.addEventListener('portfolio:story',open);engine.onBoundary=()=>navigate.current('work');
  const sync=()=>{const about=engine.view==='about';button.current!.querySelector('.portal-label')!.textContent=about?'BACK TO REEL':'ABOUT & CONTACT';button.current!.querySelector('.portal-arrow')!.textContent=about?'↑':'↓';hud.current!.dataset.view=engine.view;};
  const off=engine.subscribe(sync);
  const stop=subscribeTicker((_now,dt)=>{if(!active)return;
   if(buffer>0)buffer--;else elapsed+=Math.min(dt*1000,16.67);
   if(elapsed>=680&&!swapped){swapped=true;engine.setView(destination);buffer=2;document.title=destination==='about'?'Vishwas Kamath — About':'Vishwas Kamath — Motion Portfolio';}
   const light=theme.current==='light';ctx.clearRect(0,0,width,height);ctx.fillStyle=light?'#111113':'#F3EFE6';
   const cover=elapsed<600,uncover=elapsed>=780,wave=cover?elapsed/600*1.15:uncover?(elapsed-780)/600*1.15:2;
   const cw=width/16,ch=height/10;
   for(let col=0;col<16;col++)for(let row=0;row<10;row++){const threshold=col/15*.42+(9-row)/9*.48+((col*3)%4)*.035;const local=clamp((wave-threshold)/.14);const fill=uncover?1-ease(local):out(local);if(fill>0)ctx.fillRect(col*cw-.5,row*ch+(cover?ch*(1-fill):0)-.5,cw+1,ch*fill+1);}
   const enter=out((elapsed-140)/280),exit=ease((elapsed-780)/600),offset=elapsed<780?140*(1-enter):-180*exit;
   ctx.globalCompositeOperation='source-atop';ctx.globalAlpha=elapsed<780?enter:1-exit;const stamp=stamps.get(destination.toUpperCase()+light);if(stamp)ctx.drawImage(stamp,0,offset);ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';
   if(elapsed>=1380){active=false;ctx.clearRect(0,0,width,height);c.style.visibility='hidden';engine.locked=false;main.inert=false;button.current?.focus({preventScroll:true});}
  });
  return()=>{off();stop();engine.onBoundary=null;engine.locked=false;main.inert=false;window.removeEventListener('portfolio:story',open);window.removeEventListener('resize',bake);};
 },[engine,theme]);
 return <><div ref={hud} className="reel-scroll-prompt story-portal"><button ref={button} onClick={()=>navigate.current(engine.view==='work'?'about':'work')} onPointerMove={e=>{if(e.pointerType!=='mouse')return;const r=e.currentTarget.getBoundingClientRect();e.currentTarget.style.translate=`${(e.clientX-r.left-r.width/2)*.12}px ${(e.clientY-r.top-r.height/2)*.18}px`;}} onPointerLeave={e=>{e.currentTarget.style.translate='0 0';}}><span className="portal-label">ABOUT & CONTACT</span><span className="portal-arrow" aria-hidden="true">↓</span></button></div><canvas ref={canvas} className="story-transition-canvas" aria-hidden="true"/></>;
}
