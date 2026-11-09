/** The only native animation-frame owner. Jobs scheduled during a pass run next frame. */
type Update = (now: number, dt: number) => void;
const jobs = new Map<number, Update>();
let nextId = 0,
  raf = 0,
  lastTime = 0,
  frameDt = 1 / 60,
  installed = false;
export const tickerStats = { frames: 0, lastMs: 0, maxMs: 0, dt: 1 / 60 };
export const getFrameDt = () => frameDt;
export const damp = (
  current: number,
  target: number,
  lambda: number,
  dt: number,
) => current + (target - current) * (1 - Math.exp(-lambda * dt));
export const damp60 = (
  current: number,
  target: number,
  factor: number,
  dt = frameDt,
) =>
  Math.abs(target - current) < 0.001
    ? target
    : damp(current, target, -Math.log(1 - factor) * 60, dt);
function ensure() {
  if (!installed) {
    installed = true;
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        cancelAnimationFrame(raf);
        raf = 0;
        lastTime = 0;
      } else ensure();
    });
  }
  if (!raf && jobs.size && !document.hidden) raf = requestAnimationFrame(tick);
}
function tick(now: number) {
  raf = 0;
  frameDt = Math.min(lastTime ? (now - lastTime) / 1000 : 1 / 60, 0.05);
  lastTime = now;
  const batch = Array.from(jobs.entries()),
    start = performance.now();
  for (const [id, update] of batch) {
    if (!jobs.delete(id)) continue;
    try {
      update(now, frameDt);
    } catch (error) {
      console.error("Animation update failed", error);
    }
  }
  tickerStats.frames++;
  tickerStats.dt = frameDt;
  tickerStats.lastMs = performance.now() - start;
  tickerStats.maxMs = Math.max(tickerStats.maxMs, tickerStats.lastMs);
  ensure();
}
export function requestTick(update: Update) {
  const id = ++nextId;
  jobs.set(id, update);
  ensure();
  return id;
}
export function cancelTick(id: number) {
  jobs.delete(id);
  if (!jobs.size) {
    cancelAnimationFrame(raf);
    raf = 0;
    lastTime = 0;
  }
}
export function subscribeTicker(update: Update) {
  let id = 0,
    live = true;
  const run: Update = (now, dt) => {
    if (!live) return;
    try {
      update(now, dt);
    } finally {
      if (live) id = requestTick(run);
    }
  };
  id = requestTick(run);
  return () => {
    live = false;
    cancelTick(id);
  };
}
