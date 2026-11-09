import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";
const { outputText } = ts.transpileModule(
  await readFile("src/lib/taperedRibbon.ts", "utf8"),
  {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ES2022,
    },
  },
);
const { recordPoint, expireHistory, buildSmoothRibbon, drawRibbon } =
  await import(
    `data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`
  );
const h = [];
recordPoint(h, 0, 0, 0);
recordPoint(h, 7.99, 0, 1);
assert.equal(h.length, 1);
recordPoint(h, 8, 0, 2);
assert.equal(h.length, 2);
expireHistory(h, 181);
assert.equal(h.length, 1);
expireHistory(h, 183);
assert.equal(h.length, 0);
const pts = Array.from({ length: 12 }, (_, i) =>
  Object.freeze({
    x: 100 * Math.cos(i * 0.16),
    y: 100 * Math.sin(i * 0.16),
    time: 180 - i * 12,
  }),
);
const before = JSON.stringify(pts),
  samples = buildSmoothRibbon(pts, 180);
assert.equal(JSON.stringify(pts), before);
assert.equal(samples[0].x, pts[0].x);
for (const s of samples) {
  assert.ok(Number.isFinite(s.x + s.y + s.nx + s.ny + s.radius));
  assert.ok(Math.abs(Math.hypot(s.nx, s.ny) - 1) < 1e-8);
  assert.ok(s.radius >= 0 && s.radius <= 3.2);
}
for (let i = 1; i < pts.length - 1; i++) {
  const m = samples[i * 14];
  assert.ok(Math.abs(m.x - (pts[i - 1].x + pts[i].x) / 2) < 1e-8);
}
let paths = 0,
  fills = 0;
drawRibbon(
  {
    beginPath() {
      paths++;
    },
    moveTo() {},
    lineTo() {},
    arc() {},
    closePath() {},
    fill() {
      fills++;
    },
    stroke() {
      throw Error("No segment strokes allowed");
    },
  },
  samples,
);
assert.equal(paths, 1);
assert.equal(fills, 2);
console.log(
  "PASS 8px spacing, immutable samples, 180ms expiry, midpoint joins, finite unit normals, one path/two fills",
);
