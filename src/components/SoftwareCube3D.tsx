"use client";
import { useId, type CSSProperties } from 'react';
import type { Tool } from '@/data/projects';

function Glyph({tool}: {tool:Tool}) {
  if(tool.id==='figma')return <g transform="translate(65 48) scale(.82)"><path d="M15 0h30a15 15 0 0 1 0 30H15a15 15 0 0 1 0-30ZM15 30h15v30H15a15 15 0 0 1 0-30ZM15 60h15v15a15 15 0 1 1-15-15Z"/><circle cx="45" cy="45" r="15"/></g>;
  if(tool.id==='jitter')return <path d="M62 59v39c0 23 14 35 34 35s34-14 34-35V59h-14v39c0 14-7 21-20 21s-20-7-20-21V59Z"/>;
  return <text x="95" y="123" textAnchor="middle" fontFamily="Arial,Helvetica,sans-serif" fontWeight="700" fontSize="92" letterSpacing="-5">{tool.short}</text>;
}

/** Every tool owns its own physical slab and eight-layer chiseled emblem. */
export default function SoftwareCube3D({tool}: {tool: Tool}) {
  const id=useId().replace(/:/g,'');
  const bevel=`chiseled-emblem-${id}`,metal=`emblem-metal-${id}`;
  return <div className="software-cube" data-orbit-cube={tool.id} style={{'--brand-glow':tool.color} as CSSProperties}>
    <div className="software-cube-body">
      {Array.from({length:18},(_,i)=>18-i).map(depth=><div key={depth} className="software-backplate" style={{transform:`translateZ(-${depth}px)`}} aria-hidden="true"/>)}
      <div className="metal-face" aria-hidden="true"/>
      <div className="chrome-lip" aria-hidden="true"/>
      <div className="prism-ring" aria-hidden="true"/>
      <div className="tile-spotlight" aria-hidden="true"/>
      {Array.from({length:8},(_,i)=>{
        const top=i===7;
        return <svg key={i} viewBox="0 0 190 190" className={`chiseled-glyph ${top?'glyph-face':'glyph-side'}`} style={{transform:`translateZ(${10+i*12/7}px)`}} aria-hidden="true">
          {top&&<defs>
            <linearGradient id={metal} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#eefbff"/><stop offset=".22" stopColor={tool.color}/><stop offset=".48" stopColor="#242534"/><stop offset=".7" stopColor={tool.color}/><stop offset="1" stopColor="#e4eafa"/>
            </linearGradient>
            <filter id={bevel} x="-20%" y="-20%" width="140%" height="140%" colorInterpolationFilters="sRGB">
              <feGaussianBlur in="SourceAlpha" stdDeviation="3.5" result="blur"/>
              <feSpecularLighting in="blur" surfaceScale="7" specularConstant="1.4" specularExponent="28" lightingColor="#ffffff" result="spec1"><fePointLight data-emblem-light="primary" x="80" y="60" z="110"/></feSpecularLighting>
              <feSpecularLighting in="blur" surfaceScale="6" specularConstant="1.1" specularExponent="18" lightingColor="#ff4ecd" result="spec2"><fePointLight data-emblem-light="secondary" x="220" y="240" z="70"/></feSpecularLighting>
              <feComposite in="spec1" in2="SourceAlpha" operator="in" result="spec1Out"/>
              <feComposite in="spec2" in2="SourceAlpha" operator="in" result="spec2Out"/>
              <feMerge><feMergeNode in="SourceGraphic"/><feMergeNode in="spec2Out"/><feMergeNode in="spec1Out"/></feMerge>
            </filter>
          </defs>}
          <g fill={top?`url(#${metal})`:undefined} filter={top?`url(#${bevel})`:undefined}><Glyph tool={tool}/></g>
        </svg>;
      })}
      <span className="metal-label">{tool.label}</span>
    </div>
  </div>;
}
