"use client";
import { useEffect, useRef } from "react";
import { subscribeTicker } from "@/lib/masterTicker";
import type { ScrollPhysics } from "@/lib/scrollPhysics";

/**
 * Ink-on-paper line fields for the cream chapters:
 * - "flow":   engraved fabric lines behind "This is my thing".
 * - "ripple": wobbly sound-wave rings radiating out of "Let's talk".
 *
 * Performance: the line art is built once per resize as static SVG layers.
 * Nothing is re-drawn while scrolling; layers only move by GPU-composited
 * transforms: a scroll parallax written from the shared ticker, plus CSS
 * sway / breathing / expanding-wave animations that pause whenever the
 * section is off screen.
 */

/** Room around the section so parallax and sway never expose an edge. */
const PAD = 140;

const f = (n: number) => n.toFixed(1);

/** Smooth open or closed curve through points (quadratic via midpoints). */
function curve(xs: number[], ys: number[], closed = false) {
  const n = xs.length;
  let d = "";
  if (closed) {
    d = `M${f((xs[n - 1] + xs[0]) / 2)} ${f((ys[n - 1] + ys[0]) / 2)}`;
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      d += `Q${f(xs[i])} ${f(ys[i])} ${f((xs[i] + xs[j]) / 2)} ${f((ys[i] + ys[j]) / 2)}`;
    }
    return d + "Z";
  }
  d = `M${f(xs[0])} ${f(ys[0])}`;
  for (let i = 1; i < n - 1; i++)
    d += `Q${f(xs[i])} ${f(ys[i])} ${f((xs[i] + xs[i + 1]) / 2)} ${f((ys[i] + ys[i + 1]) / 2)}`;
  return d + `L${f(xs[n - 1])} ${f(ys[n - 1])}`;
}

const svg = (w: number, h: number, body: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${Math.round(w)}" height="${Math.round(h)}" viewBox="0 0 ${Math.round(w)} ${Math.round(h)}" fill="none" stroke-linecap="round">${body}</svg>`;

const INK = [
  [0.08, 1],
  [0.13, 1.15],
  [0.19, 1.3],
  [0.26, 1.45],
];

function buildFlow(width: number, height: number) {
  const w = width + PAD * 2,
    h = height + PAD * 2;
  const spacing = 22,
    step = 30,
    amp = 16;
  const ink = INK.map(() => ""),
    accent: string[] = [];
  for (let row = 0, y0 = spacing / 2; y0 < h; row++, y0 += spacing) {
    const xs: number[] = [],
      ys: number[] = [];
    for (let x = -step; x <= w + step; x += step) {
      xs.push(x);
      ys.push(
        y0 +
          amp *
            (Math.sin(x * 0.0042 + y0 * 0.011) * 0.65 +
              Math.sin(x * 0.0113 + y0 * 0.027) * 0.28 +
              Math.sin((x + y0 * 1.7) * 0.0021) * 0.9),
      );
    }
    const d = curve(xs, ys);
    if (row % 6 === 3) accent.push(d);
    else {
      const shade = 0.5 + 0.5 * Math.sin(y0 * 0.018);
      ink[Math.min(INK.length - 1, Math.floor(shade * INK.length))] += d;
    }
  }
  return [
    svg(
      w,
      h,
      ink
        .map(
          (d, i) =>
            `<path d="${d}" stroke="rgba(17,17,19,${INK[i][0]})" stroke-width="${INK[i][1]}"/>`,
        )
        .join(""),
    ),
    svg(
      w,
      h,
      `<path d="${accent.join("")}" stroke="rgba(255,77,28,0.34)" stroke-width="1.5"/>`,
    ),
  ];
}

/** One wobbly elliptical ring around (cx, cy). */
function ring(cx: number, cy: number, r: number, n: number) {
  const xs: number[] = [],
    ys: number[] = [];
  const wobble = Math.min(1, r / 90);
  for (let i = 0; i < 64; i++) {
    const a = (i / 64) * Math.PI * 2;
    const sa = a + r * 0.0045;
    const rr =
      r +
      wobble *
        (Math.sin(sa * 3 + n * 0.45) * 5 + Math.sin(sa * 7 + n * 0.2) * 2.5);
    xs.push(cx + Math.cos(a) * rr * 1.55);
    ys.push(cy + Math.sin(a) * rr);
  }
  return curve(xs, ys, true);
}

function buildRipple(width: number, height: number, cx0: number, cy0: number) {
  const w = width + PAD * 2,
    h = height + PAD * 2,
    cx = cx0 + PAD,
    cy = cy0 + PAD;
  const spacing = 46;
  const maxR =
    Math.hypot(Math.max(cx, w - cx) / 1.55, Math.max(cy, h - cy)) + spacing;
  // Two ring bands that breathe out of phase, so the field twists slightly.
  const bands = ["", ""],
    accents = ["", ""];
  for (let n = 1, r = spacing; r < maxR; n++, r += spacing) {
    const band = r < maxR * 0.42 ? 0 : 1;
    const d = ring(cx, cy, r, n);
    if (n % 4 === 0) accents[band] += d;
    else bands[band] += d;
  }
  const layer = (i: number) =>
    svg(
      w,
      h,
      `<path d="${bands[i]}" stroke="rgba(17,17,19,0.17)" stroke-width="1.15"/>` +
        `<path d="${accents[i]}" stroke="rgba(255,77,28,0.32)" stroke-width="1.5"/>`,
    );
  const wave = svg(
    w,
    h,
    `<path d="${ring(cx, cy, maxR * 0.9, 7)}" stroke="rgba(255,77,28,0.55)" stroke-width="1.6"/>`,
  );
  return {
    layers: [layer(0), layer(1)],
    wave,
    origin: `${f(cx)}px ${f(cy)}px`,
  };
}

export default function CreamField({
  engine,
  variant,
}: {
  engine: ScrollPhysics;
  variant: "flow" | "ripple";
}) {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current!;
    const section = host.parentElement as HTMLElement;
    const stage = section.closest<HTMLElement>(".story-stage");
    if (!stage) return;
    let layers: { el: HTMLElement; rate: number }[] = [],
      sectionY = 0,
      height = 1,
      builtFor = "",
      lastKey = "",
      lastView = "";

    const offsetWithin = (node: HTMLElement, root: HTMLElement) => {
      let x = 0,
        y = 0,
        el: HTMLElement | null = node;
      while (el && el !== root) {
        x += el.offsetLeft;
        y += el.offsetTop;
        el = el.offsetParent as HTMLElement | null;
      }
      return { x, y };
    };

    const build = () => {
      const width = section.offsetWidth;
      height = section.offsetHeight || 1;
      if (!width) return;
      sectionY = offsetWithin(section, stage).y;
      const heading = section.querySelector<HTMLElement>("h2");
      let cx = width / 2,
        cy = height / 2;
      if (heading) {
        const at = offsetWithin(heading, section);
        cx = at.x + heading.offsetWidth / 2;
        cy = at.y + heading.offsetHeight / 2;
      }
      const signature = `${width}|${height}|${Math.round(cx)}|${Math.round(cy)}`;
      lastKey = "";
      if (signature === builtFor) return;
      builtFor = signature;
      let html = "";
      if (variant === "flow") {
        const [ink, accent] = buildFlow(width, height);
        html =
          `<div class="cream-layer" data-rate="-0.05"><div class="cream-sway">${ink}</div></div>` +
          `<div class="cream-layer" data-rate="-0.1"><div class="cream-sway cream-sway-alt">${accent}</div></div>`;
      } else {
        const {
          layers: rings,
          wave,
          origin,
        } = buildRipple(width, height, cx, cy);
        html =
          `<div class="cream-layer" data-rate="-0.06" style="--ring-origin:${origin}">` +
          rings
            .map(
              (r, i) =>
                `<div class="cream-breathe cream-breathe-${i}">${r}</div>`,
            )
            .join("") +
          [0, 1, 2]
            .map(
              (i) =>
                `<div class="cream-wave" style="animation-delay:${-i * 3}s">${wave}</div>`,
            )
            .join("") +
          `</div>`;
      }
      host.innerHTML = html;
      layers = Array.from(
        host.querySelectorAll<HTMLElement>(".cream-layer"),
      ).map((el) => ({ el, rate: Number(el.dataset.rate) }));
    };
    // Size changes (e.g. a discipline box animating open) rebuild the line
    // art once they settle, not on every frame of the animation.
    let settle: ReturnType<typeof setTimeout> | undefined;
    const resize = new ResizeObserver(() => {
      clearTimeout(settle);
      settle = setTimeout(build, 140);
    });
    resize.observe(section);
    window.addEventListener("resize", build);
    build();

    // CSS animations only run while the section is on screen.
    const seen = new IntersectionObserver(
      ([entry]) => (host.dataset.live = String(entry.isIntersecting)),
      { rootMargin: "120px 0px" },
    );
    seen.observe(section);

    // Scroll parallax: one composited transform per layer, written only when
    // the value changes. No layout reads, no redraws.
    const stop = subscribeTicker(() => {
      // Layout is only measurable while About is shown (Work hides it).
      if (engine.view !== lastView) {
        lastView = engine.view;
        if (engine.view === "about") build();
      }
      if (engine.view !== "about" || document.hidden) return;
      const top = sectionY - engine.read().virtualScrollY;
      if (top > innerHeight || top + height < 0) return;
      const key = top.toFixed(1);
      if (key === lastKey) return;
      lastKey = key;
      layers.forEach(({ el, rate }) => {
        el.style.transform = `translate3d(0,${(top * rate).toFixed(1)}px,0)`;
      });
    });

    return () => {
      stop();
      resize.disconnect();
      clearTimeout(settle);
      seen.disconnect();
      window.removeEventListener("resize", build);
    };
  }, [engine, variant]);

  return (
    <>
      <div
        ref={hostRef}
        className={`cream-field cream-${variant}`}
        aria-hidden="true"
      />
      <i className="cream-grain" aria-hidden="true" />
      <i className="cream-fade" aria-hidden="true" />
    </>
  );
}
