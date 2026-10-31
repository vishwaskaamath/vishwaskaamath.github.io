"use client";
import { refreshGeometry } from "@/lib/geometryCache";
import { assetUrl,cachedAsset,assetsReady } from "@/lib/assetPreloader";
import { useLayoutEffect, useRef, type RefObject } from "react";
import { damp, subscribeTicker } from "@/lib/masterTicker";
import type { WheelDrag } from "@/hooks/useProjectWheel";
import { projects } from "@/data/projects";
import { reelOffset, type ReelFrame, type ScrollPhysics } from "@/lib/scrollPhysics";
import SoftwareTile from "./SoftwareTile";
import WarpedText from "./WarpedText";
import VideoBezel from "./VideoBezel";

export default function ProjectWheels({
  index, engine, reducedMotion, select, paused, expanded, onExpand, onCollapse, dragRef,
}: {
  dragRef: RefObject<WheelDrag>;
  index: number;
  engine: ScrollPhysics;
  reducedMotion: boolean;
  select: (i: number) => void;
  paused: boolean;
  expanded: boolean;
  onExpand: () => void;
  onCollapse: () => void;
}) {
  const root = useRef<HTMLDivElement>(null);
  const expandProgress = useRef(0);
  const options = useRef({ paused, reducedMotion, expanded });
  options.current = { paused, reducedMotion, expanded };
  useLayoutEffect(() => { if(paused)root.current?.querySelectorAll("video").forEach(video=>video.pause()); engine.invalidate(); }, [engine, paused, reducedMotion]);
  const wasExpanded = useRef(false);
  useLayoutEffect(() => {
    const card = root.current?.querySelector<HTMLElement>('.video-card.is-active');
    const video = card?.querySelector('video');
    if (!card || !video || wasExpanded.current === expanded) return;
    card.querySelector('button')!.setAttribute('aria-expanded', String(expanded));
    if (!expanded) {
      video.muted = true;
      if (!paused) void video.play().catch(() => {});
    }
    wasExpanded.current = expanded;
  }, [expanded, engine, paused, reducedMotion]);


  useLayoutEffect(() => {
    const element = root.current!;
    const cards = Array.from(element.querySelectorAll<HTMLElement>("[data-video]"));
    const icons = Array.from(element.querySelectorAll<HTMLElement>("[data-software]"));
    const captions = Array.from(element.querySelectorAll<HTMLElement>("[data-tool-caption]"));
    const videos = Array.from(element.querySelectorAll<HTMLVideoElement>("video"));
    const centerTitle = element.closest('.work-scene')!.querySelector<HTMLElement>('.project-metadata')!;
    const activeLogoGroup = element.querySelector<HTMLElement>('.software-wheel')!;
    let mobile = false;
    let gap = 0;
    let width = 0;
    let lastIndex = -1;
    let lastPaused = true;

    const playback = (active: number) => {
      const isPaused = options.current.paused || document.hidden || !assetsReady();
      videos.forEach(video=>video.pause());
      videos.forEach((video, i) => {
        if (i === active && !isPaused) void video.play().catch(() => {});
        else video.pause();
      });
      lastPaused = isPaused;
    };
    const render = (frame: ReelFrame) => {
      const p = expandProgress.current;
      const { currentScroll, scrollVelocity, index: active } = frame;
      if (lastIndex !== active) {
        playback(active);
        lastIndex = active;
        element.querySelector('.software-wheel')?.setAttribute('aria-label', `Creative tools for ${projects[active].shortTitle}`);
        cards.forEach((card, i) => {
          const nearby = Math.abs(reelOffset(i, active, projects.length)) <= 1;
          card.classList.toggle('is-active', i === active);
          card.setAttribute('aria-hidden', String(!nearby));
          const hit = card.querySelector('button')!;
          hit.tabIndex = nearby ? 0 : -1;
          hit.setAttribute('aria-label', i === active ? `Expand ${projects[i].shortTitle} preview` : `Select ${projects[i].shortTitle}`);
          icons[i].setAttribute('aria-hidden', String(i !== active));
          captions[i].setAttribute('aria-hidden', String(i !== active));
        });
      } else if (lastPaused !== (options.current.paused || document.hidden)) playback(active);
      element.style.setProperty("--reel-glitch", `${Math.min(0.15, Math.abs(scrollVelocity) * 0.06)}`);
      centerTitle.style.transform = `translate3d(calc(-50% + ${mobile ? 0 : p*16.5}vw), -50%, 0)`;
      activeLogoGroup.style.transform = `translate3d(${mobile ? 0 : p*12.5}vw,0,0)`;
      // No layout reads, independent tweens, or React animation state in this loop.
      projects.forEach((_, i) => {
        const d = reelOffset(i, currentScroll, projects.length);
        const distance = Math.abs(d);
        const blend = Math.min(distance, 1);
        const visible = distance < 2;
        const fade = distance <= 1 ? 1 - distance * 0.64 : 0.36 * (2 - distance);
        const scale = 1 - blend * 0.3;
        const isActive = i===active;
        const pushX = mobile ? 0 : p*width*(isActive ? .015 : -.045);
        const pushY = mobile || isActive ? 0 : Math.sign(d)*p*innerHeight*.14;
        cards[i].style.transform = `translate3d(${(mobile ? d * gap : -distance * width * 0.115)+pushX}px, ${(mobile ? distance * 22 : d * gap)+pushY}px, 0) translateY(-50%) rotate(${d * (mobile ? 7 : -18)}deg) scale(${scale*(isActive ? 1+p*(mobile ? .05 : .68) : 1)})`;
        cards[i].style.opacity = `${Math.max(0, fade)}`;
        cards[i].style.visibility = visible ? "visible" : "hidden";
        cards[i].style.zIndex = `${Math.round(10 - distance * 3 + (isActive?p*30:0))}`;
        const iconFade = mobile ? Math.max(0, 1 - distance) : Math.max(0, distance <= 1 ? 1 - distance * 0.67 : 0.33 * (2 - distance));
        icons[i].style.transform = `translate3d(${mobile ? d * 90 : distance * width * 0.055-(isActive?0:p*width*.10)}px, ${mobile ? 0 : d * gap}px, 0) translate(-50%, -50%) rotate(${d * (mobile ? 15 : 22)}deg) rotateY(${-12 * (1 - blend) + d * 9 * blend}deg) scale(${1 - blend * 0.24})`;
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
      // Keep the existing orbital spacing based on the original 32vw × 36vh
      // footprint; only the rendered desktop cards are now five percent smaller.
      const spacingWidth = mobile ? cards[0].offsetWidth : Math.round(width * .32);
      const spacingHeight = mobile ? cards[0].offsetHeight : Math.round(innerHeight * .36);
      const minimumGap = spacingHeight * 1.055 / 2 +
        0.7 * (spacingHeight * Math.cos(angle) + spacingWidth * Math.sin(angle)) / 2 + 40;
      gap = mobile ? width * 0.94 : Math.max(225, innerHeight * (innerHeight < 650 ? 0.42 : 0.445), minimumGap);
      render(engine.read());
      refreshGeometry();
    };
    const visibility = () => playback(engine.read().index);
    const hydrate = () => {videos.forEach((video,i)=>{video.src=assetUrl(projects[i].video);video.poster=assetUrl(projects[i].poster);});engine.invalidate();};
    window.addEventListener('portfolio-assets-ready',hydrate);
    if(assetsReady())hydrate();
    resize();
    const unsubscribe = engine.subscribe(render);
    const toolkit=element.querySelector<HTMLElement>('.tool-caption')!;
    // Convert viewport bounds to the translated wheel's local coordinate space.
    // This follows the primary slab, including its real 3D orbit and hover tilt.
    let previousCaption='';
    const stopCaption=subscribeTicker(()=>{
      if(element.closest('[inert]'))return;
      const cube=icons[engine.read().index].querySelector<HTMLElement>('[data-orbit-cube]');
      if(!cube)return;
      const box=cube.getBoundingClientRect(),parent=activeLogoGroup.getBoundingClientRect();
      const x=box.left+box.width/2-parent.left,y=box.bottom+22-parent.top;
      const key=`${x.toFixed(2)},${y.toFixed(2)}`;
      if(key===previousCaption)return;
      previousCaption=key;toolkit.style.left=`${x}px`;toolkit.style.top=`${y}px`;toolkit.style.transform='translate3d(-50%,0,0)';
    });
    const stopExpansion = subscribeTicker((_now,dt)=>{
      const target=options.current.expanded?1:0,previous=expandProgress.current;
      if(previous===target)return;
      const next=options.current.reducedMotion?target:damp(previous,target,10,dt);
      expandProgress.current=Math.abs(next-target)<.0001?target:next;
      render(engine.read());
      if(expandProgress.current===target)refreshGeometry();
    });
    window.addEventListener("resize", resize);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      window.removeEventListener("portfolio-assets-ready",hydrate);
      unsubscribe();
      stopExpansion();
      stopCaption();
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
                aria-label={active ? `${expanded ? "Collapse" : "Expand"} ${project.shortTitle} preview` : `Select ${project.shortTitle}`}
                onClick={(event) => {
                  if (event.detail !== 0 && dragRef.current.wasDragged) return;
                  if (i === engine.read().index) {
                    if (expanded) { onCollapse(); return; }
                    const preview = event.currentTarget.querySelector('video')!;
                    // Keep the decoded stream and timestamp; replacing src here
                    // caused a blank frame and decode stall on every click.
                    preview.muted = false; preview.volume = 1;
                    void preview.play().catch(() => {});
                    onExpand();
                  } else { select(i); }
                }}>
                <VideoBezel><div className="video-surface">
                  <video src={cachedAsset(project.video)} poster={cachedAsset(project.poster)} muted playsInline loop preload="none" aria-label={`${project.shortTitle} preview`} />
                  <div className="crt-shading" />
                  <div className="glitch-flash" />
                  <div className="expansion-scanlines" aria-hidden="true"/>
                </div></VideoBezel>
              </button>
            </div>
          );
        })}
      </div>
      <div className="software-wheel" aria-label={`Creative tools for ${projects[index].shortTitle}`}>
        {projects.map((project, i) => (
          <div key={project.id} className="software-position" data-software={i} aria-hidden={i !== index}>
            <SoftwareTile software={project.software} tools={project.tools} />
          </div>
        ))}
        <div className="tool-caption">
          {projects.map((project, i) => (
            <div key={project.id} className="tool-caption-slot" data-tool-caption={i} aria-hidden={i !== index}>
              <span className="micro-label"><WarpedText>THE TOOLKIT</WarpedText></span>
              <span><WarpedText>{project.tools.map(tool => tool.label).join(" + ")}</WarpedText></span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
