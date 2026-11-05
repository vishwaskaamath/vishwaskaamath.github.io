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
    const toolkit=element.closest('.work-scene')!.querySelector<HTMLElement>('.work-toolkit-static')!;
    let alignLeft=0,alignRight=0;
    let rightEdges:number[]=[],rightCenters:number[]=[],rightY:number[]=[];
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
      const alignment=1-Math.pow(1-frame.heroProgress,3);
      toolkit.style.translate=mobile?'none':`${((rightEdges[active]??alignRight)+(rightCenters[active]??0))*alignment}px 0`;
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
        const retreat=1+alignment*.1*(1-focus),flat=1-alignment*focus;
        const x=mobile?d*gap:(Math.cos(theta)-1)*width*.26*retreat+alignLeft*alignment*focus;
        const y=mobile?(1-alignment)*18:Math.sin(theta)*innerHeight*.64*retreat;
        cards[i].style.transform = `translate3d(${x+pushX}px, ${y+pushY}px, 0) translateY(-50%) perspective(var(--perspective)) rotateY(${mobile?'0deg':`calc(var(--arc-rotate) * ${flat})`}) rotateZ(${(mobile?torque(d*3,4):torque(-d*10+torque(scrollVelocity*-1.5,3)-2*focus,12))*flat}deg) scale(${scale*(1+p*focus*(mobile?.05:.68))*(1-.04*alignment*focus)})`;
        cards[i].style.opacity = `${Math.max(0, fade)*(1-alignment*.3*(1-focus))*(mobile?.75+.25*alignment:1)}`;
        cards[i].style.visibility = visible ? "visible" : "hidden";
        cards[i].style.zIndex = `${Math.round(10 - distance * 3 + focus*p*30)}`;
        const iconFade = mobile ? Math.max(0,1-distance) : Math.max(0,1-Math.pow(distance,1.5)*.55);
        const iconX=mobile?d*90:(1-Math.cos(theta))*width*.34*retreat-(1-focus)*p*width*.10+(rightEdges[i]??alignRight)*alignment*focus;
        icons[i].style.transform = `translate3d(${iconX}px, ${mobile?(1-alignment)*24:Math.sin(theta)*innerHeight*.64*retreat-(rightY[i]??0)*alignment*focus}px, 0) translate(-50%, -50%) perspective(var(--perspective)) rotateY(${mobile?'0deg':`calc(-1 * var(--arc-rotate) * ${flat})`}) rotateZ(${(mobile?torque(d*3,4):torque(d*10+torque(scrollVelocity*2,3)+2*focus,12))*flat}deg) scale(${.72+.28*Math.exp(-2*d*d)})`;
        icons[i].dataset.alignment=String(alignment*focus);
        icons[i].style.setProperty('--light-angle',`${135-d*40}deg`);
        icons[i].style.opacity = `${iconFade*(1-alignment*.3*(1-focus))*(mobile?.75+.25*alignment:1)}`;
        icons[i].style.visibility = visible ? "visible" : "hidden";
        captions[i].style.opacity = String(focus);
        captions[i].style.visibility = distance < 1.5 ? "visible" : "hidden";
      });
    };
    const resize = () => {
      width = innerWidth;
      mobile = width < 768;
      const videoBox=element.querySelector<HTMLElement>('.video-wheel')!.getBoundingClientRect();
      if(videoBox.width<1)return;
      const textBox=centerTitle.getBoundingClientRect(),iconBox=activeLogoGroup.getBoundingClientRect();
      const gapSize=width*.035;
      alignLeft=width*.5-textBox.width/2-gapSize-videoBox.width*.96/2-(videoBox.left+videoBox.width/2);
      alignRight=width*.5+textBox.width/2+gapSize+iconBox.width/2-iconBox.left;
      rightEdges=[];rightCenters=[];rightY=[];
      projects.forEach(project=>{
        const count=project.tools.length,w=iconBox.width;
        const poses=count===1?[[0,0,1]]:count===2?[[-24,-16,.84],[28,18,.76]]:[[-28,-18,.78],[28,-6,.73],[0,26,.68]];
        const left=Math.min(...poses.map(([x,y,s])=>x-w*s/2)),right=Math.max(...poses.map(([x,y,s])=>x+w*s/2));
        const top=Math.min(...poses.map(([x,y,s])=>y-w*s/2)),bottom=Math.max(...poses.map(([x,y,s])=>y+w*s/2));
        rightEdges.push(width*.5+textBox.width/2+gapSize-iconBox.left-left);
        rightCenters.push((left+right)/2);rightY.push((top+bottom)/2);
      });
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
    document.fonts.ready.then(()=>{if(element.isConnected)resize();});
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
    const layoutObserver=new ResizeObserver(resize);
    layoutObserver.observe(element);
    layoutObserver.observe(centerTitle);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      window.removeEventListener("portfolio-assets-ready",hydrate);
      unsubscribe();
      stopExpansion();
      layoutObserver.disconnect();
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
