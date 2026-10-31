import {useId,useMemo,type ReactNode} from 'react';
import {bezelGeometry,type Cubic} from '@/lib/bezelGeometry';
import CrtRings from './CrtRings';

const pathOf=(curves:Cubic[])=>`M ${curves[0][0].x} ${curves[0][0].y} `+curves.map(c=>`C ${c.slice(1).map(p=>`${p.x} ${p.y}`).join(' ')}`).join(' ')+' Z';
export default function CinemaBezel({width,height,children}:{width:number;height:number;children:ReactNode}) {
 const id=`cinema-bezel-${useId().replace(/:/g,'')}`;
 const shape=useMemo(()=>{
  const template=bezelGeometry(1000,600);
  const scaled=(w:number,h:number)=>template.curves.map(c=>c.map(p=>({x:p.x*w/1000,y:p.y*h/600}))) as Cubic[];
  return {path:pathOf(scaled(width,height)),clip:pathOf(scaled(1,1)),floating:`translate(${width/2} ${height/2}) scale(${1+14.5/width} ${1+14.5/height}) translate(${-width/2} ${-height/2})`};
 },[width,height]);
 return <>
  <div className="cinema-aperture" style={{clipPath:`url(#${id})`}}>
   {children}<div className="crt-shading"/>
  </div>
  <svg className="video-rims cinema-rims" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" aria-hidden="true">
   <defs><clipPath id={id} clipPathUnits="objectBoundingBox"><path data-cinema-clip d={shape.clip}/></clipPath></defs>
   <CrtRings path={shape.path} floatingTransform={shape.floating}/>
  </svg>
 </>;
}
