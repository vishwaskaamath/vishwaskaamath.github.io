"use client";
import { refreshGeometry } from "@/lib/geometryCache";
import { assetUrl,cachedAsset,assetsReady } from "@/lib/assetPreloader";
import { useLayoutEffect, useEffect, useRef, useState, type RefObject } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { subscribeTicker } from "@/lib/masterTicker";
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
  const [leftCardVolume,setLeftCardVolume]=useState(.25);
  const [leftCardMuted,setLeftCardMuted]=useState(false);
  const stopRamp=useRef<(()=>void)|null>(null);
  const activeVideo=()=>root.current?.querySelector<HTMLVideoElement>('.video-card.is-active video');
  const changeVolume=(volume:number)=>{stopRamp.current?.();stopRamp.current=null;setLeftCardVolume(volume);setLeftCardMuted(volume===0);const video=activeVideo();if(video){video.volume=volume;video.muted=volume===0;}};
  const toggleMute=()=>{stopRamp.current?.();stopRamp.current=null;const muted=!leftCardMuted&&leftCardVolume>0;setLeftCardMuted(muted);const volume=leftCardVolume||.25;if(!muted&&leftCardVolume===0)setLeftCardVolume(volume);const video=activeVideo();if(video){video.volume=volume;video.muted=muted;}};
  useEffect(()=>{if(!expanded){stopRamp.current?.();stopRamp.current=null;}},[expanded]);
  useEffect(()=>()=>{stopRamp.current?.();},[]);
  const options = useRef({ paused, reducedMotion });
  options.current.paused = paused; options.current.reducedMotion = reducedMotion;
  useLayoutEffect(() => { if(paused)root.current?.querySelectorAll("video").forEach(video=>video.pause()); engine.invalidate(); }, [engine, paused, reducedMotion]);
  const wasExpanded = useRef(false);
  useLayoutEffect(() => {
    const card = root.current?.querySelector<HTMLElement>('.video-card.is-active');
    const video = card?.querySelector('video');
    if (!card || !video || wasExpanded.current === expanded) return;
    const active = engine.read().index;
    card.querySelector('button')!.setAttribute('aria-expanded', String(expanded));
    if (!reducedMotion) {
      card.querySelector('.video-hit')!.animate([
        {filter:'none'},
        {filter:'drop-shadow(-4px 0 0 rgba(255,0,80,.6)) drop-shadow(4px 0 0 rgba(0,230,255,.6))',offset:.2},
        {filter:'none'}
      ],{duration:180});
      card.querySelector('.expansion-scanlines')!.animate([{opacity:0},{opacity:.42,offset:.2},{opacity:0}],{duration:180});
    }
    if (!expanded) {
      video.muted = true;
      video.src = assetUrl(projects[active].video);
      video.currentTime = 0;
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
      // No layout reads, independent tweens, or React animation state in this loop.
      projects.forEach((_, i) => {
        const d = reelOffset(i, currentScroll, projects.length);
        const distance = Math.abs(d);
        const blend = Math.min(distance, 1);
        const visible = distance < 2;
        const fade = distance <= 1 ? 1 - distance * 0.64 : 0.36 * (2 - distance);
        const scale = 1 - blend * 0.3;
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
      refreshGeometry();
    };
    const visibility = () => playback(engine.read().index);
    const hydrate = () => {videos.forEach((video,i)=>{video.src=assetUrl(projects[i].video);video.poster=assetUrl(projects[i].poster);});engine.invalidate();};
    window.addEventListener('portfolio-assets-ready',hydrate);
    if(assetsReady())hydrate();
    resize();
    const unsubscribe = engine.subscribe(render);
    window.addEventListener("resize", resize);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      window.removeEventListener("portfolio-assets-ready",hydrate);
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
                aria-label={active ? `${expanded ? "Collapse" : "Expand"} ${project.shortTitle} preview` : `Select ${project.shortTitle}`}
                onClick={(event) => {
                  if (event.detail !== 0 && dragRef.current.wasDragged) return;
                  if (i === engine.read().index) {
                    if (expanded) { onCollapse(); return; }
                    const preview = event.currentTarget.querySelector('video')!;
                    preview.src = assetUrl(project.video.replace('.mp4', '-full.mp4'));
                    preview.currentTime = 0; preview.muted = false; preview.volume = 0;
                    setLeftCardMuted(leftCardVolume===0);stopRamp.current?.();
                    const rampStart=performance.now(),targetVolume=leftCardVolume;
                    stopRamp.current=subscribeTicker(now=>{const amount=Math.min(1,(now-rampStart)/200);preview.volume=targetVolume*amount;if(amount===1){stopRamp.current?.();stopRamp.current=null;}});
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
              {expanded&&active&&<div className="left-video-volume" role="group" aria-label="Expanded CRT video volume"
                onPointerDown={e=>e.stopPropagation()} onPointerMove={e=>e.stopPropagation()} onPointerUp={e=>e.stopPropagation()} onClick={e=>e.stopPropagation()}>
                <button type="button" onClick={toggleMute} aria-label={leftCardMuted||leftCardVolume===0?'Unmute CRT video':'Mute CRT video'} aria-pressed={leftCardMuted}>{leftCardMuted||leftCardVolume===0?<VolumeX size={14}/>:<Volume2 size={14}/>}</button>
                <input type="range" aria-label="CRT video volume" min="0" max="1" step=".01" value={leftCardVolume} onChange={e=>changeVolume(Number(e.target.value))}/>
              </div>}
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
