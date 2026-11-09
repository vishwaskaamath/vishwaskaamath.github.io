"use client";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { assetUrl } from "@/lib/assetPreloader";
import { subscribeTicker } from "@/lib/masterTicker";
import type { Project } from "@/data/projects";
import CinemaBezel from "./CinemaBezel";
import { cinemaOutline } from "@/lib/cinemaFraming";
export type CinemaSession = {
  project: Project;
  rect: { left: number; top: number; width: number; height: number };
  time: number;
  closing: boolean;
};
const clamp = (x: number) => Math.max(0, Math.min(1, x));
const ease = (p: number) => {
  if (p <= 0) return 0;
  if (p >= 1) return 1;
  let lo = 0,
    hi = 1;
  for (let i = 0; i < 12; i++) {
    const t = (lo + hi) / 2,
      u = 1 - t;
    if (3 * u * u * t * 0.22 + 3 * u * t * t * 0.36 + t * t * t < p) lo = t;
    else hi = t;
  }
  return 1 - Math.pow(1 - (lo + hi) / 2, 3);
};
const timecode = (n: number) =>
  `${Math.floor(n / 60)
    .toString()
    .padStart(2, "0")}:${Math.floor(n % 60)
    .toString()
    .padStart(2, "0")}`;
export default function CinemaPlayer({
  session,
  onClose,
  onDone,
  reducedMotion,
}: {
  session: CinemaSession;
  onClose: () => void;
  onDone: (time: number) => void;
  reducedMotion: boolean;
}) {
  const root = useRef<HTMLDivElement>(null),
    frame = useRef<HTMLDivElement>(null),
    video = useRef<HTMLVideoElement>(null),
    backdrop = useRef<HTMLDivElement>(null),
    range = useRef<HTMLInputElement>(null),
    clock = useRef<HTMLOutputElement>(null),
    closeButton = useRef<HTMLButtonElement>(null);
  const initialRect = useRef(session.rect);
  const callbacks = useRef({ onClose, onDone });
  callbacks.current = { onClose, onDone };
  const motion = useRef({
    progress: 0,
    lastInput: performance.now(),
    seeking: false,
    dirty: true,
    box: session.rect,
  });
  const [paused, setPaused] = useState(false),
    [muted, setMuted] = useState(false),
    [error, setError] = useState("");
  useLayoutEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    closeButton.current?.focus({ preventScroll: true });
    const key = (e: KeyboardEvent) => {
      motion.current.lastInput = performance.now();
      if (e.key === "Escape") {
        e.preventDefault();
        callbacks.current.onClose();
      }
      if (e.key === "Tab") {
        const items = Array.from(
          root.current!.querySelectorAll<HTMLElement>("button,input"),
        );
        const first = items[0],
          last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    const release = () => {
      motion.current.seeking = false;
    };
    window.addEventListener("pointerup", release);
    window.addEventListener("pointercancel", release);
    window.addEventListener("keydown", key);
    return () => {
      window.removeEventListener("pointerup", release);
      window.removeEventListener("pointercancel", release);
      window.removeEventListener("keydown", key);
      previous?.focus({ preventScroll: true });
    };
  }, []);
  useEffect(() => {
    const v = video.current!;
    v.muted = false;
    v.volume = 0.35;
    const ready = () => {
      motion.current.dirty = true;
      if (session.time > 0 && Number.isFinite(v.duration))
        v.currentTime = Math.min(session.time, Math.max(0, v.duration - 0.1));
      void v.play().catch(() => setPaused(true));
    };
    v.addEventListener("loadedmetadata", ready);
    if (v.readyState >= 1) ready();
    return () => {
      v.removeEventListener("loadedmetadata", ready);
      v.pause();
      v.muted = true;
    };
  }, [session.project, session.time]);
  useLayoutEffect(() => {
    const start = performance.now(),
      from = motion.current.progress,
      to = session.closing ? 0 : 1,
      duration = reducedMotion ? 1 : 550;
    const origin = motion.current.box;
    let target = { left: 0, top: 0, width: innerWidth, height: innerHeight },
      done = false;
    const el = frame.current!,
      r = session.rect;
    const aperture = el.querySelector<HTMLElement>(".cinema-aperture")!;
    const curvedClip = aperture.dataset.curvedClip!;
    const rim = el.querySelector<SVGSVGElement>(".cinema-rims")!,
      glass = el.querySelector<HTMLElement>(".crt-shading")!;
    const clip = el.querySelector<SVGPathElement>("[data-cinema-clip]")!,
      rings = Array.from(
        rim.querySelectorAll<SVGPathElement>("[data-card-path]"),
      );
    const resize = () => {
      done = false;
      target = { left: 0, top: 0, width: innerWidth, height: innerHeight };
    };
    window.addEventListener("resize", resize);
    if (session.closing) {
      video.current?.pause();
      if (video.current) video.current.muted = true;
    }
    const stop = subscribeTicker((now) => {
      const t = clamp((now - start) / duration),
        e = ease(t),
        p = from + (to - from) * e;
      motion.current.progress = p;
      if (!done || motion.current.dirty) {
        const destination = session.closing ? r : target;
        const box = {
          left: origin.left + (destination.left - origin.left) * e,
          top: origin.top + (destination.top - origin.top) * e,
          width: origin.width + (destination.width - origin.width) * e,
          height: origin.height + (destination.height - origin.height) * e,
        };
        motion.current.box = box;
        el.style.left = `${box.left}px`;
        el.style.top = `${box.top}px`;
        el.style.width = `${box.width}px`;
        el.style.height = `${box.height}px`;
        el.style.transform = "none";
        el.style.borderRadius = "0";
        aperture.style.clipPath =
          p >= 1 && !session.closing ? "none" : curvedClip;
        clip.setAttribute("d", cinemaOutline(p));
        const rimPath = cinemaOutline(p, r.width, r.height);
        rings.forEach((path) => path.setAttribute("d", rimPath));
        rim.style.opacity = String(1 - p);
        glass.style.opacity = String(1 - p);
        glass.style.visibility = p === 1 ? "hidden" : "visible";
        rim.style.visibility = p === 1 ? "hidden" : "visible";
        backdrop.current!.style.opacity = String(
          session.closing ? from * (1 - clamp((now - start) / 200)) : p,
        );
        motion.current.dirty = false;
      }
      if (!session.closing && t === 1) done = true;
      root.current!.dataset.hud = String(
        !session.closing &&
          (now - motion.current.lastInput < 2000 || motion.current.seeking),
      );
      root.current!.style.setProperty("--cinema-progress", String(p));
      const v = video.current!;
      if (Number.isFinite(v.duration) && v.duration > 0) {
        if (!motion.current.seeking)
          range.current!.value = String((v.currentTime / v.duration) * 100);
        clock.current!.value = `${timecode(v.currentTime)} / ${timecode(v.duration)}`;
      }
      if (session.closing && t === 1 && !done) {
        done = true;
        callbacks.current.onDone(video.current?.currentTime || 0);
      }
    });
    return () => {
      stop();
      window.removeEventListener("resize", resize);
    };
  }, [session.closing, session.rect, reducedMotion]);
  const togglePlay = () => {
    const v = video.current!;
    if (v.paused)
      void v
        .play()
        .catch(() => setError("Playback is unavailable. Please try again."));
    else v.pause();
  };
  return createPortal(
    <div
      ref={root}
      className="cinema-player"
      data-closing={session.closing}
      role="dialog"
      aria-modal="true"
      aria-label={`${session.project.shortTitle} cinema player`}
      onFocusCapture={() => {
        motion.current.lastInput = performance.now();
      }}
      onPointerMove={() => {
        motion.current.lastInput = performance.now();
      }}
      onPointerDown={() => {
        motion.current.lastInput = performance.now();
      }}
    >
      <div
        ref={backdrop}
        className="cinema-backdrop"
        onClick={() => callbacks.current.onClose()}
      />
      <div ref={frame} className="cinema-frame" style={initialRect.current}>
        <CinemaBezel width={session.rect.width} height={session.rect.height}>
          <video
            ref={video}
            src={assetUrl(session.project.video.replace(".mp4", "-full.mp4"))}
            poster={assetUrl(session.project.poster)}
            playsInline
            preload="auto"
            onPlay={() => setPaused(false)}
            onPause={() => setPaused(true)}
            onEnded={() => setPaused(true)}
            onError={() =>
              setError("Unable to load this video. Please close and try again.")
            }
            onClick={togglePlay}
          />
        </CinemaBezel>
        {error && (
          <p className="cinema-error" role="alert">
            {error}
          </p>
        )}
      </div>
      <div className="cinema-top cinema-hud">
        <p>
          {session.project.shortTitle} — {session.project.role} /{" "}
          {session.project.year}
        </p>
        <button ref={closeButton} onClick={() => callbacks.current.onClose()}>
          CLOSE [ESC]
        </button>
      </div>
      <div className="cinema-controls cinema-hud">
        <button
          onClick={togglePlay}
          aria-label={paused ? "Play video" : "Pause video"}
        >
          {paused ? "PLAY" : "PAUSE"}
        </button>
        <input
          ref={range}
          type="range"
          min="0"
          max="100"
          step="0.01"
          defaultValue="0"
          aria-label="Video progress"
          onPointerDown={() => {
            motion.current.seeking = true;
          }}
          onPointerUp={() => {
            motion.current.seeking = false;
          }}
          onPointerCancel={() => {
            motion.current.seeking = false;
          }}
          onChange={(e) => {
            const v = video.current!;
            if (Number.isFinite(v.duration))
              v.currentTime = (Number(e.target.value) / 100) * v.duration;
            motion.current.lastInput = performance.now();
          }}
        />
        <output ref={clock}>00:00 / 00:00</output>
        <button
          onClick={() => {
            const v = video.current!;
            v.muted = !v.muted;
            setMuted(v.muted);
          }}
          aria-label={muted ? "Unmute video" : "Mute video"}
        >
          {muted ? "UNMUTE" : "MUTE"}
        </button>
      </div>
    </div>,
    document.body,
  );
}
