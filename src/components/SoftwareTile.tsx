"use client";

import { useEffect, useRef } from "react";
import { toolCatalog, type Software, type Tool } from "@/data/projects";
import { subscribeTicker, damp } from "@/lib/masterTicker";
import SoftwareCube3D from "./SoftwareCube3D";

type Pose = { x: number; y: number; scale: number; angle: number };

function restingPose(index: number, count: number): Pose {
  if (count === 2) {
    return index === 0
      ? { x: -24, y: -16, scale: 0.84, angle: -6 }
      : { x: 28, y: 18, scale: 0.76, angle: 7 };
  }
  return (
    [
      { x: -28, y: -18, scale: 0.78, angle: -8 },
      { x: 28, y: -6, scale: 0.73, angle: 6 },
      { x: 0, y: 26, scale: 0.68, angle: 2 },
    ][index] ?? { x: 0, y: 26 + (index - 2) * 16, scale: 0.68, angle: 2 }
  );
}

export default function SoftwareTile({
  software,
  tools = [toolCatalog[software]],
}: {
  software: Software;
  tools?: Tool[];
}) {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const cubes = Array.from(
      el.querySelectorAll<HTMLElement>("[data-orbit-cube]"),
    );
    const count = cubes.length;
    let mouseX = -10000;
    let mouseY = -10000;
    let blend = 0;
    let phase = Math.PI / 2;
    let tiltX = 0;
    let tiltY = 0;
    let cubeSize = el.clientWidth;
    const resize = new ResizeObserver(() => {
      cubeSize = el.clientWidth;
    });
    resize.observe(el);

    const move = (event: PointerEvent) => {
      mouseX = event.clientX;
      mouseY = event.clientY;
    };
    const leave = () => {
      mouseX = -10000;
      mouseY = -10000;
    };
    window.addEventListener("pointermove", move, { passive: true });
    window.addEventListener("blur", leave);

    const stop = subscribeTicker((_now, dt) => {
      if (document.hidden || el.closest("[inert]")) return;
      const active =
        el.closest("[data-software]")?.getAttribute("aria-hidden") === "false";
      let dx = 0;
      let dy = 0;
      let hovering = false;
      if (active) {
        const rect = el.getBoundingClientRect();
        dx = mouseX - (rect.left + rect.width / 2);
        dy = mouseY - (rect.top + rect.height / 2);
        hovering = Math.hypot(dx, dy) < 120;
      }

      // The phase is parked whenever the cursor leaves the active logo group.
      // Damping is time-correct so the same hover gesture feels consistent at 60–240 Hz.
      blend = damp(blend, hovering ? 1 : 0, 3.7, dt);
      if (hovering && count > 1) phase += dt * 0.85 * blend;
      tiltX = damp(tiltX, hovering ? (-dy / 120) * 16 : 0, 10, dt);
      tiltY = damp(tiltY, hovering ? (dx / 120) * 16 : 0, 10, dt);

      cubes.forEach((cube, index) => {
        if (count === 1) {
          cube.style.transform = `translate3d(0,0,0) rotateX(${tiltX}deg) rotateY(${tiltY}deg)`;
          cube.style.zIndex = "30";
          cube.style.filter = "none";
        } else {
          const rest = restingPose(index, count);
          const angle = phase + (index * Math.PI * 2) / count;
          const depth = Math.sin(angle);
          const baseScale = count >= 3 ? 0.72 : 0.8;
          // Wider than the visible face at either depth-swap turnaround.
          const radiusX = Math.max(66, cubeSize * (count >= 3 ? 0.74 : 0.45));
          const radiusY = Math.max(42, cubeSize * (count >= 3 ? 0.74 : 0.29));
          const orbitScale = baseScale * (0.85 + 0.22 * (depth + 1) * 0.5);
          const x = rest.x * (1 - blend) + Math.cos(angle) * radiusX * blend;
          const y = rest.y * (1 - blend) + Math.sin(angle) * radiusY * blend;
          const scale = rest.scale * (1 - blend) + orbitScale * blend;
          const rotation =
            rest.angle * (1 - blend) + Math.cos(angle) * 7 * blend;
          const layer = (1 - blend) * (count - index) + blend * depth;
          const brightness =
            0.72 +
            0.32 *
              ((depth + 1) * 0.5 * blend +
                (1 - blend) * (index === 0 ? 1 : 0.4));

          // All orbiting faces stay in one plane. Layer swaps happen at the
          // outside turnaround, avoiding intersecting 3D planes.
          cube.style.transform = `translate3d(${x}px,${y}px,0) scale(${scale}) rotateZ(${rotation}deg)`;
          cube.style.zIndex = String(Math.round(50 + layer * 25));
          cube.style.filter = `brightness(${brightness})`;
        }
        cube.style.setProperty("--tile-light", String(blend));
        cube.style.setProperty(
          "--light-x",
          `${50 + Math.max(-1, Math.min(1, dx / 120)) * 50}%`,
        );
        cube.style.setProperty(
          "--light-y",
          `${50 + Math.max(-1, Math.min(1, dy / 120)) * 50}%`,
        );
      });
    });
    return () => {
      stop();
      resize.disconnect();
      window.removeEventListener("pointermove", move);
      window.removeEventListener("blur", leave);
    };
  }, [tools]);

  return (
    <div
      ref={root}
      className="software-orbit-stage"
      data-multi={tools.length > 1}
    >
      {tools.map((tool) => (
        <SoftwareCube3D key={tool.id} tool={tool} />
      ))}
    </div>
  );
}
