import type { CSSProperties } from 'react';
import type { Tool } from '@/data/projects';
import { SoftwareIcon } from './SoftwareIcon';

/** A complete independent slab, including its own rim, face, emblem and label. */
export default function SoftwareCube3D({tool}: {tool: Tool}) {
  return <div className="software-cube" data-orbit-cube={tool.id} style={{'--brand-glow':tool.color} as CSSProperties}>
    <div className="software-cube-body">
      {[10,8,6,4,2].map(depth=><div key={depth} className="software-backplate" style={{transform:`translateZ(-${depth}px)`}} aria-hidden="true"/>)}
      <SoftwareIcon software={tool.id}/>
    </div>
  </div>;
}
