export const WHEEL_SENSITIVITY = 0.0018;
export const SCROLL_LERP = 0.1;
export const SNAP_IDLE_MS = 120;

export const modulo = (value: number, count: number) => ((value % count) + count) % count;

/** Signed circular distance; wrapping happens outside the visible reel window. */
export function reelOffset(index: number, scroll: number, count: number) {
  return modulo(index - scroll + count / 2, count) - count / 2;
}

export type ReelFrame = {
  currentScroll: number;
  targetScroll: number;
  scrollVelocity: number;
  index: number;
  deltaMs: number;
  settled: boolean;
};
type Listener = (frame: ReelFrame) => void;

/** One shared clock; subscribers mutate transforms before the same browser paint. */
export class ScrollPhysics {
  private dragging = false;
  private dirty = true;
  invalidate = () => { this.dirty = true; };
  currentScroll = 0;
  targetScroll = 0;
  private lastInput = -Infinity;
  private lastFrame: number | null = null;
  private listeners = new Set<Listener>();
  private frame: ReelFrame = {
    currentScroll: 0, targetScroll: 0, scrollVelocity: 0,
    index: 0, deltaMs: 1000 / 60, settled: true,
  };

  constructor(readonly count: number) {}

  read = () => this.frame;

  subscribe = (listener: Listener) => {
    this.listeners.add(listener);
    listener(this.frame);
    return () => { this.listeners.delete(listener); };
  };

  add(delta: number, now: number) {
    this.targetScroll += delta;
    this.lastInput = now;
  }

  beginDrag() { this.dragging = true; }

  endDrag(velocity: number, now: number) {
    this.dragging = false;
    this.targetScroll = Math.round(this.targetScroll - velocity * 0.018);
    this.lastInput = now;
  }

  wheel(deltaY: number, now: number) {
    // Every wheel event contributes, including input during snapping or reversal.
    this.add(-deltaY * WHEEL_SENSITIVITY, now);
  }

  select(index: number, now: number) {
    this.targetScroll = this.currentScroll + reelOffset(index, this.currentScroll, this.count);
    this.lastInput = now;
  }

  step(direction: number, now: number) {
    this.targetScroll = Math.round(this.targetScroll) + direction;
    this.lastInput = now;
  }

  advance(now: number, reducedMotion = false, frameDt?: number) {
    const dt = frameDt ?? (this.lastFrame !== null ? Math.min((now-this.lastFrame)/1000,.05) : 1/60);
    if (!this.dragging && now - this.lastInput >= SNAP_IDLE_MS) this.targetScroll = Math.round(this.targetScroll);
    const previousScroll = this.currentScroll;
    const wasSettled = this.frame.settled;
    this.currentScroll = reducedMotion && !this.dragging
      ? Math.round(this.targetScroll)
      : this.currentScroll + (this.targetScroll - this.currentScroll) * (1-Math.exp(-6.321630939469577*dt));
    if (Math.abs(this.targetScroll - this.currentScroll) < 0.00001) {
      this.currentScroll = this.targetScroll;
    }

    // Rebase BOTH coordinates by the same number of turns. Modulo on target alone
    // would reverse at the seam and discard rapid multi-revolution wheel input.
    const turns = Math.floor(this.currentScroll / this.count) * this.count;
    this.currentScroll -= turns;
    this.targetScroll -= turns;
    const velocity = this.targetScroll - this.currentScroll;
    this.frame = {
      currentScroll: this.currentScroll,
      targetScroll: this.targetScroll,
      scrollVelocity: reducedMotion ? 0 : velocity,
      index: modulo(Math.round(this.currentScroll), this.count),
      deltaMs: dt * 1000,
      settled: Math.abs(velocity) < 0.00001 && Number.isInteger(this.targetScroll),
    };
    this.lastFrame = now;
    if (this.dirty || !wasSettled || !this.frame.settled || previousScroll !== this.currentScroll) {
      this.dirty = false;
      this.listeners.forEach((listener) => listener(this.frame));
    }
    return this.frame;
  }
}
