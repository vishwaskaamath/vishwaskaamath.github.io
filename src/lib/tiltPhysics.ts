/**
 * Spring physics for the 3D hover tilt on the reel's videos and software tiles.
 *
 * Each tilt axis is a damped spring (Hooke's law + viscous damping). It is
 * deliberately underdamped, so a tile overshoots a little and settles when the
 * cursor leaves or the reel stops, like a physical card on a hinge.
 */
export type Spring = { value: number; velocity: number };

export const TILT_STIFFNESS = 170;
export const TILT_DAMPING = 15;

export const spring = (): Spring => ({ value: 0, velocity: 0 });

/** Advances a spring towards `target`. Returns true once it is at rest. */
export function stepSpring(
  s: Spring,
  target: number,
  dt: number,
  stiffness = TILT_STIFFNESS,
  damping = TILT_DAMPING,
) {
  // Fixed sub-steps keep the spring stable and identical at 60–240 Hz.
  const steps = Math.max(1, Math.ceil(dt / (1 / 240)));
  const h = dt / steps;
  for (let i = 0; i < steps; i++) {
    s.velocity += (stiffness * (target - s.value) - damping * s.velocity) * h;
    s.value += s.velocity * h;
  }
  if (Math.abs(target - s.value) < 0.005 && Math.abs(s.velocity) < 0.01) {
    s.value = target;
    s.velocity = 0;
    return true;
  }
  return false;
}

/**
 * Pointer position in an item's own rotated frame, normalised so the item's
 * edges sit at -1 and 1 on each axis. Values outside that range miss the item.
 */
export function localPointer(
  px: number,
  py: number,
  cx: number,
  cy: number,
  halfWidth: number,
  halfHeight: number,
  rotationDeg: number,
) {
  const a = (-rotationDeg * Math.PI) / 180;
  const dx = px - cx,
    dy = py - cy;
  return {
    x: (dx * Math.cos(a) - dy * Math.sin(a)) / Math.max(1, halfWidth),
    y: (dx * Math.sin(a) + dy * Math.cos(a)) / Math.max(1, halfHeight),
  };
}
