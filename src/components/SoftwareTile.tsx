"use client";

import { useEffect, useRef } from 'react';
import { toolCatalog, type Software, type Tool } from '@/data/projects';
import { subscribeTicker, damp } from '@/lib/masterTicker';
import SoftwareCube3D from './SoftwareCube3D';

const RESTING_PHASE = -0.55;

export default function SoftwareTile({
  software,
  tools = [toolCatalog[software]],
}: { software: Software; tools?: Tool[] }) {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const cubes = Array.from(el.querySelectorAll<HTMLElement>('[data-orbit-cube]'));
    const count = cubes.length;
    let mouseX = -10000;
    let mouseY = -10000;
    let blend = 0;
    let phase = RESTING_PHASE;
    let tiltX = 0;
    let tiltY = 0;

    const move = (event: PointerEvent) => {
      mouseX = event.clientX;
      mouseY = event.clientY;
    };
    const leave = () => {
      mouseX = -10000;
      mouseY = -10000;
    };
    window.addEventListener('pointermove', move, { passive: true });
    window.addEventListener('blur', leave);

    const stop = subscribeTicker((_now, dt) => {
      if (document.hidden || el.closest('[inert]')) return;
      const active = el.closest('[data-software]')?.getAttribute('aria-hidden') === 'false';
      let dx = 0;
      let dy = 0;
      let hovering = false;
      if (active) {
        const rect = el.getBoundingClientRect();
        dx = mouseX - (rect.left + rect.width / 2);
        dy = mouseY - (rect.top + rect.height / 2);
        hovering = Math.hypot(dx, dy) < 120;
      }

      // The phase is parked whenever the cursor leaves the active logo group.
      // Damping is time-correct so the same hover gesture feels consistent at 60–240 Hz.
      blend = damp(blend, hovering ? 1 : 0, 3.7, dt);
      if (hovering && count > 1) phase += dt * .85 * blend;
      else phase = damp(phase, RESTING_PHASE, 3.7, dt);
      tiltX = damp(tiltX, hovering ? -dy / 120 * 16 : 0, 10, dt);
      tiltY = damp(tiltY, hovering ? dx / 120 * 16 : 0, 10, dt);

      cubes.forEach((cube, index) => {
        if (count === 1) {
          cube.style.transform = `translate3d(0,0,0) rotateX(${tiltX}deg) rotateY(${tiltY}deg)`;
          cube.style.zIndex = '30';
          cube.style.filter = 'none';
        } else {
          const angle = phase + index * Math.PI * 2 / count;
          const depth = Math.cos(angle);
          const depthNorm = (depth + 1) * .5;
          const x = Math.sin(angle) * 24;
          const y = -depth * 5;
          const scale = .82 + .18 * depthNorm;
          cube.style.transform = `translate3d(${x}px,${y}px,0) scale(${scale}) rotateZ(${Math.sin(angle) * 5}deg)`;
          cube.style.zIndex = String(Math.round(50 + depth * 30));
          cube.style.opacity = String(.45 + .55 * depthNorm);
          cube.style.filter = `brightness(${.65 + .35 * depthNorm})`;
        }
        cube.style.setProperty('--tile-light', String(blend));
        cube.style.setProperty('--light-x', `${50 + Math.max(-1, Math.min(1, dx / 120)) * 50}%`);
        cube.style.setProperty('--light-y', `${50 + Math.max(-1, Math.min(1, dy / 120)) * 50}%`);
      });
    });
    return () => {
      stop();
      window.removeEventListener('pointermove', move);
      window.removeEventListener('blur', leave);
    };
  }, [tools]);

  return <div ref={root} className="software-orbit-stage" data-multi={tools.length > 1}>
    {tools.map(tool => <SoftwareCube3D key={tool.id} tool={tool} />)}
  </div>;
}
