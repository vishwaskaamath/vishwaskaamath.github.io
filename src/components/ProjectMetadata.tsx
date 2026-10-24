"use client";
import { useLayoutEffect, useRef } from "react";
import gsap from "gsap";
import type { Project } from "@/data/projects";

export default function ProjectMetadata({
  project,
  direction,
  reducedMotion,
  onBurst,
}: {
  project: Project;
  direction: number;
  reducedMotion: boolean;
  onBurst: (x: number, y: number, count?: number) => void;
}) {
  const root = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (reducedMotion) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".title-glyph",
        { yPercent: direction * 115, rotationX: -direction * 25, opacity: 0.2 },
        {
          yPercent: 0,
          rotationX: 0,
          opacity: 1,
          duration: 0.85,
          stagger: 0.018,
          ease: "power3.out",
        },
      );
    }, root);
    const rect = root.current?.getBoundingClientRect();
    if (rect) onBurst(rect.x + rect.width / 2, rect.y + rect.height * 0.4, 55);
    return () => ctx.revert();
  }, [project.id, direction, reducedMotion, onBurst]);
  return (
    <section
      className="project-metadata"
      ref={root}
      aria-live="polite"
      aria-atomic="true"
    >
      <h1 className="project-title" aria-label={project.shortTitle}>
        {project.title.map((line, i) => (
          <span
            key={`${project.id}-${i}`}
            className={`title-line ${i === 1 ? "title-line-secondary" : ""}`}
            aria-hidden="true"
          >
            {Array.from(line).map((letter, j) => (
              <span className="glyph-mask" key={j}>
                <span className="title-glyph">
                  {letter === " " ? "\u00a0" : letter}
                </span>
              </span>
            ))}
          </span>
        ))}
      </h1>
    </section>
  );
}
