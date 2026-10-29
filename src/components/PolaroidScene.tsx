import type { ReactNode,RefObject } from 'react';
export default function PolaroidScene({children,sceneRef,visible,snapshot,label,retired=false}:{children:ReactNode;sceneRef:RefObject<HTMLDivElement|null>;visible:boolean;snapshot:boolean;label:string;retired?:boolean}){
 return <div ref={sceneRef} className="page-scene" data-visible={visible||snapshot} data-snapshot={snapshot} data-retired={retired} inert={!visible||snapshot} aria-hidden={!visible||snapshot}>
  <div className="photo-flight"><div className="polaroid-frame">
   <div className="photo-window"><div className="photo-live-page">{children}</div><div className="photo-gloss"/></div>
   <span className="photo-caption">{label==='WORK'?'01':'02'} // {label} SNAPSHOT</span>
   <svg className="photo-clip" aria-hidden="true" viewBox="0 0 48 62">
    <defs><linearGradient id={`clip-metal-${label}`}><stop stopColor="#151a20"/><stop offset=".35" stopColor="#b6bfc3"/><stop offset=".52" stopColor="#555e66"/><stop offset="1" stopColor="#101419"/></linearGradient></defs>
    <path d="M15 28V16C15 4 33 4 33 16V28" fill="none" stroke="#b3bdc2" strokeWidth="3"/>
    <path d="M10 27L6 52Q24 61 42 52L38 27Z" fill={`url(#clip-metal-${label})`} stroke="#a6adb0"/>
    <path d="M8 47Q24 54 40 47M12 31H36" fill="none" stroke="#d5dcda" strokeWidth="1.5"/>
    <path d="M17 28V16Q24 8 31 16V28" fill="none" stroke="#20262c" strokeWidth="2"/>
   </svg>
  </div></div>
 </div>;
}
