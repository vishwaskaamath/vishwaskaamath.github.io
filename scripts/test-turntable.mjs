import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";

const source = await readFile("src/lib/turntable.ts", "utf8");
const code = ts.transpileModule(source, {
  compilerOptions: {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ES2022,
  },
}).outputText;
const t = await import(
  "data:text/javascript;base64," + Buffer.from(code).toString("base64")
);
const near = (a, b, eps = 0.05) => Math.abs(a - b) < eps;
const dist = (deg) => {
  const tip = t.armTip(deg);
  return Math.hypot(tip.x - t.DECK.cx, tip.y - t.DECK.cy);
};

// Geometry: the stylus lands exactly on the outer groove, ends at the inner
// groove, and parks off the record.
assert.ok(near(dist(t.ARM_LEAD_IN), t.DECK.grooveOuter));
assert.ok(near(dist(t.ARM_RUN_OUT), t.DECK.grooveInner));
assert.ok(dist(t.ARM_REST) > t.DECK.platterR + 10, "rest is off the platter");
assert.ok(t.ARM_REST < t.ARM_LEAD_IN && t.ARM_LEAD_IN < t.ARM_RUN_OUT);
for (let i = 0; i < 10; i++)
  assert.ok(
    t.armAngleAt((i + 1) / 10) > t.armAngleAt(i / 10),
    "arm moves inwards",
  );

// Hand cueing: dropping the arm at an angle maps back to the same position.
for (const p of [0, 0.25, 0.5, 0.75, 0.99])
  assert.ok(
    near(t.progressAtAngle(t.armAngleAt(p)), p, 0.002),
    `round trip ${p}`,
  );
assert.equal(t.progressAtAngle(t.ARM_REST), 0);
assert.equal(t.progressAtAngle(t.ARM_RUN_OUT + 5), 0.999);

// Platter: ~0.8 s to reach full speed, ~1.2 s to coast to a stop at 60 Hz.
let speed = 0,
  frames = 0;
while (speed < 0.97) {
  speed = t.stepPlatter(speed, true, 1 / 60);
  frames++;
}
assert.ok(frames / 60 > 0.6 && frames / 60 < 1.1, `spin-up ${frames / 60}s`);
frames = 0;
speed = 1;
while (speed > 0) {
  speed = t.stepPlatter(speed, false, 1 / 60);
  frames++;
}
assert.ok(frames / 60 > 1 && frames / 60 < 1.4, `coast ${frames / 60}s`);

// Tonearm never swings faster than its cue mechanism allows.
let arm = 0;
for (let i = 0; i < 10; i++) {
  const next = t.stepArm(arm, 40, 1 / 60, 55);
  assert.ok(next - arm <= 55 / 60 + 1e-9);
  arm = next;
}
// Cue lift rises faster than it lowers.
const up = t.stepLift(0, 1, 0.1),
  down = 1 - t.stepLift(1, 0, 0.1);
assert.ok(up > down);

console.log(
  "PASS stylus geometry, hand-cue mapping, inward tracking, spin-up/coast timing, arm speed limit, cue lift",
);
