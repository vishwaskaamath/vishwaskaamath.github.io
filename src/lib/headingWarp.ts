import { damp, falloff, subscribeProximity } from "./proximity";

/**
 * Cursor-proximity character warp for About headings, with the exact
 * constants of the Work landing's WarpedText (radius, falloff, smoothing,
 * velocity shift, stretch and skew), on the same shared proximity loop.
 *
 * Cost control: a heading does nothing until the cursor enters it; character
 * centres are read from offsets once (then cached until resize), so the loop
 * never measures characters; and once every glyph has settled the heading
 * drops out of the loop again.
 *
 * Characters may sit inside a rise-reveal wrapper (RevealText); the warp
 * only writes the inner .warp-char, so the two never collide.
 */
const RADIUS = 95;
const SMOOTHING = 0.18;

type Glyph = {
  els: HTMLElement[];
  cx: number;
  cy: number;
  s: number;
  x: number;
  y: number;
  skew: number;
};

/** Layout offset from the page origin (ignores transforms). */
function pageOffset(el: HTMLElement) {
  let x = 0,
    y = 0,
    node: HTMLElement | null = el;
  while (node) {
    x += node.offsetLeft;
    y += node.offsetTop;
    node = node.offsetParent as HTMLElement | null;
  }
  return { x, y };
}

export function attachHeadingWarp(root: HTMLElement) {
  let glyphs: Glyph[] | null = null;
  let hovered = false,
    active = false;

  const build = () => {
    const origin = pageOffset(root);
    const out: Glyph[] = [];
    const add = (els: HTMLElement[]) => {
      const ref = els[0];
      const p = pageOffset(ref);
      out.push({
        els,
        cx: p.x - origin.x + ref.offsetWidth / 2,
        cy: p.y - origin.y + ref.offsetHeight / 2,
        s: 0,
        x: 0,
        y: 0,
        skew: 0,
      });
    };
    root
      .querySelectorAll<HTMLElement>("[data-warp]")
      .forEach((el) => add([el]));
    glyphs = out.length ? out : null;
  };
  const enter = () => {
    hovered = true;
    if (!glyphs) build();
  };
  const leave = () => {
    hovered = false;
  };
  const invalidate = () => {
    if (!active) glyphs = null;
  };
  root.addEventListener("mouseenter", enter);
  root.addEventListener("mouseleave", leave);
  window.addEventListener("resize", invalidate);

  const unsubscribe = subscribeProximity((pointer) => {
    if (!hovered && !active) return;
    if (!glyphs) build();
    const list = glyphs;
    if (!list) return;
    // One rect read per frame for this (hovered) heading; never per glyph.
    const rect = root.getBoundingClientRect();
    const lx = pointer.x - rect.left,
      ly = pointer.y - rect.top;
    // Velocity can be non-finite on a zero-length frame; treat it as still.
    const vx = Number.isFinite(pointer.vx) ? pointer.vx : 0,
      vy = Number.isFinite(pointer.vy) ? pointer.vy : 0;
    const speed = Math.hypot(vx, vy);
    const dx = speed > 0.02 ? vx / speed : 0;
    const dy = speed > 0.02 ? vy / speed : 0;
    const live = hovered && pointer.enabled;
    const strengths = list.map((g) =>
      live ? falloff(Math.hypot(lx - g.cx, ly - g.cy), RADIUS) : 0,
    );
    return () => {
      let settling = false;
      active = false;
      list.forEach((g, i) => {
        const strength = strengths[i];
        const tx = dx * strength * 8,
          ty = dy * strength * 8,
          tSkew = Math.max(-16, Math.min(16, vx * strength * 0.6));
        g.s = damp(g.s, strength, SMOOTHING);
        g.x = damp(g.x, tx, SMOOTHING);
        g.y = damp(g.y, ty, SMOOTHING);
        g.skew = damp(g.skew, tSkew, SMOOTHING);
        const moving =
          Math.abs(g.s - strength) > 0.001 ||
          Math.abs(g.x - tx) > 0.001 ||
          Math.abs(g.y - ty) > 0.001 ||
          Math.abs(g.skew - tSkew) > 0.001;
        if (!moving && strength === 0 && tx === 0 && ty === 0)
          g.s = g.x = g.y = g.skew = 0;
        settling ||= moving;
        const on =
          g.s > 0 || Math.abs(g.x) + Math.abs(g.y) + Math.abs(g.skew) > 0;
        active ||= on;
        const transform = on
          ? `translate3d(${g.x.toFixed(2)}px,${g.y.toFixed(2)}px,0) scale(${(1 - g.s * 0.12).toFixed(4)},${(1 + g.s * 0.32).toFixed(4)}) skewX(${g.skew.toFixed(2)}deg)`
          : "";
        g.els.forEach((el) => {
          if (el.style.transform !== transform) el.style.transform = transform;
        });
      });
      return settling;
    };
  });

  return () => {
    unsubscribe();
    root.removeEventListener("mouseenter", enter);
    root.removeEventListener("mouseleave", leave);
    window.removeEventListener("resize", invalidate);
  };
}
