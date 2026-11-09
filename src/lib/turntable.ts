/**
 * Turntable physics and geometry, shared by the audio engine and the deck
 * drawing. All lengths are in deck units (the SVG viewBox of the deck).
 */
export const DECK = {
  width: 340,
  height: 270,
  /** Platter / record centre. */
  cx: 135,
  cy: 135,
  platterR: 121,
  recordR: 114,
  /** First and last groove the needle travels between. */
  grooveOuter: 109,
  grooveInner: 52,
  labelR: 38,
  /** Tonearm pivot and effective length (pivot to stylus). */
  pivotX: 298,
  pivotY: 50,
  armLength: 205,
} as const;

/** 33⅓ rpm in degrees per second. */
export const PLATTER_DEG_PER_SEC = (100 / 3) * 6;

/** Tonearm angle (deg) when parked on its rest. 0 = pointing straight down. */
export const ARM_REST = 0;

/** Stylus position for a tonearm angle in degrees. */
export function armTip(angleDeg: number) {
  const a = (angleDeg * Math.PI) / 180;
  return {
    x: DECK.pivotX - DECK.armLength * Math.sin(a),
    y: DECK.pivotY + DECK.armLength * Math.cos(a),
  };
}

const tipDistance = (angleDeg: number) => {
  const tip = armTip(angleDeg);
  return Math.hypot(tip.x - DECK.cx, tip.y - DECK.cy);
};

/** Tonearm angle that puts the stylus `radius` units from the spindle. */
export function armAngleForRadius(radius: number) {
  // The stylus approaches the spindle monotonically between 0° and 60°.
  let lo = 0,
    hi = 60;
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    if (tipDistance(mid) > radius) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

export const ARM_LEAD_IN = armAngleForRadius(DECK.grooveOuter);
export const ARM_RUN_OUT = armAngleForRadius(DECK.grooveInner);

/** Tonearm angle for playback progress 0..1 (outer groove to inner groove). */
export function armAngleAt(progress: number) {
  const p = Math.max(0, Math.min(1, progress));
  return armAngleForRadius(
    DECK.grooveOuter - p * (DECK.grooveOuter - DECK.grooveInner),
  );
}

/** Playback progress 0..1 for a tonearm angle (inverse of armAngleAt). */
export function progressAtAngle(angleDeg: number) {
  const tip = armTip(angleDeg);
  const radius = Math.hypot(tip.x - DECK.cx, tip.y - DECK.cy);
  const p = (DECK.grooveOuter - radius) / (DECK.grooveOuter - DECK.grooveInner);
  return Math.max(0, Math.min(0.999, p));
}

/**
 * Platter speed as a fraction of 33⅓ rpm. The motor spins up exponentially
 * (about 0.8 s to full speed); without power the platter coasts down under
 * near-constant friction, so it decelerates linearly at `brake` per second.
 */
export function stepPlatter(
  speed: number,
  motorOn: boolean,
  dt: number,
  brake = 0.85,
) {
  if (motorOn) {
    const next = speed + (1 - speed) * (1 - Math.exp(-4.2 * dt));
    return next > 0.999 ? 1 : next;
  }
  return Math.max(0, speed - brake * dt);
}

/**
 * Tonearm swing when lifted: eases towards the target but never faster than
 * `maxDegPerSec`, like a cueing mechanism.
 */
export function stepArm(
  angle: number,
  target: number,
  dt: number,
  maxDegPerSec = 55,
) {
  const eased = angle + (target - angle) * (1 - Math.exp(-7 * dt));
  const limit = maxDegPerSec * dt;
  const next = angle + Math.max(-limit, Math.min(limit, eased - angle));
  return Math.abs(next - target) < 0.01 ? target : next;
}

/** Cue lift: rises quickly, lowers slowly like a damped hydraulic lift. */
export function stepLift(lift: number, target: number, dt: number) {
  const rate = target > lift ? 14 : 5.5;
  const next = lift + (target - lift) * (1 - Math.exp(-rate * dt));
  return Math.abs(next - target) < 0.002 ? target : next;
}
