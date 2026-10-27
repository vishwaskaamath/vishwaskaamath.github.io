"use client";
import { useEffect, useRef } from 'react';
import { toolCatalog, type Software, type Tool } from '@/data/projects';
import { damp, subscribeProximity } from '@/lib/proximity';
import { SoftwareIcon } from './SoftwareIcon';

const brands: Record<Software, string> = {
  ae: '#a899ff', pr: '#c09bff', ps: '#53c6ff', figma: '#70efcd', jitter: '#d3ef8a',
};

export default function SoftwareTile({software, tools = [toolCatalog[software]]}: {software: Software; tools?: Tool[]}) {
  const root = useRef<HTMLDivElement>(null);
  const motion = useRef({x:0,y:0,scale:1,glow:0,angle:0,angularVelocity:0});
  useEffect(() => {
    const element=root.current!, block=element.querySelector<HTMLElement>('.software-block')!;
    const emblem=element.querySelector<HTMLElement>('.tile-emblem');
    const logos=Array.from(element.querySelectorAll<HTMLElement>('[data-orbit-logo]'));
    const labels=Array.from(element.querySelectorAll<HTMLElement>('[data-orbit-label]'));
    const rgb=tools.map(tool=>[1,3,5].map(start=>parseInt(tool.color.slice(start,start+2),16)));
    const tint=[...rgb[0]];
    let lastFrame=0;
    const card=element.closest<HTMLElement>('[data-software]')!;
    const probes=Array.from(element.querySelectorAll<HTMLElement>('.software-probe'));
    const s=motion.current;
    let w=element.offsetWidth,h=element.offsetHeight;
    const resize=new ResizeObserver(()=>{w=element.offsetWidth;h=element.offsetHeight;});resize.observe(element);
    const renderOrbit=()=>{
        const size=Math.min(1,w/260,h/260);
        let front=0,nearest=-Infinity;
        logos.forEach((logo,i)=>{
          const angle=s.angle+i*2*Math.PI/logos.length;
          const depth=Math.cos(angle),factor=(depth+1)/2;
          if(depth>nearest){nearest=depth;front=i;}
          logo.style.transform=`translate3d(${Math.sin(angle)*48*size}px,${-Math.sin(angle)*10*size}px,${depth*45*size}px) rotateY(${Math.sin(angle)*-18}deg) scale(${.62+factor*.42})`;
          logo.style.opacity=String(.22+factor*.78);
          logo.style.filter=`blur(${(1-factor)*2.5}px) brightness(${.5+factor*.6})`;
          logo.style.zIndex=String(Math.round(factor*100));
        });
      return front;
    };
    renderOrbit();
    const unsubscribe=subscribeProximity(pointer=>{
      const active=pointer.enabled && card.getAttribute('aria-hidden')==='false';
      if(!active && !s.x && !s.y && !s.glow && s.scale===1 && s.angle===0 && s.angularVelocity===0) return;
      // Invert the un-tilted carousel basis; the moving front never feeds its
      // transformed bounds back into the pointer calculation.
      const [o,a,b]=probes.map(p=>p.getBoundingClientRect());
      const ax=(a.x-o.x)/w,ay=(a.y-o.y)/w,bx=(b.x-o.x)/h,by=(b.y-o.y)/h;
      const det=ax*by-ay*bx;
      if(Math.abs(det)<.001)return;
      const px=pointer.x-o.x,py=pointer.y-o.y;
      const x=(px*by-py*bx)/det,y=(py*ax-px*ay)/det;
      const hover=active && x>=0 && x<=w && y>=0 && y<=h;
      const nx=hover?Math.max(-.5,Math.min(.5,x/w-.5)):0;
      const ny=hover?Math.max(-.5,Math.min(.5,y/h-.5)):0;
      return ()=>{
        s.x=damp(s.x,nx,.12);s.y=damp(s.y,ny,.12);
        s.scale=damp(s.scale,hover?1.05:1,.12);s.glow=damp(s.glow,hover?1:0,.12);
        block.style.transform=`rotateX(${-s.y*24}deg) rotateY(${s.x*24}deg) scale3d(${s.scale},${s.scale},${s.scale})`;
        if(emblem) emblem.style.transform=`translate3d(${s.x*10}px,${s.y*10}px,28px)`;
        const now=performance.now();
        const dt=lastFrame?Math.min(2,(now-lastFrame)/(1000/60)):1; lastFrame=now;
        const orbiting=hover && logos.length>1;
        if(orbiting){
          s.angularVelocity=damp(s.angularVelocity,.028,1-Math.pow(.88,dt));
          s.angle+=s.angularVelocity*dt;
        } else {
          s.angularVelocity=0;
          const target=Math.round(s.angle/(Math.PI*2))*Math.PI*2;
          s.angle=damp(s.angle,target,1-Math.pow(.91,dt));
          if(s.angle===target)s.angle=0;
        }
        const front=renderOrbit();
        labels.forEach((label,i)=>{label.style.opacity=i===front?'1':'0';});
        tint.forEach((value,i)=>{tint[i]=damp(value,rgb[front][i],.12);});
        element.style.setProperty('--brand-glow',`rgb(${tint.map(Math.round).join(',')})`);
        element.dataset.frontTool=tools[front].id;
        if(hover){element.style.setProperty('--light-x',`${x}px`);element.style.setProperty('--light-y',`${y}px`);}
        element.style.setProperty('--tile-light',String(s.glow));
        element.dataset.hover=String(hover);
        // The shared RAF sleeps once the pointer and return animation settle.
        return orbiting || s.angle!==0 || tint.some((v,i)=>Math.abs(v-rgb[front][i])>.01) || Math.abs(s.x-nx)>.001 || Math.abs(s.y-ny)>.001 || Math.abs(s.scale-(hover?1.05:1))>.001 || Math.abs(s.glow-(hover?1:0))>.001;
      };
    });
    return ()=>{unsubscribe();resize.disconnect();};
  },[tools]);
  return <div ref={root} className="software-perspective" style={{'--brand-glow':brands[software]} as React.CSSProperties}>
    <div className="software-ambient" aria-hidden="true"/>
    <div className="software-block">
      {[10,8,6,4,2].map(depth=><div key={depth} className="software-backplate" style={{transform:`translateZ(-${depth}px)`}} aria-hidden="true"/>)}
      <SoftwareIcon software={software} tools={tools}/>
    </div>
    <i className="software-probe probe-origin"/><i className="software-probe probe-x"/><i className="software-probe probe-y"/>
  </div>;
}
