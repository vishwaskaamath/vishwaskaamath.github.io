"use client";
import { useEffect, useId, useRef } from 'react';
import { damp, falloff, subscribeProximity } from '@/lib/proximity';

export default function WarpedText({ children, className = '' }: { children: string; className?: string }) {
  const root = useRef<HTMLSpanElement>(null);
  const displacement = useRef<SVGFEDisplacementMapElement>(null);
  const id = `text-warp-${useId().replace(/:/g, '')}`;
  useEffect(() => {
    const element = root.current!;
    const cells = Array.from(element.querySelectorAll<HTMLElement>('.char-cell'));
    const chars = cells.map((cell) => cell.firstElementChild as HTMLElement);
    const state = chars.map(() => ({ strength: 0, x: 0, y: 0, skew: 0 }));
    let scale = 0, active = false;
    return subscribeProximity((pointer) => {
      const rect = element.getBoundingClientRect();
      const visible = rect.width > 0 && element.checkVisibility({ visibilityProperty: true });
      const nearby = pointer.enabled && visible && pointer.x > rect.left - 95 && pointer.x < rect.right + 95 && pointer.y > rect.top - 95 && pointer.y < rect.bottom + 95;
      if (!nearby && !active) return;
      const speed = Math.hypot(pointer.vx, pointer.vy);
      const dx = speed > 0.02 ? pointer.vx / speed : 0;
      const dy = speed > 0.02 ? pointer.vy / speed : 0;
      const strengths = cells.map((cell) => {
        if (!nearby) return 0;
        const box = cell.getBoundingClientRect();
        return falloff(Math.hypot(pointer.x - box.x - box.width / 2, pointer.y - box.y - box.height / 2), 95);
      });
      return () => {
        let peak = 0;
        let settling = false;
        active = false;
        state.forEach((s, i) => {
          const strength = strengths[i];
          s.strength = damp(s.strength, strength, 0.18);
          s.x = damp(s.x, dx * strength * 8, 0.18);
          s.y = damp(s.y, dy * strength * 8, 0.18);
          s.skew = damp(s.skew, Math.max(-16, Math.min(16, pointer.vx * strength * 0.6)), 0.18);
          settling ||= Math.abs(s.strength - strength) > 0.001 || Math.abs(s.x - dx * strength * 8) > 0.001 || Math.abs(s.y - dy * strength * 8) > 0.001;
          peak = Math.max(peak, s.strength);
          active ||= s.strength > 0 || Math.abs(s.x) + Math.abs(s.y) + Math.abs(s.skew) > 0;
          chars[i].style.transform = active || strength ? `translate3d(${s.x}px,${s.y}px,0) scale(${1 - s.strength * 0.12},${1 + s.strength * 0.32}) skewX(${s.skew}deg)` : '';
        });
        scale = damp(scale, 12 * peak * Math.min(1, speed / 8), 0.15);
        displacement.current?.setAttribute('scale', String(scale));
        element.style.filter = scale > 0.01 ? `url(#${id})` : '';
        active ||= scale > 0;
        return settling || scale > 0;
      };
    });
  }, [children, id]);
  return <span className={`warped-text ${className}`} aria-label={children}>
    <svg className="warp-definitions" aria-hidden="true"><defs>
      <filter id={id} x="-20%" y="-60%" width="140%" height="220%" colorInterpolationFilters="sRGB">
        <feTurbulence type="fractalNoise" baseFrequency="0.025 0.08" numOctaves="2" seed="7" result="noise" />
        <feDisplacementMap ref={displacement} in="SourceGraphic" in2="noise" scale="0" xChannelSelector="R" yChannelSelector="G" />
      </filter>
    </defs></svg>
    <span ref={root} className="warp-text-content" aria-hidden="true">{Array.from(children).map((char, i) => <span className="char-cell" key={i}><span className="char">{char === ' ' ? '\u00a0' : char}</span></span>)}</span>
  </span>;
}
