"use client";
import { useLayoutEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ArrowUpRight, Pause, Play } from "lucide-react";
import { projects } from "@/data/projects";
import { SoftwareIcon } from "./SoftwareIcon";

export function wheelOffset(i: number, index: number) {
  let diff = (i - index + projects.length) % projects.length;
  if (diff > projects.length / 2) diff -= projects.length;
  return diff;
}

export default function ProjectWheels({
  index,
  reducedMotion,
  select,
  onOpen,
  paused,
  setPaused,
}: {
  index: number;
  reducedMotion: boolean;
  select: (i: number) => void;
  onOpen: () => void;
  paused: boolean;
  setPaused: (v: boolean) => void;
}) {
  const root = useRef<HTMLDivElement>(null);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
  const previous = useRef(index);
  const initialized = useRef(false);
  const [expanded, setExpanded] = useState(false);
  useLayoutEffect(() => {
    const update = (immediate = false) => {
      const mobile = innerWidth < 760,
        compact = innerHeight < 650;
      const gap = mobile
        ? innerWidth * 0.94
        : Math.max(225, innerHeight * (compact ? 0.42 : 0.445));
      projects.forEach((_, i) => {
        const d = wheelOffset(i, index),
          active = d === 0;
        const common = {
          duration:
            reducedMotion || immediate || !initialized.current ? 0 : 1.02,
          ease: "power3.inOut",
          overwrite: true,
        };
        gsap.to(root.current!.querySelector(`[data-video="${i}"]`), {
          ...common,
          xPercent: 0,
          yPercent: -50,
          x: mobile ? d * gap : -Math.abs(d) * (innerWidth * 0.115),
          y: mobile ? Math.abs(d) * 22 : d * gap,
          rotation: mobile ? d * 7 : d * -18,
          scale: active ? (expanded ? 1.055 : 1) : 0.77,
          opacity: Math.abs(d) > 1 ? 0 : active ? 1 : 0.36,
          zIndex: active ? 5 : 1,
        });
        gsap.to(root.current!.querySelector(`[data-software="${i}"]`), {
          ...common,
          xPercent: -50,
          yPercent: -50,
          x: mobile ? d * 90 : Math.abs(d) * (innerWidth * 0.055),
          y: mobile ? 0 : d * gap,
          rotation: mobile ? d * 15 : d * 22,
          rotationY: active ? -12 : d * 9,
          scale: active ? 1 : 0.76,
          opacity:
            Math.abs(d) > 1 || (mobile && !active) ? 0 : active ? 1 : 0.33,
          zIndex: active ? 5 : 1,
        });
      });
    };
    update();
    initialized.current = true;
    const resize = () => update(true);
    window.addEventListener("resize", resize);
    if (previous.current !== index && !reducedMotion) {
      gsap.fromTo(
        `[data-video="${index}"] .video-surface`,
        { filter: "saturate(1.7) contrast(1.2)", x: 5 },
        {
          filter: "saturate(1) contrast(1)",
          x: 0,
          duration: 0.65,
          ease: "steps(6)",
        },
      );
      gsap.fromTo(
        `[data-video="${index}"] .glitch-flash`,
        { opacity: 0.7 },
        { opacity: 0, duration: 0.4, ease: "steps(4)" },
      );
    }
    previous.current = index;
    const targets = root.current!.querySelectorAll(
      "[data-video],[data-software],.video-surface,.glitch-flash",
    );
    return () => {
      window.removeEventListener("resize", resize);
      gsap.killTweensOf(targets);
    };
  }, [index, reducedMotion, expanded]);

  useLayoutEffect(() => {
    videoRefs.current.forEach((video, i) => {
      if (!video) return;
      if (i === index && !paused) {
        void video.play().catch(() => {});
      } else video.pause();
    });
    const visible = () =>
      videoRefs.current.forEach((video, i) => {
        if (!video) return;
        if (document.hidden) video.pause();
        else if (i === index && !paused) void video.play().catch(() => {});
      });
    document.addEventListener("visibilitychange", visible);
    return () => document.removeEventListener("visibilitychange", visible);
  }, [index, paused, reducedMotion]);

  return (
    <div className="project-wheels" ref={root}>
      <div className="arc arc-left" aria-hidden="true" />
      <div className="arc arc-right" aria-hidden="true" />
      <div className="video-wheel">
        {projects.map((project, i) => {
          const d = wheelOffset(i, index),
            active = d === 0;
          return (
            <div
              key={project.id}
              className={`video-card ${active ? "is-active" : ""}`}
              data-video={i}
              aria-hidden={Math.abs(d) > 1}
              style={{ visibility: Math.abs(d) > 1 ? "hidden" : "visible" }}
            >
              <button
                className="video-hit"
                tabIndex={active || Math.abs(d) === 1 ? 0 : -1}
                aria-label={
                  active
                    ? `${expanded ? "Reduce" : "Enlarge"} ${project.shortTitle} preview`
                    : `Select ${project.shortTitle}`
                }
                onClick={() => {
                  if (active) setExpanded((v) => !v);
                  else {
                    setExpanded(false);
                    select(i);
                  }
                }}
              >
                <div className="video-surface">
                  {active ? (
                    <video
                      ref={(el) => {
                        videoRefs.current[i] = el;
                      }}
                      src={project.video}
                      poster={project.poster}
                      muted
                      playsInline
                      loop
                      preload="auto"
                      aria-label={`${project.shortTitle} preview`}
                    />
                  ) : (
                    <img src={project.poster} alt="" draggable={false} />
                  )}
                  <div className="crt-shading" />
                  <div className="glitch-flash" />
                </div>
              </button>
              <div className="video-corners" aria-hidden="true">
                <span />
                <span />
                <span />
                <span />
              </div>
              {active && (
                <>
                  <span className="video-bug">
                    <span
                      className={paused ? "status-led paused" : "status-led"}
                    />{" "}
                    {paused ? "PAUSED" : "IN MOTION"}
                  </span>
                  <div className="video-toolbar">
                    <span>{project.kind}</span>
                    <div>
                      <button
                        aria-label={paused ? "Play preview" : "Pause preview"}
                        onClick={() => setPaused(!paused)}
                      >
                        {paused ? <Play size={13} /> : <Pause size={13} />}
                      </button>
                      <button aria-label="Open project film" onClick={onOpen}>
                        <ArrowUpRight size={15} />
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
      <div
        className="software-wheel"
        aria-label={`Creative tools for ${projects[index].shortTitle}`}
      >
        {projects.map((project, i) => (
          <div
            key={project.id}
            className="software-position"
            data-software={i}
            aria-hidden={i !== index}
          >
            <SoftwareIcon software={project.software} />
          </div>
        ))}
        <div className="tool-caption">
          <span className="micro-label">THE TOOLKIT</span>
          <span>{projects[index].tools.join(" + ")}</span>
        </div>
      </div>
    </div>
  );
}
