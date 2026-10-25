export type Point = { x: number; y: number };
export type Cubic = [Point, Point, Point, Point];
const p = (x: number, y: number): Point => ({ x, y });

export function bezelGeometry(w: number, h: number) {
  const thickness = Math.max(8, Math.min(20, Math.min(w, h) * 0.022));
  const sx = thickness * 1.6, sy = thickness * 1.5;
  const cx = Math.min(w * 0.08, 105), cy = Math.min(h * 0.1, 85);
  const bow = thickness * 0.8;
  const curves: Cubic[] = [
    [p(cx, sy), p(w * 0.32, sy - bow), p(w * 0.68, sy - bow), p(w - cx, sy)],
    [p(w - cx, sy), p(w - cx * 0.42, sy + bow * 0.2), p(w - sx - bow * 0.2, cy * 0.42), p(w - sx, cy)],
    [p(w - sx, cy), p(w - sx + bow, h * 0.32), p(w - sx + bow, h * 0.68), p(w - sx, h - cy)],
    [p(w - sx, h - cy), p(w - sx - bow * 0.2, h - cy * 0.42), p(w - cx * 0.42, h - sy - bow * 0.2), p(w - cx, h - sy)],
    [p(w - cx, h - sy), p(w * 0.68, h - sy + bow), p(w * 0.32, h - sy + bow), p(cx, h - sy)],
    [p(cx, h - sy), p(cx * 0.42, h - sy - bow * 0.2), p(sx + bow * 0.2, h - cy * 0.42), p(sx, h - cy)],
    [p(sx, h - cy), p(sx - bow, h * 0.68), p(sx - bow, h * 0.32), p(sx, cy)],
    [p(sx, cy), p(sx + bow * 0.2, cy * 0.42), p(cx * 0.42, sy + bow * 0.2), p(cx, sy)],
  ];
  const path = `M ${cx} ${sy} ` + curves.map((c) => `C ${c.slice(1).map((v) => `${v.x} ${v.y}`).join(' ')}`).join(' ') + ' Z';
  return { curves, path, thickness };
}

export function cubicPoint(c: Cubic, t: number): Point {
  const u = 1 - t;
  return p(u ** 3 * c[0].x + 3 * u * u * t * c[1].x + 3 * u * t * t * c[2].x + t ** 3 * c[3].x,
    u ** 3 * c[0].y + 3 * u * u * t * c[1].y + 3 * u * t * t * c[2].y + t ** 3 * c[3].y);
}

// Cache coarse samples only at resize. Refine the nearest candidate on each cubic;
// this measures the actual barrel, including corners, rather than a bounding box.
export function createBoundaryProjector(curves: Cubic[]) {
  const samples = curves.map((c) => Array.from({ length: 25 }, (_, i) => cubicPoint(c, i / 24)));
  return (cursor: Point) => {
    let best = { x: 0, y: 0, distance: Infinity, nx: 0, ny: -1, edge: 0 };
    curves.forEach((curve, edge) => {
      let candidate = 0, squared = Infinity;
      samples[edge].forEach((point, i) => {
        const distance = (point.x - cursor.x) ** 2 + (point.y - cursor.y) ** 2;
        if (distance < squared) { squared = distance; candidate = i; }
      });
      let lo = Math.max(0, (candidate - 1) / 24), hi = Math.min(1, (candidate + 1) / 24);
      for (let i = 0; i < 16; i++) {
        const a = lo + (hi - lo) / 3, b = hi - (hi - lo) / 3;
        const pa = cubicPoint(curve, a), pb = cubicPoint(curve, b);
        if ((pa.x - cursor.x) ** 2 + (pa.y - cursor.y) ** 2 < (pb.x - cursor.x) ** 2 + (pb.y - cursor.y) ** 2) hi = b;
        else lo = a;
      }
      const t = (lo + hi) / 2, point = cubicPoint(curve, t);
      const distance = Math.hypot(point.x - cursor.x, point.y - cursor.y);
      if (distance < best.distance) {
        const a = cubicPoint(curve, Math.max(0, t - 0.001)), b = cubicPoint(curve, Math.min(1, t + 0.001));
        const length = Math.hypot(b.x - a.x, b.y - a.y) || 1;
        best = { ...point, distance, nx: (b.y - a.y) / length, ny: -(b.x - a.x) / length, edge };
      }
    });
    return best;
  };
}
