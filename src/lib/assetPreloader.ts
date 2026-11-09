import { projects } from "@/data/projects";
import { brandAssets } from "@/data/brandAssets";
import { requestTick } from "./masterTicker";

/**
 * Real asset preloader for the intro. It tracks the things the first screen
 * actually shows: every project preview (the real wheel <video> elements,
 * forced to load until they have a first frame), every poster still, the
 * official software logos (decoded in memory) and the web fonts. Each asset
 * races a timeout, so one slow file can never freeze the loader at 99%.
 * Progress is simply finished assets / all assets.
 */
export const ASSET_TIMEOUT_MS = 3000;
const WORKERS = 6;

type Task = { label: string; run: () => Promise<unknown> };

export const loaderState = {
  phase: "idle" as "idle" | "loading" | "warming" | "ready",
  loaded: 0,
  total: 0,
  /** What is loading right now, e.g. "LOADING // REEL_03.MP4". */
  label: "STANDBY",
};
/** Real progress, 0-100. */
export const actualProgressRef = { current: 0 };

let running: Promise<void> | null = null,
  ready = false;
export const assetsReady = () => ready;
/** Media is served straight from its URL; the browser cache holds it. */
export const assetUrl = (url: string) => url;
/** Source for markup rendered before the intro finishes (none until ready). */
export const cachedAsset = (url: string) => (ready ? url : undefined);

/** Resolves when `work` settles or after `ms`, whichever comes first. */
export function settleWithin(work: Promise<unknown>, ms = ASSET_TIMEOUT_MS) {
  let timer: ReturnType<typeof setTimeout>;
  return Promise.race([
    work.then(
      () => "loaded" as const,
      () => "failed" as const,
    ),
    new Promise<"timeout">((resolve) => {
      timer = setTimeout(() => resolve("timeout"), ms);
    }),
  ]).finally(() => clearTimeout(timer));
}

const two = (n: number) => String(n + 1).padStart(2, "0");

/** The wheel's own preview element for a project, or a detached one. */
function loadVideo(url: string, title: string) {
  const video =
    Array.from(document.querySelectorAll("video")).find(
      (v) => v.getAttribute("aria-label") === `${title} preview`,
    ) ?? document.createElement("video");
  return new Promise<void>((resolve, reject) => {
    if (video.readyState >= 2 && video.getAttribute("src") === url)
      return resolve();
    const cleanup = () => {
      video.removeEventListener("loadeddata", done);
      video.removeEventListener("canplay", done);
      video.removeEventListener("error", fail);
    };
    const done = () => {
      cleanup();
      resolve();
    };
    const fail = () => {
      cleanup();
      reject(video.error ?? Error(url));
    };
    video.addEventListener("loadeddata", done);
    video.addEventListener("canplay", done);
    video.addEventListener("error", fail);
    video.muted = true;
    video.preload = "auto";
    if (video.getAttribute("src") !== url) video.src = url;
    video.load();
  });
}

function decodeImage(url: string) {
  const image = new Image();
  image.decoding = "async";
  image.src = url;
  return image.decode();
}

async function fonts() {
  const css = getComputedStyle(document.documentElement);
  const names = [
    '"Bebas Neue"',
    css.getPropertyValue("--font-tanker").split(",")[0].trim(),
    css.getPropertyValue("--font-pally").split(",")[0].trim(),
  ].filter(Boolean);
  await Promise.all(names.map((name) => document.fonts.load(`1em ${name}`)));
  await document.fonts.ready;
}

/** Black-and-white poster used by the About film strip (scripts/make-mono-posters). */
export const monoPoster = (poster: string) =>
  poster.replace("/media/", "/media/mono/");

function tasks(): Task[] {
  return [
    { label: "LOADING // TYPEFACES", run: fonts },
    ...projects.map((project, i) => ({
      label: `LOADING // REEL_${two(i)}.MP4`,
      run: () => loadVideo(project.video, project.shortTitle),
    })),
    ...projects.map((project, i) => ({
      label: `LOADING // STILL_${two(i)}.JPG`,
      run: () => decodeImage(project.poster),
    })),
    ...projects.map((project, i) => ({
      label: `LOADING // FILM_${two(i)}.JPG`,
      run: () => decodeImage(monoPoster(project.poster)),
    })),
    ...Object.values(brandAssets).map((url) => ({
      label: "DECODING // SHADERS & LOGOS",
      run: () => decodeImage(url),
    })),
  ];
}

const frame = () =>
  new Promise<void>((resolve) => requestTick(() => resolve()));

/** Rasterise filters and lenses once beneath the opaque loader. */
async function warmup() {
  document.documentElement.dataset.warming = "true";
  const filters = Array.from(
    document.querySelectorAll<SVGFEDisplacementMapElement>("feDisplacementMap"),
  );
  const old = filters.map((f) => f.getAttribute("scale"));
  filters.forEach((f) => f.setAttribute("scale", "1"));
  const titles = Array.from(
    document.querySelectorAll<HTMLElement>(".project-metadata .title-slot"),
  );
  const previous = titles.map((t) => t.style.filter);
  const titleFilter = document.querySelector(".project-metadata filter")?.id;
  if (titleFilter)
    titles.forEach((t) => (t.style.filter = `url(#${titleFilter})`));
  // Keep renderable content beneath the opaque loader: display:none/opacity:0 can skip rasterization.
  const lenses = Array.from(
    document.querySelectorAll<HTMLElement>(".liquid-surface"),
  );
  const lensStyles = lenses.map((lens) => {
    const content = lens.querySelector<HTMLElement>(".liquid-content");
    const filter = lens.querySelector("filter");
    const prior = content?.style.filter ?? "";
    if (content && filter) content.style.filter = `url(#${filter.id})`;
    return { content, prior };
  });
  const flares = Array.from(
    document.querySelectorAll<SVGElement>(".video-rim-flare"),
  );
  const flareStyles = flares.map((flare) => flare.style.cssText);
  flares.forEach((flare) => {
    flare.style.display = "";
    flare.style.opacity = "0.001";
  });
  window.dispatchEvent(new Event("portfolio-warmup"));
  try {
    await frame();
    await frame();
  } finally {
    filters.forEach((f, i) => f.setAttribute("scale", old[i] ?? "0"));
    titles.forEach((t, i) => (t.style.filter = previous[i]));
    lensStyles.forEach(({ content, prior }) => {
      if (content) content.style.filter = prior;
    });
    flares.forEach((flare, i) => {
      flare.style.cssText = flareStyles[i];
    });
    delete document.documentElement.dataset.warming;
  }
}

export function preloadAssets() {
  if (ready) return Promise.resolve();
  if (running) return running;
  running = (async () => {
    const queue = tasks();
    const done = queue.map(() => false);
    // One extra step for the graphics warm-up after the files.
    loaderState.total = queue.length + 1;
    loaderState.loaded = 0;
    loaderState.phase = "loading";
    const update = () => {
      actualProgressRef.current =
        (loaderState.loaded / loaderState.total) * 100;
      const next = done.indexOf(false);
      if (next >= 0) loaderState.label = queue[next].label;
    };
    update();
    let cursor = 0;
    const worker = async () => {
      while (cursor < queue.length) {
        const i = cursor++;
        let work: Promise<unknown>;
        try {
          work = queue[i].run();
        } catch (error) {
          work = Promise.reject(error);
        }
        await settleWithin(work);
        done[i] = true;
        loaderState.loaded++;
        update();
      }
    };
    await Promise.all(Array.from({ length: WORKERS }, worker));
    loaderState.phase = "warming";
    loaderState.label = "DECODING // SHADERS & LOGOS";
    await settleWithin(warmup());
    loaderState.loaded = loaderState.total;
    actualProgressRef.current = 100;
    loaderState.phase = "ready";
    loaderState.label = "READY";
    ready = true;
    window.dispatchEvent(new Event("portfolio-assets-ready"));
  })().finally(() => {
    running = null;
  });
  return running;
}
