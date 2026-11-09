"use client";
import { subscribeTicker, damp } from "@/lib/masterTicker";
import { useEffect, useRef, type RefObject } from "react";
import type { WheelDrag } from "@/hooks/useProjectWheel";
import type { ScrollPhysics } from "@/lib/scrollPhysics";
import {
  spawnPulse,
  advancePulses,
  type ContourPulse,
} from "@/lib/contourPulse";
import { projects } from "@/data/projects";
import { createWaveRenderer } from "@/lib/waveRenderer";

/** Sparse editorial backdrop; all input and motion stay outside React state. */
export default function WavyBackground({
  reducedMotion,
  paused = false,
  dragRef,
  engine,
}: {
  reducedMotion: boolean;
  paused?: boolean;
  dragRef: RefObject<WheelDrag>;
  engine: ScrollPhysics;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null),
    phaseRef = useRef(0),
    upper = useRef<HTMLDivElement>(null),
    lower = useRef<HTMLDivElement>(null);
  const options = useRef({ reducedMotion, paused });
  options.current = { reducedMotion, paused };
  useEffect(() => {
    const renderer = createWaveRenderer(canvasRef.current!);
    if (!renderer) return;
    const pulses: ContourPulse[] = [],
      motion = matchMedia("(prefers-reduced-motion: reduce)");
    let mouseX = innerWidth * 0.5,
      mouseY = innerHeight * 0.5,
      x = mouseX,
      y = mouseY,
      energy = 0,
      dirty = true;
    let pointerId = -1,
      lastY = 0,
      distance = 0,
      lastIndex = -1,
      drift = 0,
      frameDt = 1 / 60;
    let sections: {
        top: number;
        height: number;
        workflow: boolean;
      }[] = [],
      lastStoryY = 0,
      storyVelocity = 0,
      lastView = engine.view;
    const tools = Array.from(
      document.querySelectorAll<HTMLElement>(".hardware-tool"),
    );
    // Opaque cream chapters: while one fills the screen the background is
    // hidden behind it. (Every dark part of the story, including the film
    // aperture, is see-through and keeps the background running.)
    let opaque: { top: number; height: number }[] = [];
    const measure = () => {
      const origin =
        document.querySelector(".story-stage")?.getBoundingClientRect().top ??
        0;
      opaque = Array.from(
        document.querySelectorAll<HTMLElement>(
          ".story-stage .story-capabilities, .story-stage .story-contact",
        ),
      )
        .map((el) => ({
          top: el.getBoundingClientRect().top - origin,
          height: el.offsetHeight,
        }))
        .sort((a, b) => a.top - b.top)
        // Touching blocks hide the background together: merge them.
        .reduce<{ top: number; height: number }[]>((spans, block) => {
          const prev = spans[spans.length - 1];
          if (prev && block.top <= prev.top + prev.height + 1)
            prev.height = Math.max(
              prev.height,
              block.top + block.height - prev.top,
            );
          else spans.push({ ...block });
          return spans;
        }, []);
      sections = Array.from(
        document.querySelectorAll<HTMLElement>(".story-stage .story-chapter"),
      ).map((el) => ({
        top:
          el.getBoundingClientRect().top -
          (document.querySelector(".story-stage")?.getBoundingClientRect()
            .top ?? 0),
        height: el.offsetHeight,
        workflow: el.matches(".story-workflow"),
      }));
    };
    const observer = new ResizeObserver(measure);
    const story = document.querySelector(".story-stage");
    if (story) observer.observe(story);
    measure();
    const draw = () => {
      const frame = engine.read(),
        about = engine.view === "about",
        scroll = about ? frame.virtualScrollY : 0;
      const chapter = sections.find(
        (s) =>
          scroll + innerHeight * 0.5 >= s.top &&
          scroll + innerHeight * 0.5 < s.top + s.height,
      );
      const activeTool = tools.find((el) => el.dataset.active === "true");
      const brand = activeTool
        ? activeTool.style.getPropertyValue("--tool-brand").trim()
        : "";
      const palette = about
        ? chapter?.workflow
          ? [brand || "#a855f7", "#38bdf8", "#f97316"]
          : ["#FF4D1C", "#702633", "#18564e"]
        : projects[frame.index]?.accentPalette;
      const dynamics = {
        mouseX: x,
        mouseY: y,
        energy,
        palette,
        dt: frameDt,
        velocity: about ? storyVelocity : frame.scrollVelocity,
        label: `${String(frame.index + 1).padStart(2, "0")} // ${projects[frame.index].shortTitle.toUpperCase()}`,
        story: about,
        // Falling embers everywhere, the landing page included.
        fall: true,
        storyProgress: about ? frame.progress : 0,
        ribbonAlpha: about ? 0.45 : 1,
      };
      renderer.draw(phaseRef.current, pulses, dynamics);
    };
    const resize = () => {
      renderer.resize(innerWidth, innerHeight);
      measure();
      dirty = true;
      draw();
    };
    const invalidate = () => {
      dirty = true;
    };
    const unsubscribe = subscribeTicker((_now, dt) => {
      if (document.hidden) return;
      frameDt = dt;
      const sy = engine.view === "about" ? engine.read().virtualScrollY : 0;
      if (lastView !== engine.view) {
        lastStoryY = sy;
        storyVelocity = 0;
        lastView = engine.view;
      }
      storyVelocity = damp(
        storyVelocity,
        (sy - lastStoryY) / Math.max(dt, 0.001) / 400,
        6,
        dt,
      );
      lastStoryY = sy;
      const index = engine.read().index,
        project = projects[index];
      if (index !== lastIndex) {
        lastIndex = index;
        dirty = true;
        const label = `${String(index + 1).padStart(2, "0")} // ${project.role.includes("MOTION") ? "MOTION" : project.role.includes("WEB") ? "INTERACTION" : "EDITING"}`;
        if (upper.current) upper.current.textContent = label;
        if (lower.current) lower.current.textContent = label;
      }
      const still = options.current.reducedMotion || motion.matches;
      const nextX = still ? mouseX : damp(x, mouseX, 5, dt),
        nextY = still ? mouseY : damp(y, mouseY, 5, dt);
      const nextEnergy = still
        ? 0
        : damp(
            energy,
            Math.min(
              3,
              Math.abs(
                engine.view === "about"
                  ? storyVelocity
                  : engine.read().scrollVelocity,
              ),
            ),
            5,
            dt,
          );
      const moving =
        Math.abs(nextX - x) +
          Math.abs(nextY - y) +
          Math.abs(nextEnergy - energy) >
        0.02;
      x = nextX;
      y = nextY;
      energy = nextEnergy;
      if (!still && !options.current.paused)
        drift += dt * (0.08 + energy * 0.4);
      const shift =
        Math.sin(drift) * innerWidth * 0.045 + (x / innerWidth - 0.5) * 24;
      if (upper.current)
        upper.current.style.transform = `translate3d(${shift}px,0,0)`;
      if (lower.current)
        lower.current.style.transform = `translate3d(${-shift}px,0,0)`;
      const animate = !still && !options.current.paused;
      if (animate) phaseRef.current += dt * 0.36;
      const pulsing = pulses.length > 0;
      advancePulses(pulses, dt * 1000);
      // Skip only the invisible redraws while a cream chapter covers the
      // whole viewport; the animation clock keeps running, so it resumes in
      // step the moment any of the background shows again.
      const covered =
        engine.view === "about" &&
        opaque.some((s) => s.top <= sy && s.top + s.height >= sy + innerHeight);
      if (covered) dirty = true;
      else if (dirty || animate || moving || pulsing) {
        draw();
        dirty = false;
      }
    });
    const down = (event: PointerEvent) => {
      if (!event.isPrimary || event.button !== 0) return;
      pointerId = event.pointerId;
      lastY = event.clientY;
      distance = 0;
    };
    const move = (event: PointerEvent) => {
      mouseX = event.clientX;
      mouseY = event.clientY;
      if (event.pointerId === pointerId) {
        distance += Math.abs(event.clientY - lastY);
        lastY = event.clientY;
      }
    };
    const up = (event: PointerEvent) => {
      if (event.pointerId !== pointerId) return;
      distance += Math.abs(event.clientY - lastY);
      if (distance <= 6 && dragRef.current.distance <= 6) {
        window.dispatchEvent(
          new CustomEvent("portfolio-clean-click", {
            detail: { x: event.clientX, y: event.clientY },
          }),
        );
        if (!options.current.reducedMotion && !motion.matches)
          spawnPulse(pulses, event.clientX, event.clientY);
        dirty = true;
      }
      pointerId = -1;
    };
    const cancel = () => {
      pointerId = -1;
    };
    window.addEventListener("pointerdown", down, true);
    window.addEventListener("pointermove", move, true);
    window.addEventListener("pointerup", up, true);
    window.addEventListener("pointercancel", cancel, true);
    window.addEventListener("resize", resize);
    window.addEventListener("portfolio-warmup", invalidate);
    document.addEventListener("visibilitychange", invalidate);
    motion.addEventListener("change", invalidate);
    resize();
    return () => {
      unsubscribe();
      observer.disconnect();
      renderer.dispose();
      window.removeEventListener("pointerdown", down, true);
      window.removeEventListener("pointermove", move, true);
      window.removeEventListener("pointerup", up, true);
      window.removeEventListener("pointercancel", cancel, true);
      window.removeEventListener("resize", resize);
      window.removeEventListener("portfolio-warmup", invalidate);
      document.removeEventListener("visibilitychange", invalidate);
      motion.removeEventListener("change", invalidate);
    };
  }, [dragRef, engine]);
  return (
    <div
      className="wavy-background"
      aria-hidden="true"
      data-renderer="canvas2d"
    >
      <canvas ref={canvasRef} className="wavy-canvas" />
    </div>
  );
}
