/**
 * Deterministic jagged paper edge (identical on server and client): points
 * [x%, depth] across the width, mostly small fibres with occasional deeper
 * rips. Depth is in the caller's unit (vh or px).
 */
export function tornEdge(seed: number, depth = 3.4) {
  let s = seed;
  const rand = () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
  const points: [number, number][] = [];
  const deep = depth * 0.53;
  for (let x = 0; x < 100; x += 1.4 + rand() * 3.2)
    points.push([
      x,
      rand() * depth + (rand() < 0.18 ? deep + rand() * deep * 0.9 : 0),
    ]);
  points.push([100, rand() * depth]);
  return points;
}

/** Clip for a sheet whose top edge is torn, `band` deep (`unit` as above). */
export function tornTopClip(
  edge: [number, number][],
  band: number,
  unit: string,
) {
  return `polygon(${edge
    .map(([x, j]) => `${x.toFixed(2)}% ${(band - j).toFixed(2)}${unit}`)
    .join(", ")}, 100% 100%, 0 100%)`;
}
