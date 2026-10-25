"use client";
import { useLayoutEffect, useRef, useState } from "react";
import { projects } from "@/data/projects";
import { reelOffset, type ReelFrame, type ScrollPhysics } from "@/lib/scrollPhysics";
import { SoftwareIcon } from "./SoftwareIcon";
import LiquidSurface from "./LiquidSurface";
import WarpedText from "./WarpedText";

export default function ProjectWheels({
  index, engine, reducedMotion, select, paused,
}: {
  index: number;
  engine: ScrollPhysics;
  reducedMotion: boolean;
  select: (i: number) => void;
  paused: boolean;
}) {
  const root = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState(false);
  const options = useRef({ expanded, paused, reducedMotion });
  options.current = { expanded, paused, reducedMotion };

  useLayoutEffect(() => {
    const element = root.current!;
    const cards = Array.from(element.querySelectorAll<HTMLElement>("[data-video]"));
    const icons = Array.from(element.querySelectorAll<HTMLElement>("[data-software]"));
    const captions = Array.from(element.querySelectorAll<HTMLElement>("[data-tool-caption]"));
    const videos = Array.from(element.querySelectorAll<HTMLVideoElement>("video"));
    let mobile = false;
    let gap = 0;
    let width = 0;
    let enlargement = 0;
    let lastIndex = -1;
    let lastPaused = true;

    const playback = (active: number) => {
      const isPaused = options.current.paused || document.hidden;
      videos.forEach((video, i) => {
        if (i === active && !isPaused) void video.play().catch(() => {});
        else video.pause();
      });
      lastPaused = isPaused;
    };
    const render = (frame: ReelFrame) => {
      const { currentScroll, scrollVelocity, index: active } = frame;
      if (lastIndex !== active) {
        options.current.expanded = false;
        enlargement = 0;
        setExpanded(false);
        playback(active);
        lastIndex = active;
      } else if (lastPaused !== (options.current.paused || document.hidden)) playback(active);
      const desired = options.current.expanded ? 0.055 : 0;
      enlargement = options.current.reducedMotion ? desired : enlargement + (desired - enlargement) * 0.14;
      element.style.setProperty("--reel-glitch", `${Math.min(0.15, Math.abs(scrollVelocity) * 0.06)}`);
      // No layout reads, independent tweens, or React animation state in this loop.
      projects.forEach((_, i) => {
        const d = reelOffset(i, currentScroll, projects.length);
        const distance = Math.abs(d);
        const blend = Math.min(distance, 1);
        const visible = distance < 2;
        const fade = distance <= 1 ? 1 - distance * 0.64 : 0.36 * (2 - distance);
        const scale = 1 - blend * 0.3 + enlargement * (1 - blend);
        cards[i].style.transform = `translate3d(${mobile ? d * gap : -distance * width * 0.115}px, ${mobile ? distance * 22 : d * gap}px, 0) translateY(-50%) rotate(${d * (mobile ? 7 : -18)}deg) scale(${scale})`;
        cards[i].style.opacity = `${Math.max(0, fade)}`;
        cards[i].style.visibility = visible ? "visible" : "hidden";
        cards[i].style.zIndex = `${Math.round(10 - distance * 3)}`;
        const iconFade = mobile ? Math.max(0, 1 - distance) : Math.max(0, distance <= 1 ? 1 - distance * 0.67 : 0.33 * (2 - distance));
        icons[i].style.transform = `translate3d(${mobile ? d * 90 : distance * width * 0.055}px, ${mobile ? 0 : d * gap}px, 0) translate(-50%, -50%) rotate(${d * (mobile ? 15 : 22)}deg) rotateY(${-12 * (1 - blend) + d * 9 * blend}deg) scale(${1 - blend * 0.24})`;
        icons[i].style.opacity = `${iconFade}`;
        icons[i].style.visibility = visible ? "visible" : "hidden";
        captions[i].style.transform = `translate3d(0, ${d * 100}%, 0)`;
        captions[i].style.visibility = distance < 1 ? "visible" : "hidden";
      });
    };
    const resize = () => {
      width = innerWidth;
      mobile = width < 760;
      const angle = (18 * Math.PI) / 180;
      const minimumGap = cards[0].offsetHeight * 1.055 / 2 +
        0.7 * (cards[0].offsetHeight * Math.cos(angle) + cards[0].offsetWidth * Math.sin(angle)) / 2 + 40;
      gap = mobile ? width * 0.94 : Math.max(225, innerHeight * (innerHeight < 650 ? 0.42 : 0.445), minimumGap);
      render(engine.read());
    };
    const visibility = () => playback(engine.read().index);
    resize();
    const unsubscribe = engine.subscribe(render);
    window.addEventListener("resize", resize);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      unsubscribe();
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", visibility);
      videos.forEach((video) => video.pause());
    };
  }, [engine]);

  return (
    <div className="project-wheels" ref={root}>
      <div className="arc arc-left" aria-hidden="true" />
      <div className="arc arc-right" aria-hidden="true" />
      <div className="video-wheel">
        {projects.map((project, i) => {
          const active = i === index;
          const nearby = Math.abs(reelOffset(i, index, projects.length)) <= 1;
          return (
            <div key={project.id} className={`video-card ${active ? "is-active" : ""}`} data-video={i} aria-hidden={!nearby}>
              <button className="video-hit" tabIndex={nearby ? 0 : -1}
                aria-label={active ? `${expanded ? "Reduce" : "Enlarge"} ${project.shortTitle} preview` : `Select ${project.shortTitle}`}
                onClick={() => {
                  if (i === engine.read().index) setExpanded((value) => !value);
                  else { setExpanded(false); select(i); }
                }}>
                <LiquidSurface className="video-lens"><div className="video-surface">
                  <video src={project.video} poster={project.poster} muted playsInline loop preload="auto" aria-label={`${project.shortTitle} preview`} />
                  <div className="crt-shading" />
                  <div className="glitch-flash" />
                </div></LiquidSurface>
              </button>
              <div className="video-corners" aria-hidden="true"><span /><span /><span /><span /></div>
            </div>
          );
        })}
      </div>
      <div className="software-wheel" aria-label={`Creative tools for ${projects[index].shortTitle}`}>
        {projects.map((project, i) => (
          <div key={project.id} className="software-position" data-software={i} aria-hidden={i !== index}>
            <LiquidSurface><SoftwareIcon software={project.software} /></LiquidSurface>
          </div>
        ))}
        <div className="tool-caption">
          {projects.map((project, i) => (
            <div key={project.id} className="tool-caption-slot" data-tool-caption={i} aria-hidden={i !== index}>
              <span className="micro-label"><WarpedText>THE TOOLKIT</WarpedText></span>
              <span><WarpedText>{project.tools.join(" + ")}</WarpedText></span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
