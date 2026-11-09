import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";
const { outputText } = ts.transpileModule(
  await readFile("src/lib/contourPulse.ts", "utf8"),
  {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ES2022,
    },
  },
);
const { spawnPulse, advancePulses } = await import(
  `data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`
);
const pulses = [];
for (let i = 0; i < 8; i++) spawnPulse(pulses, i, 100);
assert.equal(pulses.length, 5);
assert.equal(pulses[0].x, 3);
advancePulses(pulses, 275);
assert.equal(pulses[0].radius, 280);
assert.equal(pulses[0].alpha, 0.5);
assert.equal(pulses[0].x, 3);
assert.equal(pulses[0].y, 100);
advancePulses(pulses, 275);
assert.equal(pulses.length, 0);
console.log("PASS pulse cap, cubic easing, fade, fixed origin, 550ms expiry");
