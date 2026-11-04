import type { CSSProperties } from 'react';
import type { Tool } from '@/data/projects';
import { SoftwareIcon } from './SoftwareIcon';

/** A complete independent slab, including its own rim, face, emblem and label. */
export default function SoftwareCube3D({tool}: {tool: Tool}) {
  return <div className={`software-cube software-cube-${tool.id}`} data-orbit-cube={tool.id} style={{'--brand-glow':tool.color} as CSSProperties}>
    <div className="software-cube-body">
      <SoftwareIcon software={tool.id}/>
    </div>
  </div>;
}
