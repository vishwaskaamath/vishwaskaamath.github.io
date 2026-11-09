import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";

const source = (await readFile("src/lib/assetPreloader.ts", "utf8"))
  .replace(
    /import \{ projects \}[^;]+;/,
    `const projects=[{video:'/a.mp4',poster:'/a.jpg',shortTitle:'A'},{video:'/slow.mp4',poster:'/b.jpg',shortTitle:'B'}];`,
  )
  .replace(
    /import \{ brandAssets \}[^;]+;/,
    `const brandAssets={figma:'/figma.svg',broken:'/bad.png'};`,
  )
  .replace(
    /import \{ requestTick \}[^;]+;/,
    "const requestTick=cb=>queueMicrotask(cb);",
  );
const code = ts.transpileModule(source, {
  compilerOptions: {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ES2022,
  },
}).outputText;

// A video that reaches loadeddata shortly after load(), except /slow.mp4,
// which never does (the per-asset timeout must carry it).
const loads = [];
class FakeVideo extends EventTarget {
  readyState = 0;
  error = null;
  attrs = {};
  getAttribute(name) {
    return this.attrs[name] ?? null;
  }
  set src(url) {
    this.attrs.src = url;
  }
  load() {
    const url = this.attrs.src;
    loads.push(url);
    if (url === "/slow.mp4") return;
    setTimeout(() => {
      this.readyState = 2;
      this.dispatchEvent(new Event("loadeddata"));
    }, 5);
  }
}
const events = [];
globalThis.document = {
  documentElement: { dataset: {} },
  fonts: { load: async () => [], ready: Promise.resolve() },
  querySelectorAll: () => [],
  querySelector: () => null,
  createElement: () => new FakeVideo(),
};
globalThis.getComputedStyle = () => ({ getPropertyValue: () => "" });
globalThis.window = {
  dispatchEvent: (e) => events.push(e.type),
  addEventListener() {},
};
globalThis.Image = class {
  decode() {
    return this.src === "/bad.png"
      ? Promise.reject(Error("decode"))
      : Promise.resolve();
  }
};

const api = await import(
  "data:text/javascript;base64," + Buffer.from(code).toString("base64")
);

assert.equal(api.assetsReady(), false);
assert.equal(api.cachedAsset("/a.jpg"), undefined);
const started = Date.now();
const run = api.preloadAssets();
assert.equal(api.preloadAssets(), run, "one run at a time");
// fonts + 2 reels + 2 stills + 2 logos, plus the warm-up step.
assert.equal(api.loaderState.total, 8);
assert.equal(api.loaderState.phase, "loading");
assert.match(api.loaderState.label, /\/\/ /);

await new Promise((r) => setTimeout(r, 200));
const mid = api.actualProgressRef.current;
assert.ok(mid > 0 && mid < 100, `progress moves with real loads (${mid})`);
assert.equal(
  api.loaderState.label,
  "LOADING // REEL_02.MP4",
  "label names the asset still loading",
);

await run;
const elapsed = Date.now() - started;
assert.ok(
  elapsed >= api.ASSET_TIMEOUT_MS - 50 && elapsed < api.ASSET_TIMEOUT_MS + 800,
  `a stuck file is released by its timeout (${elapsed} ms)`,
);
assert.deepEqual(loads.sort(), ["/a.mp4", "/slow.mp4"]);
assert.equal(api.actualProgressRef.current, 100);
assert.equal(api.loaderState.phase, "ready");
assert.equal(api.loaderState.label, "READY");
assert.equal(api.assetsReady(), true);
assert.equal(api.cachedAsset("/a.jpg"), "/a.jpg");
assert.ok(events.includes("portfolio-assets-ready"));
assert.equal(await api.settleWithin(new Promise(() => {}), 10), "timeout");
assert.equal(await api.settleWithin(Promise.reject(Error("x")), 10), "failed");

console.log(
  "PASS real asset queue: videos, stills, logos and fonts counted; failures and stuck files never block; ready event fires once at 100%",
);
