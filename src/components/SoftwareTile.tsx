"use client";
import {useEffect,useRef} from 'react';
import {toolCatalog,type Software,type Tool} from '@/data/projects';
import {subscribeTicker,damp} from '@/lib/masterTicker';
import SoftwareCube3D from './SoftwareCube3D';
export default function SoftwareTile({software,tools=[toolCatalog[software]]}:{software:Software;tools?:Tool[]}){
 const root=useRef<HTMLDivElement>(null);
 useEffect(()=>{const el=root.current!,cubes=Array.from(el.querySelectorAll<HTMLElement>('[data-orbit-cube]'));let hover=false,nx=0,ny=0,tx=0,ty=0,angle=0,mix=0;const poses=cubes.map((_,i)=>({x:i?26:-18,y:i?20:-14,z:i?-24:26,ry:i?-16:-12,rx:i?8:6,rz:i?8:-5,s:i?.88:.96}));
 let mouseX=-10000,mouseY=-10000;const move=(e:PointerEvent)=>{mouseX=e.clientX;mouseY=e.clientY;};const leave=()=>{mouseX=-10000;mouseY=-10000;};window.addEventListener('pointermove',move,{passive:true});window.addEventListener('blur',leave);
 const stop=subscribeTicker((now,dt)=>{if(document.hidden)return;const active=el.closest('[data-software]')?.getAttribute('aria-hidden')==='false';if(active){const r=el.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2;hover=Math.hypot(mouseX-cx,mouseY-cy)<135;nx=Math.max(-1,Math.min(1,(mouseX-cx)/135));ny=Math.max(-1,Math.min(1,(mouseY-cy)/135));}else hover=false;const multi=cubes.length>1;mix=damp(mix,hover?1:0,9,dt);tx=damp(tx,hover?-ny*16:0,10,dt);ty=damp(ty,hover?nx*16:0,10,dt);angle+=dt*(.6+mix*3.2);
 cubes.forEach((cube,k)=>{const a=angle+k*Math.PI*2/cubes.length,rest=poses[k],blend=(idle:number,moving:number)=>idle+(moving-idle)*mix;const x=multi?blend(rest.x,Math.cos(a)*38):0,y=multi?blend(rest.y,Math.sin(a)*22):0,z=multi?blend(rest.z,Math.sin(a)*40):0,ry=multi?blend(rest.ry,-Math.cos(a)*18):0,rz=multi?blend(rest.rz,Math.cos(a)*10):0,scale=multi?blend(rest.s,.84+(Math.sin(a)+1)*.11):1;cube.style.transform=`translate3d(${x}px,${y}px,${z}px) rotateX(${tx+(multi?rest.rx*(1-mix):0)}deg) rotateY(${ty+ry}deg) rotateZ(${rz}deg) scale(${scale})`;cube.style.zIndex=String(Math.round(50+z));cube.style.setProperty('--tile-light',String(mix));cube.style.setProperty('--light-x',`${50+nx*50}%`);cube.style.setProperty('--light-y',`${50+ny*50}%`);});});return()=>{stop();window.removeEventListener('pointermove',move);window.removeEventListener('blur',leave);};},[tools]);
 return <div ref={root} className="software-orbit-stage">{tools.map(tool=><SoftwareCube3D key={tool.id} tool={tool}/>)}</div>;
}
