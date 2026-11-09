import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";

const source = await readFile("src/lib/tiltPhysics.ts", "utf8");
const code = ts.transpileModule(source, {
  compilerOptions: {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ES2022,
  },
}).outputText;
const { spring, stepSpring, localPointer } = await import(
  "data:text/javascript;base64," + Buffer.from(code).toString("base64")
);

// Springs reach their target, overshoot a little on the way, and come to rest.
for (const hz of [60, 144, 240]) {
  const s = spring();
  let peak = 0,
    rested = false,
    frames = 0;
  while (!rested && frames < hz * 5) {
    rested = stepSpring(s, 10, 1 / hz);
    peak = Math.max(peak, s.value);
    frames++;
  }
  assert.ok(rested, `settles at ${hz} Hz`);
  assert.equal(s.value, 10);
  assert.ok(peak > 10.2 && peak < 13, `small overshoot at ${hz} Hz: ${peak}`);
  assert.ok(frames / hz < 1.5, `settles within 1.5s at ${hz} Hz`);
}

// Pointer mapping: edges land on ±1 and rotation is undone.
let p = localPointer(150, 100, 100, 100, 50, 20, 0);
assert.ok(Math.abs(p.x - 1) < 1e-9 && Math.abs(p.y) < 1e-9);
p = localPointer(100, 150, 100, 100, 50, 50, 90);
assert.ok(Math.abs(p.x - 1) < 1e-9 && Math.abs(p.y) < 1e-9);
p = localPointer(100, 100, 100, 100, 50, 50, 25);
assert.equal(p.x, 0);

console.log(
  "PASS tilt springs settle with slight overshoot at 60/144/240 Hz, pointer mapping undoes rotation",
);
