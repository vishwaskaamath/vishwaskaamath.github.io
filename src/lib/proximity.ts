import { geometryMoving } from './geometryCache';
import { damp60 } from './masterTicker';
import { requestTick, cancelTick, getFrameDt } from '@/lib/masterTicker';
export type PointerFrame = { x: number; y: number; vx: number; vy: number; enabled: boolean };
type Reader = (frame: PointerFrame) => (() => boolean | void) | undefined;
const readers = new Set<Reader>();
let cleanup: (() => void) | undefined;

// One pointer sampler and RAF for all text and media; read geometry before writes.
export function subscribeProximity(reader: Reader) {
  readers.add(reader);
  if (!cleanup) {
    const motion = matchMedia('(prefers-reduced-motion: reduce)');
    const fine = matchMedia('(any-pointer: fine)');
    let x = -10000, y = -10000, lastX = x, lastY = y, vx = 0, vy = 0;
    let inside = false, raf = 0, until = 0, previous = 0;
    const tick = (now: number) => {
      const dt = getFrameDt()*1000;
      previous = now;
      vx = damp60(vx,Math.max(-40, Math.min(40, (x-lastX)*16.67/dt)),.25);
      vy = damp60(vy,Math.max(-40, Math.min(40, (y-lastY)*16.67/dt)),.25);
      if (Math.abs(vx) < 0.02) vx = 0;
      if (Math.abs(vy) < 0.02) vy = 0;
      lastX = x; lastY = y;
      const frame = { x, y, vx, vy, enabled: !geometryMoving && inside && fine.matches && !motion.matches && !document.hidden };
      const writes = Array.from(readers, (read) => read(frame));
      let settling = false;
      writes.forEach((write) => { settling = write?.() === true || settling; });
      raf = now < until || settling ? requestTick(tick) : 0;
    };
    const wake = () => { until = performance.now() + 1800; if (!raf) raf = requestTick(tick); };
    const move = (event: PointerEvent) => {
      if (event.pointerType === 'touch') { leave(); return; }
      if (!inside) { lastX = event.clientX; lastY = event.clientY; }
      x = event.clientX; y = event.clientY; inside = true; wake();
    };
    const leave = () => { inside = false; wake(); };
    window.addEventListener('pointermove', move, { passive: true });
    window.addEventListener('wheel', wake, { passive: true });
    window.addEventListener('keydown', wake);
    window.addEventListener('pointerdown', wake);
    window.addEventListener('resize', wake);
    window.addEventListener('blur', leave);
    document.documentElement.addEventListener('pointerleave', leave);
    document.addEventListener('visibilitychange', leave);
    motion.addEventListener('change', wake);
    cleanup = () => {
      cancelTick(raf);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('wheel', wake);
      window.removeEventListener('keydown', wake);
      window.removeEventListener('pointerdown', wake);
      window.removeEventListener('resize', wake);
      window.removeEventListener('blur', leave);
      document.documentElement.removeEventListener('pointerleave', leave);
      document.removeEventListener('visibilitychange', leave);
      motion.removeEventListener('change', wake);
    };
  }
  return () => { readers.delete(reader); if (!readers.size) { cleanup?.(); cleanup = undefined; } };
}

export const falloff = (distance: number, radius: number) => Math.max(0, 1 - distance / radius) ** 2;
export const damp = (value: number, target: number, factor: number) => damp60(value,target,factor);
