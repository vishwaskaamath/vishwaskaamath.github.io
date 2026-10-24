"use client";
import { useLayoutEffect, useRef } from "react";
import gsap from "gsap";
import { ArrowUpRight } from "lucide-react";
import type { Project } from "@/data/projects";

export default function ProjectMetadata({
  project,
  index,
  direction,
  reducedMotion,
  onOpen,
  onBurst,
}: {
  project: Project;
  index: number;
  direction: number;
  reducedMotion: boolean;
  onOpen: () => void;
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
      gsap.fromTo(
        ".meta-reveal",
        { y: 12, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.7,
          stagger: 0.075,
          delay: 0.12,
          ease: "power2.out",
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
      <div className="project-eyebrow meta-reveal">
        <span className="eyebrow-line" />
        SELECTED WORK
        <span className="project-number">
          {String(index + 1).padStart(2, "0")} <span>/ 05</span>
        </span>
      </div>
      <h1 className="project-title" aria-label={project.shortTitle}>
        {project.title.map((line, i) => (
          <span
            key={`${project.id}-${i}`}
            className={`title-line ${i === 1 ? "serif-italic" : ""}`}
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
      <div className="project-details meta-reveal">
        <span className="role-pill">
          <span />
          {project.role}
        </span>
        <span className="project-year">{project.year}</span>
      </div>
      <button className="project-cta meta-reveal" onClick={onOpen}>
        View project <ArrowUpRight size={18} strokeWidth={1.5} />
      </button>
    </section>
  );
}
