"use client";
import { useId, useLayoutEffect, useRef } from "react";
import { projects } from "@/data/projects";
import WarpedText from "./WarpedText";
import { reelOffset, type ScrollPhysics } from "@/lib/scrollPhysics";

export default function ProjectMetadata({
  index, engine, reducedMotion, onBurst, onView,
}: {
  onView: () => void;
  index: number;
  engine: ScrollPhysics;
  reducedMotion: boolean;
  onBurst: (x: number, y: number, count?: number) => void;
}) {
  const filterId = `title-scroll-${useId().replace(/:/g, "")}`;
  const displacement = useRef<SVGFEDisplacementMapElement>(null);
  const root = useRef<HTMLElement>(null);
  const options = useRef({ reducedMotion, onBurst });
  options.current = { reducedMotion, onBurst };

  useLayoutEffect(() => {
    const element = root.current!;
    const slots = Array.from(element.querySelectorAll<HTMLElement>("[data-title-slot],[data-meta-slot]"));
    const slotIndices = slots.map((slot) => Number(slot.dataset.titleSlot ?? slot.dataset.metaSlot));
    const titles = slots.map(slot=>slot.querySelector<HTMLElement>('h1'));
    let centerX = 0;
    let centerY = 0;
    let titleWidth = 0;
    let particleBudget = 0;
    let wasMoving = false;
    let semanticIndex = -1;
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
      const active = engine.read().index;
      if (active !== semanticIndex) {
        semanticIndex = active;
        element.querySelectorAll<HTMLElement>('[data-title-slot]').forEach((slot,i)=>{slot.setAttribute('aria-hidden',String(i!==active));const button=slot.querySelector('button')!;button.disabled=i!==active;button.tabIndex=i===active?0:-1;});
        element.querySelector('.metadata-reel')?.setAttribute('aria-label', `${projects[active].role}, ${projects[active].year}`);
      }
      const speed = Math.abs(scrollVelocity);
      const moving = !options.current.reducedMotion && speed > 0.02;
      if (moving !== wasMoving) {
        element.dataset.distorting = String(moving);
        wasMoving = moving;
      }
      displacement.current?.setAttribute("scale", String(moving ? scrollVelocity * 85 : 0));
      slots.forEach((slot, i) => {
        const offset = reelOffset(slotIndices[i], currentScroll, projects.length);
        const distance = Math.abs(offset);
        const opacity = Math.max(0, 1 - Math.pow(distance * 1.4, 2));
        const isTitle = slot.dataset.titleSlot !== undefined;
        slot.style.transform = isTitle ? `translate3d(0, ${offset * 135}%, 0)` : `translate3d(0, ${offset * 24}px, 0)`;
        slot.style.opacity = String(opacity);
        slot.style.visibility = opacity > 0 ? "visible" : "hidden";
        const blur = isTitle && distance > 0.001 ? `blur(${distance * 4}px)` : "";
        slot.style.filter = blur || "none";
        // Glitch only the headline; the single metadata row stays crisp.
        if(titles[i]) titles[i]!.style.filter = moving ? `url(#${filterId})` : "none";
      });
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
  }, [engine, filterId]);

  return (
    <section className="project-metadata" ref={root}>
      <svg className="warp-definitions" aria-hidden="true"><defs>
        <filter id={filterId} x="-50%" y="-50%" width="200%" height="200%" colorInterpolationFilters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency="0.001 0.18" numOctaves="1" seed="8" result="noise" />
          {/* Neutral green keeps the displacement strictly horizontal. */}
          <feColorMatrix in="noise" type="matrix" values="1 0 0 0 0  0 0 0 0 0.5  0 0 1 0 0  0 0 0 1 0" result="horizontalNoise" />
          <feDisplacementMap ref={displacement} in="SourceGraphic" in2="horizontalNoise" scale="0" xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </defs></svg>
      <div className="project-title title-stage cinema-title-stage">
        {projects.map((project,i)=>(
          <div className="title-slot cinema-title-slot" data-title-slot={i} key={project.id} aria-hidden={i!==index} style={{visibility:i===index?'visible':'hidden'}}>
            <h1 className="project-title">{project.title.map((line,j)=><span className={`title-solid ${j===1?'title-line-secondary':''}`} key={j}><WarpedText>{line}</WarpedText></span>)}</h1>
            <div className="metadata-slot cinema-metadata-row"><span className="role-badge">{project.role}</span><span className="project-year">{project.year}</span></div>
            <button className="view-project-button" onClick={onView} disabled={i!==index} tabIndex={i===index?0:-1}>View project</button>
          </div>
        ))}
      </div>
    </section>
  );
}
