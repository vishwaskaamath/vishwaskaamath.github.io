import type { ReactNode,RefObject } from 'react';
export default function CaptureScene({children,sceneRef,captured,label}:{children:ReactNode;sceneRef:RefObject<HTMLDivElement|null>;captured:boolean;label:string}){
 return <div ref={sceneRef} className="capture-scene" data-captured={captured} inert={captured} aria-hidden={captured}>
  <div className="capture-photo"><div className="capture-window"><div className="capture-page">{children}</div><i className="capture-sheen"/></div><span className="capture-caption">{label==='WORK'?'01':'02'} // {label} SNAPSHOT</span></div>
 </div>;
}
