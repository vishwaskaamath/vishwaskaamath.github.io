"use client";
import {useLayoutEffect,useRef,useState,type CSSProperties} from 'react';
import {projects,profile} from '@/data/projects';
import {assetUrl} from '@/lib/assetPreloader';
import {damp,subscribeTicker} from '@/lib/masterTicker';
import type {ScrollPhysics} from '@/lib/scrollPhysics';
import WarpedText from './WarpedText';
import {LiquidDivider} from './LiquidStory';

const disciplines=[
 ['VIDEO EDITING','COMMERCIALS • PACING • SOUND','music'],
 ['MOTION & VFX','KINETIC TYPE • COMPOSITING • 3D','pocket'],
 ['UI / UX & WEB','FIGMA • NEXT.JS • INTERACTION','induction'],
 ['ART DIRECTION','CONCEPT • VISUAL IDENTITY • CRAFT','artists'],
];
const modules=[
 ['Pr','PREMIERE PRO','#a855f7','NARRATIVE CUTS • RHYTHM • AUDIO MIX'],
 ['Ae','AFTER EFFECTS','#b185ff','KINETIC TYPE • COMPOSITING • MOTION'],
 ['Ps','PHOTOSHOP','#38bdf8','COMPOSITES • RETOUCH • ARTWORK'],
 ['Fi','FIGMA','#ff7964','SYSTEMS • PROTOTYPES • INTERACTION'],
 ['Bl','BLENDER','#f97316','MODELLING • LIGHTING • 3D'],
 ['Da','DAVINCI RESOLVE','#79d8c1','COLOUR • GRADE • FINISH'],
 ['Hb','HANDBRAKE','#c4d780','ENCODE • COMPRESS • DELIVER'],
 ['Ai','ILLUSTRATOR','#ffbc59','VECTORS • IDENTITY • ASSETS'],
];
const experience=[
 ['FREELANCE','Video Editing, Motion & Web','2024 — PRESENT'],
 ['PES UNIVERSITY','BBA Finance (8.45 CGPA)','2025 — 2028'],
 ['PRAKALPA CLUB','Video Editor • PESU','2025 — 2026'],
 ['VARA FOUNDATION','Social Impact & Media','2026'],
];
const clamp=(n:number)=>Math.max(0,Math.min(1,n));
const tickerCopy='AVAILABLE FOR FREELANCE & CREATIVE DIRECTION ✳ BENGALURU, IN ✳ ';

export default function KineticChapters({engine}:{engine:ScrollPhysics}){
 const root=useRef<HTMLDivElement>(null),[copied,setCopied]=useState(false),[copyError,setCopyError]=useState(false);
 const pointer=useRef({x:0,y:0,row:-1,tool:-1,contact:false});
 useLayoutEffect(()=>{
  const el=root.current!,story=el.closest<HTMLElement>('.story-stage')!;
  const rows=Array.from(el.querySelectorAll<HTMLElement>('.kinetic-discipline'));
  const tiles=Array.from(el.querySelectorAll<HTMLElement>('.hardware-tool'));
  const dock=el.querySelector<HTMLElement>('.hardware-dock')!,stats=el.querySelector<HTMLElement>('.kinetic-metrics')!;
  const counters=Array.from(stats.querySelectorAll<HTMLElement>('strong'));
  const preview=el.querySelector<HTMLElement>('.discipline-preview')!,video=preview.querySelector('video')!;
  const contact=el.querySelector<HTMLElement>('.story-contact')!,portal=el.querySelector<HTMLElement>('.copy-orbit')!;
  const ticker=el.querySelector<HTMLElement>('.contact-ticker-track')!;
  const hudName=el.querySelector<HTMLElement>('[data-module-name]')!,hudUse=el.querySelector<HTMLElement>('[data-module-use]')!,hudNumber=el.querySelector<HTMLElement>('[data-module-number]')!,hudBar=el.querySelector<HTMLElement>('.module-signal i')!;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  let height=innerHeight,width=innerWidth,rowsY:number[]=[],dockY=0,dockHeight=1,statsY=0,contactY=0,contactX=0,centers:{x:number;y:number}[]=[];
  let active=-1,decodeAt=0,lastGlyphFrame=-1,lastPreview=-1,px=0,py=0,cx=0,cy=0,visible=0,signal=0,tickerX=0,tickerWidth=1,lastScroll=0,speed=0,countStart=-1;
  const scales=modules.map(()=>1),lifts=modules.map(()=>0);
  const measure=()=>{const origin=story.getBoundingClientRect().top;const d=dock.getBoundingClientRect(),c=contact.getBoundingClientRect();height=innerHeight;width=innerWidth;rowsY=rows.map(row=>row.getBoundingClientRect().top-origin);dockY=d.top-origin;dockHeight=d.height;statsY=stats.getBoundingClientRect().top-origin;contactY=c.top-origin;contactX=c.left;centers=tiles.map(tile=>{const r=tile.getBoundingClientRect();return{x:r.left+r.width/2,y:r.top-origin+r.height/2};});tickerWidth=ticker.scrollWidth/2;};
  const resize=new ResizeObserver(measure);resize.observe(story);window.addEventListener('resize',measure);document.fonts.ready.then(()=>{if(el.isConnected)measure();});measure();
  const stop=subscribeTicker((now,dt)=>{
   const frame=engine.read(),scroll=frame.storyScrollY,shift=height-scroll,m=pointer.current;
   if(engine.view!=='about'||document.hidden){video.pause();lastPreview=-1;return;}
   const motion=!reduced.matches;
   rows.forEach((row,i)=>{const p=clamp((height*.92-(rowsY[i]+shift))/(height*.55));row.style.setProperty('--row-offset',`${motion?(1-p)*(i%2?-30:30):0}px`);});
   const rowVisible=m.row>=0&&rowsY[m.row]+shift<height&&rowsY[m.row]+shift>-180;
   if(rowVisible&&lastPreview!==m.row){const project=projects.find(p=>p.id===disciplines[m.row][2])??projects[0];video.src=assetUrl(project.video);video.poster=assetUrl(project.poster);if(motion)void video.play().catch(()=>{});lastPreview=m.row;}
   if(!rowVisible&&lastPreview!==-1){video.pause();lastPreview=-1;}
   visible=damp(visible,rowVisible&&motion?1:0,16,dt);preview.style.opacity=String(visible);
   px=damp(px,Math.max(0,Math.min(width-230,m.x+22)),14,dt);py=damp(py,Math.max(85,Math.min(height-145,m.y-68)),14,dt);
   // Coordinates stay in story flow, independent of its scroll transform.
   preview.style.transform=`translate3d(${px}px,${py-shift}px,0) rotate(${(m.x-px-22)*.025}deg) scale(${.9+.1*visible})`;
   const scan=clamp((height*.8-(dockY+shift))/(height*.85+dockHeight));
   const selected=m.tool>=0?m.tool:Math.min(7,Math.floor(scan*8));
   if(selected!==active){active=selected;decodeAt=now;lastGlyphFrame=-1;signal=0;}
   const decode=motion?clamp((now-decodeAt)/200):1,glyphFrame=Math.floor(decode*12);
   if(glyphFrame!==lastGlyphFrame){const scramble=(text:string)=>Array.from(text).map((char,i)=>char===' '||i/text.length<decode?char:'░▒01'[((i*7+glyphFrame)%4)]).join('');hudName.textContent=scramble(`[ MODULE ${String(active+1).padStart(2,'0')}/08 : ${modules[active][1]} ]`);hudUse.textContent=scramble(modules[active][3]);lastGlyphFrame=glyphFrame;}
   signal=damp(signal,98,8,dt);hudNumber.textContent=`${Math.round(signal)}%`;hudBar.style.transform=`scaleX(${signal/100})`;
   const dockVisible=dockY+shift<height+100&&dockY+shift+dockHeight>-100;
   if(dockVisible)tiles.forEach((tile,i)=>{const dist=Math.abs(i-active),goal=dist===0?1.22:dist===1?1.08:1;scales[i]=damp(scales[i],goal,12,dt);lifts[i]=damp(lifts[i],dist===0?-12:0,12,dt);const bob=motion?Math.sin(now*.0013+i*.8)*4:0;const nx=m.tool===i?Math.max(-1,Math.min(1,(m.x-centers[i].x)/65)):0,ny=m.tool===i?Math.max(-1,Math.min(1,(m.y-centers[i].y-shift)/65)):0;tile.style.transform=`translate3d(0,${lifts[i]+bob}px,0) rotateX(${-ny*10}deg) rotateY(${nx*12}deg) scale(${scales[i]})`;tile.dataset.active=String(i===active);});
   if(countStart<0&&statsY+shift<height*.88)countStart=now;
   const count=motion?(countStart<0?0:1-Math.pow(1-clamp((now-countStart)/950),3)):1;
   counters[0].textContent=`${Math.round(200*count)}K+`;counters[1].textContent=`${Math.round(20*count)}+`;counters[2].textContent=count>=1?'1ST':`${Math.round(count)}`;
   const delta=Math.abs(scroll-lastScroll)/Math.max(dt,.001);lastScroll=scroll;speed=damp(speed,Math.min(delta,1800),8,dt);
   if(motion)tickerX=(tickerX+dt*(30+speed*.12))%Math.max(1,tickerWidth);ticker.style.transform=`translate3d(${-tickerX}px,0,0)`;
   cx=damp(cx,m.x-contactX,18,dt);cy=damp(cy,m.y-(contactY+shift),18,dt);portal.style.transform=`translate3d(${cx}px,${cy}px,0) translate(-50%,-50%) scale(${m.contact?1:0})`;
  });
  return()=>{stop();video.pause();resize.disconnect();window.removeEventListener('resize',measure);};
 },[engine]);
 const copy=async()=>{try{await navigator.clipboard.writeText(profile.email);setCopied(true);setCopyError(false);}catch{setCopyError(true);}};
 return <div ref={root} className="kinetic-chapters" onPointerMove={e=>{pointer.current.x=e.clientX;pointer.current.y=e.clientY;}}>
  <section className="story-capabilities story-chapter kinetic-capabilities" aria-labelledby="capabilities-title">
   <LiquidDivider engine={engine}/>
   <h2 id="capabilities-title">THIS IS<br/>MY THING<span className="capabilities-trail-anchor" aria-label="."/></h2>
   <div className="discipline-rows">{disciplines.map((d,i)=><article className="kinetic-discipline" key={d[0]} tabIndex={0} onPointerEnter={e=>{if(e.pointerType==='mouse'){pointer.current.row=i;pointer.current.x=e.clientX;pointer.current.y=e.clientY;}}} onPointerLeave={()=>pointer.current.row=-1}>
    <span className="discipline-number">0{i+1}</span><h3><span className="discipline-title-track"><span>{d[0]}</span><span aria-hidden="true">{d[0]}</span></span></h3><span className="discipline-tags">[ {d[1]} ]</span><span className="discipline-arrow" aria-hidden="true">↗</span>
   </article>)}</div>
  </section>
  <div className="discipline-preview" aria-hidden="true"><video muted loop playsInline preload="none"/><i/></div>
  <section className="story-workflow story-chapter kinetic-workflow" aria-labelledby="workflow-title">
   <LiquidDivider engine={engine} dark/>
   <span className="chapter-kicker">[ 03 / THE STACK ]</span><h2 id="workflow-title">INSIDE THE<br/>WORKFLOW.</h2>
   <div className="hardware-dock" onPointerLeave={()=>pointer.current.tool=-1}>{modules.map((tool,i)=><button className="hardware-tool" key={tool[0]} aria-label={tool[1]} style={{'--tool-brand':tool[2]} as CSSProperties} onPointerEnter={()=>pointer.current.tool=i} onFocus={()=>pointer.current.tool=i} onBlur={()=>pointer.current.tool=-1} onClick={()=>pointer.current.tool=i}>
    {[1,2,3,4,5].map(z=><i className="hardware-depth" key={z} style={{transform:`translateZ(${-z*2}px)`}}/>)}<span className="hardware-face"><b>{tool[0]}</b></span>
   </button>)}</div>
   <div className="module-hud" aria-label="Active workflow module"><span data-module-name>[ MODULE 01/08 : PREMIERE PRO ]</span><span className="module-rule"/><span data-module-use>NARRATIVE CUTS • RHYTHM • AUDIO MIX</span><span className="module-signal" aria-label="Module signal"><i/></span><output data-module-number>98%</output></div>
   <div className="kinetic-metrics" aria-label="200 thousand plus reel views; 20 plus client projects; first place PESU hackathon CFO">
    <div><strong aria-hidden="true">200K+</strong><span>[ REEL VIEWS ]</span></div><div><strong aria-hidden="true">20+</strong><span>[ CLIENT PROJECTS ]</span></div><div><strong aria-hidden="true">1ST</strong><span>[ PESU HACKATHON CFO ]</span></div>
   </div>
   <div className="experience-index">{experience.map((row,i)=><div className="experience-line" key={row[0]} tabIndex={0}><span>0{i+1}</span><strong>{row[0]}</strong><span>{row[1]}</span><time>{row[2]}</time></div>)}<a className="index-resume" href="/resume.pdf" target="_blank" rel="noreferrer">RESUME ↗</a></div>
  </section>
  <section className="story-contact story-chapter kinetic-contact" aria-labelledby="contact-title">
   <div className="contact-ticker" aria-label={tickerCopy}><div className="contact-ticker-track" aria-hidden="true">{[0,1].map(i=><span key={i}>{tickerCopy.repeat(2)}</span>)}</div></div>
   <div className="contact-copy-zone" onPointerEnter={e=>{if(e.pointerType==='mouse')pointer.current.contact=true;}} onPointerLeave={()=>pointer.current.contact=false}>
    <h2 id="contact-title"><button onClick={copy} aria-label="Copy email address"><WarpedText radius={130} smoothing={.1}>LET'S TALK</WarpedText></button></h2>
    <button className="copy-email" onClick={copy}><span>{copied?'COPIED ✓':profile.email}</span><b aria-hidden="true">↗</b></button>
   </div>
   <div className="copy-orbit" data-copied={copied} aria-hidden="true"><span>{copied?'COPIED ✓':'CLICK TO\nCOPY EMAIL'}</span><i/><i/><i/><i/></div>
   <span className="copy-feedback" role="status">{copyError?'Copy unavailable — use EMAIL below.':copied?'Email address copied.':''}</span>
   <div className="contact-links"><a href={`mailto:${profile.email}`}>EMAIL ↗</a><a href="https://www.instagram.com/sydorm_/" target="_blank" rel="noreferrer">INSTAGRAM ↗</a><a href="https://www.linkedin.com/in/vishwas-kamath-717016369/" target="_blank" rel="noreferrer">LINKEDIN ↗</a></div>
   <div className="contact-bottom"><span>VISHWAS KAMATH © {new Date().getFullYear()}<br/>BENGALURU, IN</span><button onClick={()=>engine.onBoundary?.()}>BACK TO REEL ↑</button></div>
  </section>
 </div>;
}
