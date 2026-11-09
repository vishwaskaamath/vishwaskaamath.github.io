export const clamp01 = (n: number) => Math.max(0, Math.min(1, n));
const smooth = (n: number) => {
  const t = clamp01(n);
  return t * t * (3 - 2 * t);
};
/** Unread terracotta -> orange frontier -> opaque read text. Reversible and continuous. */
export function wordRevealColor(
  index: number,
  count: number,
  progress: number,
) {
  const cursor = clamp01(progress) * (count + 6) - 3,
    d = index - cursor;
  const unread = [255, 85, 38, 0.34],
    active = [255, 77, 28, 1],
    read = [243, 239, 230, 1];
  const from = d >= 0 ? unread : active,
    to = d >= 0 ? active : read,
    t = d >= 0 ? smooth(1 - d / 1.5) : smooth(-d / 1.5);
  const c = from.map((v, i) => v + (to[i] - v) * t);
  return `rgba(${Math.round(c[0])}, ${Math.round(c[1])}, ${Math.round(c[2])}, ${c[3].toFixed(3)})`;
}
