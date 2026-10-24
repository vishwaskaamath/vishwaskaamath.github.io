import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";

const source = await readFile(new URL("../src/lib/scrollPhysics.ts", import.meta.url), "utf8");
const { outputText } = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 } });
const { ScrollPhysics, reelOffset, modulo } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`);
const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-8, `${a} should equal ${b}`);
let passed = 0;
const test = (label, run) => { run(); console.log(`PASS ${label}`); passed++; };

test("a rapid burst retains every event and starts moving on the first frame", () => {
  const reel = new ScrollPhysics(5);
  for (let i = 0; i < 100; i++) reel.wheel(100, i / 10);
  near(reel.targetScroll, 25);
  const frame = reel.advance(16);
  near(frame.currentScroll, 2.5);
  near(frame.scrollVelocity, 22.5);
});

test("snapping begins at 120ms, with no input lock during the snap", () => {
  const reel = new ScrollPhysics(5);
  reel.wheel(300, 0);
  near(reel.advance(119).targetScroll, 0.75);
  near(reel.advance(120).targetScroll, 1);
  reel.wheel(-200, 121);
  near(reel.targetScroll, 0.5);
  near(reel.advance(122).targetScroll, 0.5);
  near(reel.advance(240).targetScroll, 0.5);
  near(reel.advance(241).targetScroll, 1);
});

test("rapid reversal changes direction immediately, including across zero", () => {
  const reel = new ScrollPhysics(5);
  reel.wheel(800, 0);
  reel.advance(16);
  reel.wheel(-1600, 17);
  const reverse = reel.advance(32);
  assert.ok(reverse.scrollVelocity < 0);
  near(reverse.currentScroll, 4.98);
  near(reverse.targetScroll, 3);
});

test("large positive and negative flings preserve turns and settle correctly", () => {
  for (const delta of [123456, -123456]) {
    const reel = new ScrollPhysics(5);
    reel.wheel(delta, 0);
    let priorVelocity = Infinity;
    for (let t = 120; t < 5000; t += 16) {
      const frame = reel.advance(t);
      assert.ok(frame.currentScroll >= 0 && frame.currentScroll < 5);
      assert.ok(Math.abs(frame.scrollVelocity) <= priorVelocity);
      priorVelocity = Math.abs(frame.scrollVelocity);
    }
    assert.equal(reel.read().settled, true);
    near(reel.read().index, modulo(Math.round(delta * 0.0025), 5));
  }
});

test("all columns get the identical fractional position in the same tick", () => {
  const reel = new ScrollPhysics(5);
  const columns = [[], [], []];
  const remove = columns.map((samples) => reel.subscribe((frame) => samples.push(frame)));
  reel.wheel(300, 0);
  for (let t = 16; t <= 96; t += 16) reel.advance(t);
  columns[0].forEach((frame, i) => {
    assert.strictEqual(frame, columns[1][i]);
    assert.strictEqual(frame, columns[2][i]);
  });
  remove.forEach((unsubscribe) => unsubscribe());
  reel.advance(112);
  assert.equal(columns[0].length, 7);
});

test("outgoing and incoming slots stay adjacent through every circular seam", () => {
  for (let scroll = -10; scroll < 15; scroll += 0.03125) {
    const base = Math.floor(scroll);
    const fraction = scroll - base;
    near(reelOffset(modulo(base, 5), scroll, 5), -fraction);
    near(reelOffset(modulo(base + 1, 5), scroll, 5), 1 - fraction);
  }
});

test("dot selection takes the nearest circular path and keyboard repeats queue freely", () => {
  const reel = new ScrollPhysics(5);
  reel.select(4, 0);
  near(reel.targetScroll, -1);
  for (let i = 0; i < 12; i++) reel.step(1, i);
  near(reel.targetScroll, 11);
  const frame = reel.advance(16, true);
  near(frame.currentScroll, 1);
  near(frame.scrollVelocity, 0);
});

console.log(`${passed} scroll regression checks passed.`);
