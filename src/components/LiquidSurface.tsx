"use client";
import {
  cachedBox,
  observeGeometry,
  geometryRevision,
} from "@/lib/geometryCache";
import { useEffect, useId, useRef, type ReactNode } from "react";
import { damp, subscribeProximity } from "@/lib/proximity";

let lensMap: string;
function getLensMap() {
  if (lensMap) return lensMap;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 128;
  const ctx = canvas.getContext("2d")!;
  const pixels = ctx.createImageData(128, 128);
  for (let y = 0; y < 128; y++)
    for (let x = 0; x < 128; x++) {
      const dx = (x - 63.5) / 63.5,
        dy = (y - 63.5) / 63.5;
      const r = Math.hypot(dx, dy),
        field = Math.max(0, 1 - r * r) ** 2;
      const i = (y * 128 + x) * 4;
      // Inverse sampling pulls nearby pixels toward the lens center (a soft bulge).
      pixels.data[i] = 128 - dx * 100;
      pixels.data[i + 1] = 128 - dy * 100;
      pixels.data[i + 2] = 128;
      pixels.data[i + 3] = Math.round(field * 255);
    }
  ctx.putImageData(pixels, 0, 0);
  return (lensMap = canvas.toDataURL());
}

export default function LiquidSurface({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  const root = useRef<HTMLDivElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const filter = useRef<SVGFilterElement>(null);
  const map = useRef<SVGFEImageElement>(null);
  const wake = useRef<SVGFEColorMatrixElement>(null);
  const displacement = useRef<SVGFEDisplacementMapElement>(null);
  const id = `liquid-${useId().replace(/:/g, "")}`;
  useEffect(() => {
    const element = root.current!;
    const releaseGeometry = observeGeometry(element);
    const reelCard = element.closest<HTMLElement>(
      "[data-video],[data-software]",
    );
    const probes = Array.from(
      element.querySelectorAll<HTMLElement>(".lens-probe"),
    );
    map.current?.setAttribute("href", getLensMap());
    let intensity = 0,
      vx = 0,
      vy = 0,
      cx = 0,
      cy = 0;
    const unsubscribe = subscribeProximity((pointer) => {
      if (reelCard?.style.visibility === "hidden" && !intensity) return;
      const rect = cachedBox(element);
      const visible = !element.closest("[inert]");
      const videoCard = reelCard?.hasAttribute("data-video");
      const eligible =
        !videoCard ||
        (reelCard?.classList.contains("is-active") &&
          !reelCard.closest('[data-expanded="true"]'));
      const nearby =
        pointer.enabled &&
        visible &&
        eligible &&
        pointer.x >= rect.left &&
        pointer.x <= rect.right &&
        pointer.y >= rect.top &&
        pointer.y <= rect.bottom;
      if (!nearby && !intensity) return;
      const width = rect.layoutWidth,
        height = rect.layoutHeight;
      // Basis probes account for wheel rotation/scale without feeding deformation back into coordinates.
      const [o, a, b] = probes.map((probe) => cachedBox(probe));
      const ax = (a.x - o.x) / width,
        ay = (a.y - o.y) / width;
      const bx = (b.x - o.x) / height,
        by = (b.y - o.y) / height;
      const det = ax * by - ay * bx;
      if (Math.abs(det) < 0.001) return;
      const px = pointer.x - o.x,
        py = pointer.y - o.y;
      const localX = (px * by - py * bx) / det,
        localY = (py * ax - px * ay) / det;
      const inside =
        nearby &&
        localX >= 0 &&
        localX <= width &&
        localY >= 0 &&
        localY <= height;
      const localVx = (pointer.vx * by - pointer.vy * bx) / det;
      const localVy = (pointer.vy * ax - pointer.vx * ay) / det;
      const target = inside
        ? Math.min(
            1,
            (videoCard ? 0.24 : 0) + Math.hypot(pointer.vx, pointer.vy) / 10,
          )
        : 0;
      return () => {
        intensity = damp(intensity, target, 0.08);
        vx = damp(vx, inside ? localVx : 0, 0.08);
        vy = damp(vy, inside ? localVy : 0, 0.08);
        if (inside) {
          cx = localX;
          cy = localY;
        }
        // 140 viewport pixels, adjusted for the wheel's current scale.
        const rx = 140 / Math.max(0.2, Math.hypot(ax, ay));
        const ry = 140 / Math.max(0.2, Math.hypot(bx, by));
        map.current?.setAttribute("x", String(cx - rx));
        map.current?.setAttribute("y", String(cy - ry));
        map.current?.setAttribute("width", String(rx * 2));
        map.current?.setAttribute("height", String(ry * 2));
        filter.current?.setAttribute("width", String(width + 64));
        filter.current?.setAttribute("height", String(height + 64));
        const wx = Math.max(-0.3, Math.min(0.3, -vx * 0.012));
        const wy = Math.max(-0.3, Math.min(0.3, -vy * 0.012));
        wake.current?.setAttribute(
          "values",
          `1 0 0 0 ${wx} 0 1 0 0 ${wy} 0 0 1 0 0 0 0 0 1 0`,
        );
        displacement.current?.setAttribute("scale", String(intensity * 36));
        content.current!.style.filter =
          intensity * 36 >= 0.5 ? `url(#${id})` : "none";
        element.dataset.lensIntensity = intensity.toFixed(3);
        return intensity > 0;
      };
    });
    return () => {
      releaseGeometry();
      unsubscribe();
    };
  }, [id]);
  return (
    <div className={`liquid-surface ${className}`} ref={root}>
      <svg className="warp-definitions" aria-hidden="true">
        <defs>
          <filter
            ref={filter}
            id={id}
            filterUnits="userSpaceOnUse"
            primitiveUnits="userSpaceOnUse"
            x="-32"
            y="-32"
            width="1000"
            height="1000"
            colorInterpolationFilters="sRGB"
          >
            <feFlood floodColor="rgb(50%,50%,50%)" result="neutral" />
            <feImage
              ref={map}
              x="0"
              y="0"
              width="280"
              height="280"
              preserveAspectRatio="none"
              result="lens"
            />
            <feColorMatrix
              ref={wake}
              in="lens"
              type="matrix"
              values="1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 1 0"
              result="wake"
            />
            <feMerge result="field">
              <feMergeNode in="neutral" />
              <feMergeNode in="wake" />
            </feMerge>
            <feDisplacementMap
              ref={displacement}
              in="SourceGraphic"
              in2="field"
              scale="0"
              xChannelSelector="R"
              yChannelSelector="G"
            />
          </filter>
        </defs>
      </svg>
      <div className="liquid-content" ref={content}>
        {children}
      </div>
      <i className="lens-probe probe-origin" />
      <i className="lens-probe probe-x" />
      <i className="lens-probe probe-y" />
    </div>
  );
}
