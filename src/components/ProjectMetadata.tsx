"use client";
import { useLayoutEffect, useRef } from "react";
import { projects } from "@/data/projects";
import { reelOffset, type ScrollPhysics } from "@/lib/scrollPhysics";

export default function ProjectMetadata({
  index, engine, reducedMotion, onBurst,
}: {
  index: number;
  engine: ScrollPhysics;
  reducedMotion: boolean;
  onBurst: (x: number, y: number, count?: number) => void;
}) {
  const root = useRef<HTMLElement>(null);
  const options = useRef({ reducedMotion, onBurst });
  options.current = { reducedMotion, onBurst };

  useLayoutEffect(() => {
    const element = root.current!;
    const slots = Array.from(element.querySelectorAll<HTMLElement>("[data-title-slot],[data-meta-slot]"));
    const slotIndices = slots.map((slot) => Number(slot.dataset.titleSlot ?? slot.dataset.metaSlot));
    let centerX = 0;
    let centerY = 0;
    let titleWidth = 0;
    let particleBudget = 0;
    let wasMoving = false;
    const measure = () => {
      const rect = element.getBoundingClientRect();
      centerX = rect.x + rect.width / 2;
      centerY = rect.y + rect.height / 2;
      titleWidth = rect.width;
    };
    measure();
    const resize = new ResizeObserver(measure);
    resize.observe(element);
    window.addEventListener("resize", measure);
    const unsubscribe = engine.subscribe(({ currentScroll, scrollVelocity, deltaMs }) => {
      slots.forEach((slot, i) => {
        const d = reelOffset(slotIndices[i], currentScroll, projects.length);
        slot.style.transform = `translate3d(0, ${d * 100}%, 0)`;
        slot.style.visibility = Math.abs(d) < 1 ? "visible" : "hidden";
      });
      const speed = Math.abs(scrollVelocity);
      const moving = !options.current.reducedMotion && speed > 0.02;
      if (moving !== wasMoving) {
        element.dataset.distorting = String(moving);
        wasMoving = moving;
      }
      // Proportional at normal speeds; cap extreme trackpad flings for legibility.
      const slice = moving ? Math.max(-24, Math.min(24, scrollVelocity * 15)) : 0;
      const skew = moving ? Math.max(-8, Math.min(8, scrollVelocity * 4)) : 0;
      element.style.setProperty("--title-skew", `${skew}deg`);
      element.style.setProperty("--slice-top", `${slice}px`);
      element.style.setProperty("--slice-middle", `${-slice * 0.65}px`);
      element.style.setProperty("--slice-bottom", `${slice * 0.35}px`);
      if (moving) {
        particleBudget += Math.min(speed, 2) * (deltaMs / (1000 / 60)) * 1.8;
        const count = Math.min(10, Math.floor(particleBudget));
        if (count) {
          particleBudget -= count;
          options.current.onBurst(centerX + (Math.random() - 0.5) * titleWidth * 0.65, centerY + (Math.random() - 0.5) * 38, count);
        }
      } else particleBudget = 0;
    });
    return () => {
      unsubscribe();
      resize.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [engine]);

  return (
    <section className="project-metadata" ref={root}>
      <h1 className="project-title" aria-label={projects[index].shortTitle}>
        {[0, 1].map((line) => (
          <span className={`title-reel ${line === 1 ? "title-line-secondary" : ""}`} key={line} aria-hidden="true">
            {projects.map((project, i) => (
              <span className="title-slot" data-title-slot={i} key={project.id}>
                <span className="title-solid">{project.title[line]}</span>
                <span className="title-slices">
                  {["top", "middle", "bottom"].map((slice) => (
                    <span className={`title-slice slice-${slice}`} key={slice}>{project.title[line]}</span>
                  ))}
                </span>
              </span>
            ))}
          </span>
        ))}
      </h1>
      <div className="metadata-reel" aria-label={`${projects[index].role}, ${projects[index].year}`}>
        {projects.map((project, i) => (
          <div className="metadata-slot" data-meta-slot={i} key={project.id} aria-hidden="true">
            <span className="role-badge">{project.role}</span>
            <span className="project-year">{project.year}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
