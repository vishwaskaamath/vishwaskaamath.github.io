"use client";
import {
  cachedBox,
  observeGeometry,
  geometryRevision,
} from "@/lib/geometryCache";
import { useEffect, useId, useRef } from "react";
import { damp, falloff, subscribeProximity } from "@/lib/proximity";

export default function WarpedText({
  children,
  className = "",
  radius = 95,
  smoothing = 0.18,
}: {
  children: string;
  className?: string;
  radius?: number;
  smoothing?: number;
}) {
  const root = useRef<HTMLSpanElement>(null);
  const displacement = useRef<SVGFEDisplacementMapElement>(null);
  const id = `text-warp-${useId().replace(/:/g, "")}`;
  useEffect(() => {
    const element = root.current!;
    const releaseGeometry = observeGeometry(element);
    const reelSlot = element.closest<HTMLElement>(
      "[data-title-slot],[data-meta-slot],[data-tool-caption]",
    );
    const titleSection = element.closest<HTMLElement>(".project-metadata");
    const isTitle = !!element.closest(".title-solid");
    const cells = Array.from(
      element.querySelectorAll<HTMLElement>(".char-cell"),
    );
    const chars = cells.map((cell) => cell.firstElementChild as HTMLElement);
    const state = chars.map(() => ({ strength: 0, x: 0, y: 0, skew: 0 }));
    let scale = 0,
      active = false;
    let revision = -1;
    let geometry: { x: number; y: number }[] | null = null;
    let measuredWidth = 0,
      measuredHeight = 0;
    let filterEnabled = false,
      appliedScale = 0;
    const unsubscribe = subscribeProximity((pointer) => {
      const hidden =
        !!element.closest('[inert],[data-warp-disabled="true"]') ||
        reelSlot?.style.visibility === "hidden" ||
        (isTitle && titleSection?.dataset.distorting === "true");
      if (hidden && !active) return;
      const visible = !hidden && true;
      if (!visible && !active) return;
      if (revision !== geometryRevision()) {
        geometry = null;
        revision = geometryRevision();
      }
      const rect = cachedBox(element);
      const nearby =
        pointer.enabled &&
        visible &&
        pointer.x > rect.left - radius &&
        pointer.x < rect.right + radius &&
        pointer.y > rect.top - radius &&
        pointer.y < rect.bottom + radius;
      if (!nearby && !active) return;
      const speed = Math.hypot(pointer.vx, pointer.vy);
      const dx = speed > 0.02 ? pointer.vx / speed : 0;
      const dy = speed > 0.02 ? pointer.vy / speed : 0;
      // Character cells never deform: cache their local centers, then translate
      // the cached coordinates with the reel instead of reading every span/frame.
      if (
        nearby &&
        (!geometry ||
          Math.abs(rect.width - measuredWidth) > 0.5 ||
          Math.abs(rect.height - measuredHeight) > 0.5)
      ) {
        measuredWidth = rect.width;
        measuredHeight = rect.height;
        geometry = cells.map((cell) => {
          const box = cachedBox(cell);
          return {
            x: box.x + box.width / 2 - rect.x,
            y: box.y + box.height / 2 - rect.y,
          };
        });
      }
      const strengths = chars.map((_, i) =>
        nearby && geometry
          ? falloff(
              Math.hypot(
                pointer.x - rect.x - geometry[i].x,
                pointer.y - rect.y - geometry[i].y,
              ),
              radius,
            )
          : 0,
      );
      return () => {
        let peak = 0;
        let settling = false;
        active = false;
        state.forEach((s, i) => {
          const strength = strengths[i];
          s.strength = damp(s.strength, strength, smoothing);
          s.x = damp(s.x, dx * strength * 8, smoothing);
          s.y = damp(s.y, dy * strength * 8, smoothing);
          s.skew = damp(
            s.skew,
            Math.max(-16, Math.min(16, pointer.vx * strength * 0.6)),
            smoothing,
          );
          settling ||=
            Math.abs(s.strength - strength) > 0.001 ||
            Math.abs(s.x - dx * strength * 8) > 0.001 ||
            Math.abs(s.y - dy * strength * 8) > 0.001;
          peak = Math.max(peak, s.strength);
          active ||=
            s.strength > 0 ||
            Math.abs(s.x) + Math.abs(s.y) + Math.abs(s.skew) > 0;
          chars[i].style.transform =
            active || strength
              ? `translate3d(${s.x}px,${s.y}px,0) scale(${1 - s.strength * 0.12},${1 + s.strength * 0.32}) skewX(${s.skew}deg)`
              : "";
        });
        scale = damp(
          scale,
          12 * peak * Math.min(1, speed / 8),
          smoothing === 0.18 ? 0.15 : smoothing,
        );
        if (Math.abs(scale - appliedScale) > 0.1 || scale === 0) {
          displacement.current?.setAttribute("scale", String(scale));
          appliedScale = scale;
        }
        const enabled = scale >= 0.5;
        if (enabled !== filterEnabled) {
          element.style.filter = enabled ? `url(#${id})` : "none";
          filterEnabled = enabled;
        }
        active ||= scale > 0;
        return settling || scale > 0;
      };
    });
    return () => {
      releaseGeometry();
      unsubscribe();
    };
  }, [children, id, radius, smoothing]);
  return (
    <span className={`warped-text ${className}`} aria-label={children}>
      <svg className="warp-definitions" aria-hidden="true">
        <defs>
          <filter
            id={id}
            x="-10%"
            y="-30%"
            width="120%"
            height="160%"
            colorInterpolationFilters="sRGB"
          >
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.025 0.08"
              numOctaves="2"
              seed="7"
              result="noise"
            />
            <feDisplacementMap
              ref={displacement}
              in="SourceGraphic"
              in2="noise"
              scale="0"
              xChannelSelector="R"
              yChannelSelector="G"
            />
          </filter>
        </defs>
      </svg>
      <span ref={root} className="warp-text-content" aria-hidden="true">
        {Array.from(children).map((char, i) => (
          <span className="char-cell" key={i}>
            <span className="char">{char === " " ? "\u00a0" : char}</span>
          </span>
        ))}
      </span>
    </span>
  );
}
