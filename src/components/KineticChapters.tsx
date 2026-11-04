"use client";
import {useLayoutEffect,useRef,useState,type CSSProperties} from 'react';
import {projects,profile} from '@/data/projects';
import {assetUrl} from '@/lib/assetPreloader';
import {damp,subscribeTicker} from '@/lib/masterTicker';
import type {ScrollPhysics} from '@/lib/scrollPhysics';
import WarpedText from './WarpedText';
import {LiquidDivider} from './LiquidStory';
import {SoftwareEmblem} from './SoftwareIcon';

const disciplines=[
 ['VIDEO EDITING','COMMERCIALS • PACING • SOUND','music'],
 ['MOTION & VFX','KINETIC TYPE • COMPOSITING • 3D','pocket'],
 ['UI / UX & WEB','FIGMA • NEXT.JS • INTERACTION','induction'],
 ['ART DIRECTION','CONCEPT • VISUAL IDENTITY • CRAFT','artists'],
];
const modules=[
 ['Pr','PREMIERE PRO','#9999FF','NARRATIVE CUTS • RHYTHM • AUDIO MIX'],
 ['Ae','AFTER EFFECTS','#9999FF','KINETIC TYPOGRAPHY • 2D/3D COMPOSITING • MOTION SYSTEMS'],
 ['Ps','PHOTOSHOP','#31A8FF','COMPOSITES • RETOUCH • ARTWORK'],
 ['Fi','FIGMA','#ff7964','SYSTEMS • PROTOTYPES • INTERACTION'],
 ['Bl','BLENDER','#f97316','3D MODELING • HARD-SURFACE ASSETS • LIGHTING & SHADING'],
 ['Da','DAVINCI RESOLVE','#79d8c1','COLOUR • GRADE • FINISH'],
 ['Hb','HANDBRAKE','#c4d780','ENCODE • COMPRESS • DELIVER'],
 ['Ai','ILLUSTRATOR','#FF9A00','VECTORS • IDENTITY • ASSETS'],
];
const toolIds=['pr','ae','ps','figma','blender','davinci','handbrake','ai'];
const clamp=(n:number)=>Math.max(0,Math.min(1,n));
const tickerCopy='AVAILABLE FOR FREELANCE & CREATIVE DIRECTION ✳ BENGALURU, IN ✳ ';

export default function KineticChapters({engine}:{engine:ScrollPhysics}){
 const root=useRef<HTMLDivElement>(null),[copied,setCopied]=useState(false),[copyError,setCopyError]=useState(false);
 const pointer=useRef({x:0,y:0,row:-1,tool:-1,contact:false});
 useLayoutEffect(()=>{
  const el=root.current!,story=el.closest<HTMLElement>('.story-stage')!;
  const rows=Array.from(el.querySelectorAll<HTMLElement>('.kinetic-discipline'));
  const tiles=Array.from(el.querySelectorAll<HTMLElement>('.hardware-tool'));
  const dock=el.querySelector<HTMLElement>('.hardware-dock')!;
  const stage=el.querySelector<HTMLElement>('.workflow-hardware-stage')!, trace=el.querySelector<SVGPathElement>('.workflow-trace path')!;
  const preview=el.querySelector<HTMLElement>('.discipline-preview')!,video=preview.querySelector('video')!;
  const contact=el.querySelector<HTMLElement>('.story-contact')!,portal=el.querySelector<HTMLElement>('.copy-orbit')!;
  const ticker=el.querySelector<HTMLElement>('.contact-ticker-track')!;
  const hudName=el.querySelector<HTMLElement>('[data-module-name]')!,hudTags=Array.from(el.querySelectorAll<HTMLElement>('[data-module-tag]'));
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  let height=innerHeight,width=innerWidth,rowsY:number[]=[],dockY=0,dockHeight=1,contactY=0,contactX=0,centers:{x:number;y:number;h:number}[]=[];
  let active=-1,decodeAt=0,lastPreview=-1,px=0,py=0,cx=0,cy=0,visible=0,tickerX=0,tickerWidth=1,lastScroll=0,speed=0;
  const scales=modules.map(()=>1),lifts=modules.map(()=>0);
  const measure=()=>{const origin=story.getBoundingClientRect().top;const d=dock.getBoundingClientRect(),c=contact.getBoundingClientRect();height=innerHeight;width=innerWidth;rowsY=rows.map(row=>row.getBoundingClientRect().top-origin);dockY=d.top-origin;dockHeight=d.height;contactY=c.top-origin;contactX=c.left;centers=tiles.map(tile=>{const r=tile.getBoundingClientRect();return{x:r.left+r.width/2,y:r.top-origin+r.height/2,h:r.height};});tickerWidth=ticker.scrollWidth/2;};
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
   if(selected!==active){active=selected;decodeAt=now;}
   const decode=motion?clamp((now-decodeAt)/220):1;
   hudName.textContent=modules[active][1];hudName.style.transform=`translateY(${(1-decode)*22}px)`;hudName.style.opacity=String(decode);
   modules[active][3].split(' • ').forEach((tag,i)=>hudTags[i].textContent=tag);
   stage.style.setProperty('--brand-color',modules[active][2]);
   const stageWidth=dock.clientWidth, tx=centers[active].x-(width-stageWidth)/2;
   stage.style.setProperty('--tile-x',`${tx}px`);
   const tipY=centers[active].y+centers[active].h/2+lifts[active]-(dockY+dockHeight);
   trace.setAttribute('d',`M ${tx} ${tipY} V 30 Q ${tx} 45 ${(tx+stageWidth/2)/2} 45 H ${stageWidth/2} V 85`);
   trace.ownerSVGElement?.setAttribute('viewBox',`0 0 ${stageWidth} 85`);
   const dockVisible=dockY+shift<height+100&&dockY+shift+dockHeight>-100;
   if(dockVisible)tiles.forEach((tile,i)=>{const dist=Math.abs(i-active),goal=dist===0?1.22:dist===1?1.07:1;scales[i]=damp(scales[i],goal,12,dt);lifts[i]=damp(lifts[i],dist===0?-16:dist===1?-6:0,12,dt);const bob=motion?Math.sin(now*.0013+i*.8)*4:0;const nx=m.tool===i?Math.max(-1,Math.min(1,(m.x-centers[i].x)/65)):0,ny=m.tool===i?Math.max(-1,Math.min(1,(m.y-centers[i].y-shift)/65)):0;tile.style.transform=`translate3d(0,${lifts[i]+bob}px,0) rotateX(${-ny*10}deg) rotateY(${nx*12}deg) scale(${scales[i]})`;tile.dataset.active=String(i===active);});
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
   <header className="workflow-heading"><div><span className="chapter-kicker">[ 03 / THE STACK ]</span><h2 id="workflow-title">INSIDE THE<br/>WORKFLOW.</h2></div></header>
   <div className="workflow-hardware-stage">
    <div className="hardware-dock" onPointerLeave={()=>pointer.current.tool=-1}>{modules.map((tool,i)=><button className="hardware-tool" key={tool[0]} aria-label={tool[1]} style={{'--tool-brand':tool[2]} as CSSProperties} onPointerEnter={()=>pointer.current.tool=i} onFocus={()=>pointer.current.tool=i} onBlur={()=>pointer.current.tool=-1} onClick={()=>pointer.current.tool=i}>
     <i className="hardware-reflection"/>{[4,8,11,14].map(z=><i className="hardware-depth" key={z} style={{transform:`translateZ(${-z}px)`}}/>)}<span className="hardware-face"/><span className="hardware-glyph"><SoftwareEmblem software={toolIds[i]}/></span>
    </button>)}</div>
    <svg className="workflow-trace" width="100%" height="85" aria-hidden="true"><path fill="none" stroke="var(--brand-color)" strokeWidth="2"/></svg>
    <div className="inspection-deck" aria-label="Active workflow module"><div className="inspection-name"><strong data-module-name>PREMIERE PRO</strong></div><div className="inspection-tags">{[0,1,2].map(i=><span data-module-tag key={i}>{modules[0][3].split(' • ')[i]}</span>)}</div></div>
   </div>
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
