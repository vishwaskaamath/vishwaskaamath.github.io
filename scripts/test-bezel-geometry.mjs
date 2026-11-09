import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";
const source = await readFile(
  new URL("../src/lib/bezelGeometry.ts", import.meta.url),
  "utf8",
);
const { outputText } = ts.transpileModule(source, {
  compilerOptions: {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ES2022,
  },
});
const { bezelGeometry, cubicPoint, createBoundaryProjector } = await import(
  `data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`
);
for (const [w, h] of [
  [1280, 720],
  [2475, 1247],
  [390, 650],
  [1920, 500],
]) {
  const { curves } = bezelGeometry(w, h),
    project = createBoundaryProjector(curves);
  const dense = curves.flatMap((c) =>
    Array.from({ length: 2001 }, (_, i) => cubicPoint(c, i / 2000)),
  );
  for (let i = 0; i <= 8; i++)
    for (let j = 0; j <= 6; j++) {
      const mouse = { x: (w * i) / 8, y: (h * j) / 6 };
      const actual = project(mouse);
      const expected = dense.reduce(
        (best, p) => Math.min(best, Math.hypot(p.x - mouse.x, p.y - mouse.y)),
        Infinity,
      );
      assert.ok(
        Math.abs(actual.distance - expected) < 0.3,
        `projection error at ${w}x${h}: ${actual.distance - expected}`,
      );
      assert.ok(Number.isFinite(actual.nx + actual.ny));
    }
  for (const curve of curves)
    for (const t of [0, 0.25, 0.5, 0.75, 1]) {
      const point = cubicPoint(curve, t),
        hit = project(point);
      assert.ok(
        hit.distance < 0.1,
        "rim points must project back onto themselves",
      );
      assert.ok(
        (point.x - w / 2) * hit.nx + (point.y - h / 2) * hit.ny > 0,
        "particle normal must face outward",
      );
    }
  assert.ok(
    project({ x: w / 2, y: h / 2 }).distance > 150,
    "center must remain outside glow radius",
  );
  console.log(
    `PASS curved boundary projections and outward normals: ${w}x${h}`,
  );
}
