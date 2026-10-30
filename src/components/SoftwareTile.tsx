"use client";
import { cachedBox,observeGeometry,geometryRevision } from "@/lib/geometryCache";
import { getFrameDt } from "@/lib/masterTicker";
import { useEffect, useRef } from 'react';
import { toolCatalog, type Software, type Tool } from '@/data/projects';
import { damp, subscribeProximity } from '@/lib/proximity';
import SoftwareCube3D from './SoftwareCube3D';

export default function SoftwareTile({software, tools = [toolCatalog[software]]}: {software: Software; tools?: Tool[]}) {
  const root = useRef<HTMLDivElement>(null);
  const motion = useRef({x:0,y:0,glow:0,angle:.35,velocity:0});
  useEffect(()=>{
    const stage=root.current!;
    const releaseGeometry=observeGeometry(stage);
    const card=stage.closest<HTMLElement>('[data-software]')!;
    const cubes=Array.from(stage.querySelectorAll<HTMLElement>('[data-orbit-cube]'));
    const probes=Array.from(stage.querySelectorAll<HTMLElement>('.software-probe'));
    const s=motion.current;
    let w=stage.offsetWidth,h=stage.offsetHeight,last=0;
    const render=()=>{
      const unit=w/320,multiple=cubes.length>1;
      cubes.forEach((cube,i)=>{
        const angle=s.angle+i*2*Math.PI/cubes.length;
        const depth=multiple?(Math.cos(angle)+1)/2:1;
        const x=multiple?Math.sin(angle)*68*unit:0;
        const y=multiple?-Math.sin(angle)*16*unit:0;
        const z=multiple?Math.cos(angle)*75*unit:0;
        cube.style.transform=`translate3d(${x}px,${y}px,${z}px) rotateX(${-s.y*24}deg) rotateY(${s.x*24+(multiple?Math.sin(angle)*-15:0)}deg) scale(${.68+depth*.32})`;
        cube.style.zIndex=String(Math.round(depth*100));
        cube.style.filter=`brightness(${.45+depth*.55}) blur(${(1-depth)*1.5}px)`;
        cube.style.opacity=String(.4+depth*.6);
        cube.style.setProperty('--tile-light',String(s.glow));
        cube.style.setProperty('--light-x',`${(s.x+.5)*100}%`);
        cube.style.setProperty('--light-y',`${(s.y+.5)*100}%`);
      });
    };
    render();
    const resize=new ResizeObserver(()=>{w=stage.offsetWidth;h=stage.offsetHeight;render();});resize.observe(stage);
    const unsubscribe=subscribeProximity(pointer=>{
      const active=pointer.enabled && !stage.closest('[inert]') && card.getAttribute('aria-hidden')==='false';
      if(!active && s.x===0 && s.y===0 && s.glow===0 && s.angle===.35)return;
      const [o,a,b]=probes.map(p=>cachedBox(p));
      const ax=(a.x-o.x)/w,ay=(a.y-o.y)/w,bx=(b.x-o.x)/h,by=(b.y-o.y)/h;
      const det=ax*by-ay*bx;if(Math.abs(det)<.001)return;
      const px=pointer.x-o.x,py=pointer.y-o.y;
      const x=(px*by-py*bx)/det,y=(py*ax-px*ay)/det;
      const hover=active && x>=0 && x<=w && y>=0 && y<=h;
      const nx=hover?Math.max(-.5,Math.min(.5,x/w-.5)):0,ny=hover?Math.max(-.5,Math.min(.5,y/h-.5)):0;
      return ()=>{
        const now=performance.now(),dt=getFrameDt()*60;last=now;
        s.x=damp(s.x,nx,.12);s.y=damp(s.y,ny,.12);s.glow=damp(s.glow,hover?1:0,.12);
        const orbiting=hover && cubes.length>1;
        if(orbiting){s.velocity=damp(s.velocity,.025,.12);s.angle+=s.velocity*dt;}
        else {
          s.velocity=0;
          const target=Math.round(s.angle/(Math.PI*2))*Math.PI*2+.35;
          s.angle=damp(s.angle,target,.09);
          if(s.angle===target)s.angle=.35;
        }
        render();stage.dataset.hover=String(hover);
        return orbiting || s.angle!==.35 || Math.abs(s.x-nx)>.001 || Math.abs(s.y-ny)>.001 || Math.abs(s.glow-(hover?1:0))>.001;
      };
    });
    return ()=>{releaseGeometry();unsubscribe();resize.disconnect();};
  },[tools]);
  return <div ref={root} className="software-orbit-stage">
    {tools.map(tool=><SoftwareCube3D key={tool.id} tool={tool}/>)}
    <i className="software-probe probe-origin"/><i className="software-probe probe-x"/><i className="software-probe probe-y"/>
  </div>;
}
