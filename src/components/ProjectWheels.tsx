"use client";
import { refreshGeometry } from "@/lib/geometryCache";
import { assetUrl,cachedAsset,assetsReady } from "@/lib/assetPreloader";
import { useLayoutEffect, useRef, type RefObject } from "react";
import { damp, subscribeTicker } from "@/lib/masterTicker";
import type { WheelDrag } from "@/hooks/useProjectWheel";
import { projects } from "@/data/projects";
import { reelOffset, type ReelFrame, type ScrollPhysics } from "@/lib/scrollPhysics";
import SoftwareTile from "./SoftwareTile";
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
    const captions = Array.from(element.closest('.work-scene')!.querySelectorAll<HTMLElement>("[data-tool-caption]"));
    const videos = Array.from(element.querySelectorAll<HTMLVideoElement>("video"));
    const centerTitle = element.closest('.work-scene')!.querySelector<HTMLElement>('.project-metadata')!;
    const activeLogoGroup = element.querySelector<HTMLElement>('.software-wheel')!;
    let mobile = false;
    let gap = 0;
    let width = 0;
    let lastIndex = -1;
    let lastPaused = true;

    const playback = (active: number) => {
      const isPaused = options.current.paused || document.hidden || engine.read().handoff>=1 || !assetsReady() || engine.view!=='work' || Math.abs(engine.read().scrollVelocity)>=.08 || Math.abs(reelOffset(active,engine.read().currentScroll,projects.length))>=.35;
      videos.forEach(video=>video.pause());
      videos.forEach((video, i) => {
        if (i === active && !isPaused) void video.play().catch(() => {});
        else video.pause();
      });
      lastPaused = isPaused;
    };
    const render = (frame: ReelFrame) => {
      if(engine.view!=='work'){videos.forEach(video=>video.pause());lastPaused=true;return;}
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
      } else if (lastPaused !== (options.current.paused || document.hidden || frame.handoff>=1 || !assetsReady() || engine.view!=='work' || Math.abs(scrollVelocity)>=.08 || Math.abs(reelOffset(active,currentScroll,projects.length))>=.35)) playback(active);
      element.style.setProperty("--reel-glitch", `${Math.min(0.15, Math.abs(scrollVelocity) * 0.06)}`);
      centerTitle.style.transform = `translate3d(calc(-50% + ${mobile ? 0 : p*16.5}vw), -50%, 0)`;
      activeLogoGroup.style.transform = `translate3d(${mobile ? 0 : p*12.5}vw,0,0)`;
      // No layout reads, independent tweens, or React animation state in this loop.
      projects.forEach((_, i) => {
        const d = reelOffset(i, currentScroll, projects.length);
        const distance = Math.abs(d);
        const theta = d * .68;
        const visible = distance < 1.45;
        const focus = Math.exp(-8*d*d);
        const fade = Math.max(0,1-Math.pow(distance,1.5)*.55);
        const scale = .64+.36*Math.exp(-1.8*d*d);
        const torque=(value:number,limit:number)=>Math.max(-limit,Math.min(limit,value));
        const pushX = mobile ? 0 : p*width*(focus*.015-(1-focus)*.045);
        const pushY = mobile ? 0 : Math.tanh(d*3)*(1-focus)*p*innerHeight*.14;
        const x=mobile?d*gap:(Math.cos(theta)-1)*width*.26;
        const y=mobile?distance*22:Math.sin(theta)*innerHeight*.54;
        cards[i].style.transform = `translate3d(${x+pushX}px, ${y+pushY}px, 0) translateY(-50%) rotateZ(${mobile?d*7:-d*28+torque(scrollVelocity*-2.5,6)}deg) scale(${scale*(1+p*focus*(mobile?.05:.68))})`;
        cards[i].style.opacity = `${Math.max(0, fade)}`;
        cards[i].style.visibility = visible ? "visible" : "hidden";
        cards[i].style.zIndex = `${Math.round(10 - distance * 3 + focus*p*30)}`;
        const iconFade = mobile ? Math.max(0,1-distance) : Math.max(0,1-Math.pow(distance,1.5)*.55);
        const iconX=mobile?d*90:(1-Math.cos(theta))*width*.34-(1-focus)*p*width*.10;
        icons[i].style.transform = `translate3d(${iconX}px, ${mobile?0:Math.sin(theta)*innerHeight*.52}px, 0) translate(-50%, -50%) rotateZ(${mobile?d*15:d*34+torque(scrollVelocity*4,10)}deg) scale(${.72+.28*Math.exp(-2*d*d)})`;
        icons[i].style.setProperty('--light-angle',`${135-d*40}deg`);
        icons[i].style.opacity = `${iconFade}`;
        icons[i].style.visibility = visible ? "visible" : "hidden";
        captions[i].style.opacity = String(focus);
        captions[i].style.visibility = distance < 1.5 ? "visible" : "hidden";
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
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", visibility);
      videos.forEach((video) => video.pause());
    };
  }, [engine]);

  return (
    <div className="project-wheels" ref={root}>
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
            <SoftwareTile software={project.tools[0].id} tools={project.tools} />
          </div>
        ))}
      </div>
    </div>
  );
}
