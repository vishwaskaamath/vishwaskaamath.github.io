"use client";
import { refreshGeometry } from "@/lib/geometryCache";
import { assetUrl, cachedAsset, assetsReady } from "@/lib/assetPreloader";
import { useLayoutEffect, useRef, type RefObject } from "react";
import { damp, subscribeTicker } from "@/lib/masterTicker";
import type { WheelDrag } from "@/hooks/useProjectWheel";
import { projects } from "@/data/projects";
import {
  reelOffset,
  type ReelFrame,
  type ScrollPhysics,
} from "@/lib/scrollPhysics";
import { localPointer, spring, stepSpring } from "@/lib/tiltPhysics";
import SoftwareTile from "./SoftwareTile";
import VideoBezel from "./VideoBezel";

// Desktop arc geometry. Each column rides the rim of an off-screen wheel.
// ARC_STEP: angle between neighbouring items in radians; larger = tighter curve.
// ARC_REACH: vertical distance to a neighbour, as a fraction of viewport height.
// ARC_FOLLOW: how much items rotate to follow the rim (1 = fully radial).
const ARC_STEP = 1.1;
const ARC_REACH = 0.3;
const ARC_FOLLOW = 0.35;

export default function ProjectWheels({
  index,
  engine,
  reducedMotion,
  select,
  paused,
  expanded,
  onExpand,
  onCollapse,
  dragRef,
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
  useLayoutEffect(() => {
    if (paused)
      root.current?.querySelectorAll("video").forEach((video) => video.pause());
    engine.invalidate();
  }, [engine, paused, reducedMotion]);
  const wasExpanded = useRef(false);
  useLayoutEffect(() => {
    const card = root.current?.querySelector<HTMLElement>(
      ".video-card.is-active",
    );
    const video = card?.querySelector("video");
    if (!card || !video || wasExpanded.current === expanded) return;
    card
      .querySelector("button")!
      .setAttribute("aria-expanded", String(expanded));
    if (!expanded) {
      video.muted = true;
      if (!paused) void video.play().catch(() => {});
    }
    wasExpanded.current = expanded;
  }, [expanded, engine, paused, reducedMotion]);

  useLayoutEffect(() => {
    const element = root.current!;
    const cards = Array.from(
      element.querySelectorAll<HTMLElement>("[data-video]"),
    );
    const icons = Array.from(
      element.querySelectorAll<HTMLElement>("[data-software]"),
    );
    const captions = Array.from(
      element
        .closest(".work-scene")!
        .querySelectorAll<HTMLElement>("[data-tool-caption]"),
    );
    const videos = Array.from(
      element.querySelectorAll<HTMLVideoElement>("video"),
    );
    const centerTitle = element
      .closest(".work-scene")!
      .querySelector<HTMLElement>(".project-metadata")!;
    const activeLogoGroup =
      element.querySelector<HTMLElement>(".software-wheel")!;
    const toolkit = document.querySelector<HTMLElement>(".work-toolkit-static");
    const videoWheel = element.querySelector<HTMLElement>(".video-wheel")!;
    let mobile = false;
    let gap = 0;
    let width = 0;
    let lastIndex = -1;
    let lastPaused = true;
    // Desktop wheel geometry, measured in resize() from untransformed layout.
    let radius = 0;
    let cardOriginX = 0,
      cardOriginY = 0,
      cardW = 1,
      cardH = 1;
    let iconOriginX = 0,
      iconOriginY = 0,
      iconSize = 1;
    // Per-item hover physics and the hit boxes from the latest render.
    const makeTilt = () => ({
      rx: spring(),
      ry: spring(),
      lift: spring(),
      glare: spring(),
      gx: 50,
      gy: 50,
    });
    const cardTilt = projects.map(makeTilt),
      iconTilt = projects.map(makeTilt);
    const cardHit = projects.map(() => ({ cx: 0, cy: 0, hw: 0, hh: 0, rz: 0 })),
      iconHit = projects.map(() => ({ cx: 0, cy: 0, hw: 0, hh: 0, rz: 0 }));
    const visibleItems = projects.map(() => false);
    const pointer = { x: 0, y: 0, active: false };
    const finePointer = matchMedia("(hover: hover) and (pointer: fine)");
    const clampTo = (value: number, limit: number) =>
      Math.max(-limit, Math.min(limit, value));
    const degrees = 180 / Math.PI;

    const playback = (active: number) => {
      const isPaused =
        options.current.paused ||
        document.hidden ||
        engine.read().handoff >= 1 ||
        !assetsReady() ||
        engine.view !== "work" ||
        Math.abs(engine.read().scrollVelocity) >= 0.08 ||
        Math.abs(
          reelOffset(active, engine.read().currentScroll, projects.length),
        ) >= 0.35;
      videos.forEach((video) => video.pause());
      videos.forEach((video, i) => {
        if (i === active && !isPaused) void video.play().catch(() => {});
        else video.pause();
      });
      lastPaused = isPaused;
    };
    const render = (frame: ReelFrame) => {
      if (engine.view !== "work") {
        videos.forEach((video) => video.pause());
        lastPaused = true;
        return;
      }
      const p = expandProgress.current;
      const { currentScroll, scrollVelocity, index: active } = frame;
      if (lastIndex !== active) {
        playback(active);
        lastIndex = active;
        element
          .querySelector(".software-wheel")
          ?.setAttribute(
            "aria-label",
            `Creative tools for ${projects[active].shortTitle}`,
          );
        cards.forEach((card, i) => {
          const nearby = Math.abs(reelOffset(i, active, projects.length)) <= 1;
          // Previews stream on demand: buffer the active clip and its
          // neighbours so the next scroll step is ready, leave the rest idle.
          videos[i].preload = nearby ? "auto" : "none";
          card.classList.toggle("is-active", i === active);
          card.setAttribute("aria-hidden", String(!nearby));
          const hit = card.querySelector("button")!;
          hit.tabIndex = nearby ? 0 : -1;
          hit.setAttribute(
            "aria-label",
            i === active
              ? `Expand ${projects[i].shortTitle} preview`
              : `Select ${projects[i].shortTitle}`,
          );
          icons[i].setAttribute("aria-hidden", String(i !== active));
          captions[i].setAttribute("aria-hidden", String(i !== active));
        });
      } else if (
        lastPaused !==
        (options.current.paused ||
          document.hidden ||
          frame.handoff >= 1 ||
          !assetsReady() ||
          engine.view !== "work" ||
          Math.abs(scrollVelocity) >= 0.08 ||
          Math.abs(reelOffset(active, currentScroll, projects.length)) >= 0.35)
      )
        playback(active);
      element.style.setProperty(
        "--reel-glitch",
        `${Math.min(0.15, Math.abs(scrollVelocity) * 0.06)}`,
      );
      centerTitle.style.transform = `translate3d(calc(-50% + ${mobile ? 0 : p * 16.5}vw), -50%, 0)`;
      activeLogoGroup.style.transform = `translate3d(${mobile ? 0 : p * 12.5}vw,0,0)`;
      // The toolkit caption sits outside the wheel: move it with the logos
      // (the `translate` property stacks with its centring transform).
      if (toolkit) toolkit.style.translate = `${mobile ? 0 : p * 12.5}vw 0`;
      // No layout reads, independent tweens, or React animation state in this loop.
      projects.forEach((_, i) => {
        const d = reelOffset(i, currentScroll, projects.length);
        const distance = Math.abs(d);
        const visible = distance < 1.45;
        visibleItems[i] = visible;
        const focus = Math.exp(-8 * d * d);
        const fade = Math.max(0, 1 - Math.pow(distance, 1.5) * 0.55);
        const scale = 0.64 + 0.36 * Math.exp(-1.8 * d * d);
        // Desktop: both columns ride the rim of an off-screen wheel. The video
        // wheel hub sits to the left and the software wheel hub to the right,
        // so the two arcs mirror each other around the title.
        const theta = d * ARC_STEP;
        const rimX = radius * (Math.cos(theta) - 1);
        const rimY = radius * Math.sin(theta);
        const spin = scrollVelocity * 1.5;
        const pushX = mobile
          ? 0
          : p * width * (focus * 0.015 - (1 - focus) * 0.045);
        const pushY = mobile
          ? 0
          : Math.tanh(d * 3) * (1 - focus) * p * innerHeight * 0.14;
        const x = mobile ? d * gap : rimX;
        const y = mobile ? 0 : rimY;
        const cardScale = scale * (1 + p * focus * (mobile ? 0.05 : 0.68));
        const cardRz = mobile
          ? clampTo(d * 3, 4)
          : clampTo(theta * ARC_FOLLOW * degrees - clampTo(spin, 3), 30);
        const ct = cardTilt[i];
        cardHit[i] = {
          cx: cardOriginX + x + pushX,
          cy: cardOriginY + y + pushY,
          hw: (cardW / 2) * cardScale,
          hh: (cardH / 2) * cardScale,
          rz: cardRz,
        };
        cards[i].style.transform =
          `translate3d(${x + pushX}px, ${y + pushY}px, 0) translateY(-50%) perspective(var(--perspective)) rotateY(${mobile ? "0deg" : "var(--arc-rotate)"}) rotateZ(${cardRz}deg) rotateX(${ct.rx.value}deg) rotateY(${ct.ry.value}deg) translateZ(${ct.lift.value}px) scale(${cardScale})`;
        cards[i].style.setProperty("--glare", ct.glare.value.toFixed(3));
        cards[i].style.setProperty("--glare-x", `${ct.gx}%`);
        cards[i].style.setProperty("--glare-y", `${ct.gy}%`);
        cards[i].style.opacity = `${Math.max(0, fade)}`;
        cards[i].style.visibility = visible ? "visible" : "hidden";
        cards[i].style.zIndex =
          `${Math.round(10 - distance * 3 + focus * p * 30 + (ct.lift.value > 1 ? 5 : 0))}`;
        const iconFade = mobile
          ? Math.max(0, 1 - distance)
          : Math.max(0, 1 - Math.pow(distance, 1.5) * 0.55);
        const iconX = mobile ? d * 90 : -rimX - (1 - focus) * p * width * 0.1;
        const iconY = mobile ? 0 : rimY;
        const iconScale = 0.72 + 0.28 * Math.exp(-2 * d * d);
        const iconRz = mobile
          ? clampTo(d * 3, 4)
          : clampTo(-theta * ARC_FOLLOW * degrees + clampTo(spin, 3), 30);
        const it = iconTilt[i];
        iconHit[i] = {
          cx: iconOriginX + iconX,
          cy: iconOriginY + iconY,
          hw: (iconSize / 2) * iconScale,
          hh: (iconSize / 2) * iconScale,
          rz: iconRz,
        };
        icons[i].style.transform =
          `translate3d(${iconX}px, ${iconY}px, 0) translate(-50%, -50%) perspective(var(--perspective)) rotateY(${mobile ? "0deg" : "calc(-1 * var(--arc-rotate))"}) rotateZ(${iconRz}deg) rotateX(${it.rx.value}deg) rotateY(${it.ry.value}deg) translateZ(${it.lift.value}px) scale(${iconScale})`;
        icons[i].style.setProperty("--light-angle", `${135 - d * 40}deg`);
        icons[i].style.opacity = `${iconFade}`;
        icons[i].style.visibility = visible ? "visible" : "hidden";
        captions[i].style.opacity = String(focus);
        captions[i].style.visibility = distance < 1.5 ? "visible" : "hidden";
      });
    };
    const resize = () => {
      width = innerWidth;
      mobile = width < 768;
      const angle = (18 * Math.PI) / 180;
      const spacingWidth = mobile
        ? cards[0].offsetWidth
        : Math.round(width * 0.32);
      const spacingHeight = mobile
        ? cards[0].offsetHeight
        : Math.round(innerHeight * 0.36);
      const minimumGap =
        (spacingHeight * 1.055) / 2 +
        (0.7 *
          (spacingHeight * Math.cos(angle) + spacingWidth * Math.sin(angle))) /
          2 +
        40;
      gap = mobile
        ? width * 0.94
        : Math.max(
            225,
            innerHeight * (innerHeight < 650 ? 0.42 : 0.445),
            minimumGap,
          );
      // Wheel radius that puts each neighbour ARC_REACH of the viewport height
      // above or below the active item.
      radius = (innerHeight * ARC_REACH) / Math.sin(ARC_STEP);
      // offset* values ignore transforms, so these are the resting anchors.
      cardW = cards[0].offsetWidth;
      cardH = cards[0].offsetHeight;
      cardOriginX = videoWheel.offsetLeft + cardW / 2;
      cardOriginY = videoWheel.offsetTop;
      iconSize = icons[0].offsetWidth;
      iconOriginX = activeLogoGroup.offsetLeft;
      iconOriginY = activeLogoGroup.offsetTop;
      render(engine.read());
      refreshGeometry();
    };
    // Hover tilt: each visible video and tile leans towards the cursor on a
    // damped spring, lifts off the arc, and catches a moving highlight. Reel
    // speed also pitches the cards, so a flick makes them sway and settle.
    const movePointer = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      pointer.x = event.clientX;
      pointer.y = event.clientY;
      pointer.active = true;
    };
    const leavePointer = () => {
      pointer.active = false;
    };
    let tiltMoving = false;
    const stopTilt = subscribeTicker((_now, dt) => {
      if (engine.view !== "work" || document.hidden) return;
      const frame = engine.read();
      const enabled =
        !mobile &&
        finePointer.matches &&
        !options.current.reducedMotion &&
        !options.current.paused &&
        !options.current.expanded &&
        expandProgress.current < 0.01;
      const sway = enabled ? clampTo(-frame.scrollVelocity * 4, 10) : 0;
      let moving = false;
      const update = (
        tilt: (typeof cardTilt)[number],
        hit: (typeof cardHit)[number],
        visible: boolean,
        maxX: number,
        maxY: number,
        maxLift: number,
      ) => {
        let local = { x: 9, y: 9 };
        if (enabled && visible && pointer.active)
          local = localPointer(
            pointer.x,
            pointer.y,
            hit.cx,
            hit.cy,
            hit.hw,
            hit.hh,
            hit.rz,
          );
        const hovering = Math.abs(local.x) <= 1 && Math.abs(local.y) <= 1;
        if (hovering) {
          tilt.gx = (local.x + 1) * 50;
          tilt.gy = (local.y + 1) * 50;
        }
        const settled = [
          stepSpring(tilt.rx, (hovering ? -local.y * maxX : 0) + sway, dt),
          stepSpring(tilt.ry, hovering ? local.x * maxY : 0, dt),
          stepSpring(tilt.lift, hovering ? maxLift : 0, dt),
          stepSpring(tilt.glare, hovering ? 1 : 0, dt),
        ].every(Boolean);
        if (!settled) moving = true;
      };
      projects.forEach((_, i) => {
        update(cardTilt[i], cardHit[i], visibleItems[i], 10, 14, 36);
        update(iconTilt[i], iconHit[i], visibleItems[i], 16, 20, 28);
      });
      if (moving || tiltMoving) render(frame);
      if (!moving && tiltMoving) refreshGeometry();
      tiltMoving = moving;
    });
    const visibility = () => playback(engine.read().index);
    const hydrate = () => {
      // The preloader may already have attached and buffered each preview;
      // re-assigning the same src would throw that buffer away.
      videos.forEach((video, i) => {
        const src = assetUrl(projects[i].video);
        if (video.getAttribute("src") !== src) video.src = src;
        video.poster = assetUrl(projects[i].poster);
      });
      engine.invalidate();
    };
    window.addEventListener("portfolio-assets-ready", hydrate);
    if (assetsReady()) hydrate();
    resize();
    const unsubscribe = engine.subscribe(render);
    const stopExpansion = subscribeTicker((_now, dt) => {
      const target = options.current.expanded ? 1 : 0,
        previous = expandProgress.current;
      if (previous === target) return;
      const next = options.current.reducedMotion
        ? target
        : damp(previous, target, 10, dt);
      expandProgress.current = Math.abs(next - target) < 0.0001 ? target : next;
      render(engine.read());
      if (expandProgress.current === target) refreshGeometry();
    });
    window.addEventListener("resize", resize);
    document.addEventListener("visibilitychange", visibility);
    window.addEventListener("pointermove", movePointer, { passive: true });
    document.documentElement.addEventListener("pointerleave", leavePointer);
    window.addEventListener("blur", leavePointer);
    return () => {
      stopTilt();
      window.removeEventListener("pointermove", movePointer);
      document.documentElement.removeEventListener(
        "pointerleave",
        leavePointer,
      );
      window.removeEventListener("blur", leavePointer);
      window.removeEventListener("portfolio-assets-ready", hydrate);
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
            <div
              key={project.id}
              className={`video-card ${active ? "is-active" : ""}`}
              data-video={i}
              aria-hidden={!nearby}
            >
              <button
                className="video-hit"
                tabIndex={nearby ? 0 : -1}
                aria-label={
                  active
                    ? `${expanded ? "Collapse" : "Expand"} ${project.shortTitle} preview`
                    : `Select ${project.shortTitle}`
                }
                onClick={(event) => {
                  if (event.detail !== 0 && dragRef.current.wasDragged) return;
                  if (i === engine.read().index) {
                    if (expanded) {
                      onCollapse();
                      return;
                    }
                    const preview = event.currentTarget.querySelector("video")!;
                    // Keep the decoded stream and timestamp; replacing src here
                    // caused a blank frame and decode stall on every click.
                    preview.muted = false;
                    // Comfortable level: films are mastered loud.
                    preview.volume = 0.35;
                    void preview.play().catch(() => {});
                    onExpand();
                  } else {
                    select(i);
                  }
                }}
              >
                <VideoBezel>
                  <div className="video-surface">
                    <video
                      src={cachedAsset(project.video)}
                      poster={cachedAsset(project.poster)}
                      muted
                      playsInline
                      loop
                      preload="none"
                      aria-label={`${project.shortTitle} preview`}
                    />
                    <div className="crt-shading" />
                    <div className="glitch-flash" />
                    <div className="expansion-scanlines" aria-hidden="true" />
                    <div className="tilt-glare" aria-hidden="true" />
                  </div>
                </VideoBezel>
              </button>
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
            <SoftwareTile
              software={project.tools[0].id}
              tools={project.tools}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
