import type { ReactNode,RefObject } from 'react';
export default function PolaroidScene({children,sceneRef,visible,snapshot,label}:{children:ReactNode;sceneRef:RefObject<HTMLDivElement|null>;visible:boolean;snapshot:boolean;label:string}){
 return <div ref={sceneRef} className="page-scene" data-visible={visible||snapshot} data-snapshot={snapshot} inert={!visible||snapshot} aria-hidden={!visible||snapshot}>
  <div className="photo-flight"><div className="polaroid-frame">
   <div className="photo-window"><div className="photo-live-page">{children}</div><div className="photo-gloss"/></div>
   <span className="photo-caption">{label} // SNAPSHOT</span>
   <span className="photo-clip" aria-hidden="true"><i/></span>
  </div></div>
 </div>;
}
