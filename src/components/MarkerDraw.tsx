"use client";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { ScrollPhysics } from "@/lib/scrollPhysics";

/** Marker ink, matching the trail line. */
const INK = "#ff4d1c";

/**
 * Pick up the About page's marker and draw with it.
 *
 * Click the pen riding the orange trail to pick it up: the cursor becomes the
 * marker and dragging anywhere on the About page draws. Strokes live in the
 * story stage's own coordinates, so they scroll with the page for free (no
 * per-frame work). The wheel still scrolls while you hold it. Put it down with
 * the pill, Esc, or by leaving About; "Clear" wipes the drawing.
 */
export default function MarkerDraw({ engine }: { engine: ScrollPhysics }) {
  const [held, setHeld] = useState(false);
  const [hasInk, setHasInk] = useState(false);
  const [mounted, setMounted] = useState(false);
  const ink = useRef<SVGSVGElement>(null);
  const surface = useRef<HTMLDivElement>(null);
  const cursor = useRef<HTMLDivElement>(null);
  const hint = useRef<HTMLDivElement>(null);

  useEffect(() => setMounted(true), []);

  // The pen on the trail is the pick-up handle.
  useEffect(() => {
    const stage = surface.current?.closest<HTMLElement>(".story-stage");
    const pen = stage?.querySelector<SVGGElement>(".manifesto-pen");
    if (!stage || !pen) return;
    const pick = (event: MouseEvent) => {
      // Only from the cap: the pen is grabbable once the trail is complete.
      if (pen.dataset.docked !== "true") return;
      event.preventDefault();
      event.stopPropagation();
      setHeld(true);
      placeCursor(event.clientX, event.clientY);
    };
    const over = (event: PointerEvent) => {
      const h = hint.current;
      if (!h || pen.dataset.docked !== "true") return;
      h.dataset.visible = "true";
      h.style.transform = `translate3d(${event.clientX + 18}px,${event.clientY - 34}px,0)`;
    };
    const out = () => {
      if (hint.current) hint.current.dataset.visible = "false";
    };
    pen.addEventListener("click", pick);
    pen.addEventListener("pointermove", over);
    pen.addEventListener("pointerleave", out);
    return () => {
      pen.removeEventListener("click", pick);
      pen.removeEventListener("pointermove", over);
      pen.removeEventListener("pointerleave", out);
    };
  }, [mounted]);

  const placeCursor = (x: number, y: number) => {
    const c = cursor.current;
    if (c) c.style.transform = `translate3d(${x}px,${y}px,0)`;
  };

  // While held: the stage is marked (hides the trail pen and the ribbon
  // cursor), Esc puts the marker down, and leaving About does too.
  useEffect(() => {
    const stage = surface.current?.closest<HTMLElement>(".story-stage");
    if (hint.current) hint.current.dataset.visible = "false";
    if (!held || !stage) return;
    stage.dataset.marker = "held";
    document.documentElement.dataset.marker = "held";
    window.dispatchEvent(new Event("portfolio:marker"));
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") setHeld(false);
    };
    const follow = (event: PointerEvent) =>
      placeCursor(event.clientX, event.clientY);
    const stopView = engine.subscribe(() => {
      if (engine.view !== "about") setHeld(false);
    });
    window.addEventListener("keydown", key);
    window.addEventListener("pointermove", follow, true);
    return () => {
      delete stage.dataset.marker;
      delete document.documentElement.dataset.marker;
      window.dispatchEvent(new Event("portfolio:marker"));
      window.removeEventListener("keydown", key);
      window.removeEventListener("pointermove", follow, true);
      stopView();
    };
  }, [held, engine]);

  // Drawing: one SVG path per stroke, in stage coordinates, smoothed with
  // quadratic curves through the midpoints of the pointer samples.
  useEffect(() => {
    const area = surface.current,
      svg = ink.current;
    if (!held || !area || !svg) return;
    const stage = area.closest<HTMLElement>(".story-stage")!;
    let path: SVGPathElement | null = null,
      d = "",
      last: { x: number; y: number } | null = null,
      id = -1;
    const at = (event: PointerEvent) => {
      const r = stage.getBoundingClientRect();
      return { x: event.clientX - r.left, y: event.clientY - r.top };
    };
    const down = (event: PointerEvent) => {
      if (event.button !== 0) return;
      event.preventDefault();
      id = event.pointerId;
      try {
        area.setPointerCapture(id);
      } catch {}
      const p = at(event);
      path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      // A dot for a click without movement.
      d = `M${p.x.toFixed(1)} ${p.y.toFixed(1)} l0.01 0`;
      path.setAttribute("d", d);
      svg.appendChild(path);
      last = p;
      setHasInk(true);
    };
    const move = (event: PointerEvent) => {
      if (!path || event.pointerId !== id || !last) return;
      const p = at(event);
      if (Math.hypot(p.x - last.x, p.y - last.y) < 2) return;
      const mx = (last.x + p.x) / 2,
        my = (last.y + p.y) / 2;
      d += ` Q${last.x.toFixed(1)} ${last.y.toFixed(1)} ${mx.toFixed(1)} ${my.toFixed(1)}`;
      path.setAttribute("d", d);
      last = p;
    };
    const up = (event: PointerEvent) => {
      if (event.pointerId !== id) return;
      if (path && last)
        path.setAttribute(
          "d",
          `${d} L${last.x.toFixed(1)} ${last.y.toFixed(1)}`,
        );
      path = null;
      last = null;
      id = -1;
      try {
        area.releasePointerCapture(event.pointerId);
      } catch {}
    };
    area.addEventListener("pointerdown", down);
    area.addEventListener("pointermove", move);
    area.addEventListener("pointerup", up);
    area.addEventListener("pointercancel", up);
    return () => {
      area.removeEventListener("pointerdown", down);
      area.removeEventListener("pointermove", move);
      area.removeEventListener("pointerup", up);
      area.removeEventListener("pointercancel", up);
    };
  }, [held]);

  const clear = () => {
    ink.current?.replaceChildren();
    setHasInk(false);
  };

  return (
    <>
      <svg ref={ink} className="marker-ink" stroke={INK} aria-hidden="true" />
      <div
        ref={surface}
        className="marker-surface"
        data-active={held}
        data-drag-own
        aria-hidden="true"
      />
      {mounted &&
        createPortal(
          <>
            <div ref={hint} className="marker-hint" data-visible="false">
              Pick me up and draw
            </div>
            <div
              ref={cursor}
              className="marker-cursor"
              data-visible={held}
              aria-hidden="true"
            >
              <svg viewBox="-44 -12 48 24" width="58" height="29">
                <path
                  d="M0 0 L-14 -8 L-40 -8 L-40 8 L-14 8 Z"
                  fill="#f3efe6"
                  stroke={INK}
                  strokeWidth="2"
                />
                <path d="M0 0 L-14 -8 L-14 8 Z" fill={INK} />
                <path
                  d="M-33 -8 V8 M-27 -8 V8"
                  stroke="#111113"
                  strokeWidth="2"
                />
              </svg>
            </div>
            {held && (
              <div
                className="marker-controls"
                role="toolbar"
                aria-label="Marker"
              >
                <span className="marker-controls-label">
                  <i aria-hidden="true" /> Drawing: drag anywhere
                </span>
                <button type="button" onClick={clear} disabled={!hasInk}>
                  Clear
                </button>
                <button
                  type="button"
                  className="is-primary"
                  onClick={() => setHeld(false)}
                >
                  Put it down
                </button>
              </div>
            )}
          </>,
          document.body,
        )}
    </>
  );
}
