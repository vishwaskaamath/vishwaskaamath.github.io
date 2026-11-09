import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";
const load = async (path) =>
  import(
    "data:text/javascript;base64," +
      Buffer.from(
        ts.transpileModule(await readFile(path, "utf8"), {
          compilerOptions: {
            target: ts.ScriptTarget.ES2022,
            module: ts.ModuleKind.ES2022,
          },
        }).outputText,
      ).toString("base64")
  );
const { ScrollPhysics } = await load("src/lib/scrollPhysics.ts");
const positions = [60, 120, 144, 240].map((hz) => {
  const e = new ScrollPhysics(5);
  e.beginDrag();
  e.add(2, 0);
  for (let i = 1; i <= hz; i++) e.advance((i * 1000) / hz, false, 1 / hz);
  return e.currentScroll;
});
positions.forEach((p) => assert.ok(Math.abs(p - positions[0]) < 1e-10));
let scheduled = new Map(),
  id = 0;
const listeners = {};
globalThis.document = {
  hidden: false,
  addEventListener: (name, cb) => (listeners[name] = cb),
};
globalThis.requestAnimationFrame = (cb) => {
  scheduled.set(++id, cb);
  return id;
};
globalThis.cancelAnimationFrame = (id) => scheduled.delete(id);
const ticker = await load("src/lib/masterTicker.ts");
let calls = 0;
const stops = Array.from({ length: 50 }, () =>
  ticker.subscribeTicker(() => calls++),
);
assert.equal(scheduled.size, 1);
for (let i = 1; i <= 20; i++) {
  const callbacks = [...scheduled.values()];
  scheduled.clear();
  callbacks.forEach((cb) => cb((i * 1000) / 240));
  assert.equal(scheduled.size, 1);
}
assert.equal(calls, 1000);
assert.ok(Math.abs(ticker.getFrameDt() - 1 / 240) < 1e-12);
document.hidden = true;
listeners.visibilitychange();
assert.equal(scheduled.size, 0);
document.hidden = false;
listeners.visibilitychange();
assert.equal(scheduled.size, 1);
stops.forEach((stop) => stop());
assert.equal(scheduled.size, 0);
console.log(
  "PASS identical 60/120/144/240Hz scroll physics; 50 subscribers use one RAF; hidden-tab suspension and cleanup",
);
