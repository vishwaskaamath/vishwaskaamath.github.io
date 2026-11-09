"use client";
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { createPortal } from "react-dom";
import {
  Pause,
  Play,
  SkipBack,
  SkipForward,
  Volume1,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import type { VinylPlayer as Player } from "@/hooks/useVinylPlayer";
import { subscribeTicker } from "@/lib/masterTicker";
import Turntable from "./Turntable";
import SignalBay from "./SignalBay";

const clock = (seconds: number) =>
  !Number.isFinite(seconds) || seconds <= 0
    ? "--:--"
    : `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;
const pad = (n: number) => String(n).padStart(2, "0");
const easeOutExpo = (t: number) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));
const easeInCubic = (t: number) => t * t * t;
const OPEN_MS = 620;
const CLOSE_MS = 420;

/**
 * Header music button that morphs into a working turntable with a playlist.
 * The panel grows out of the button's own outline (clip-path) and shrinks
 * back into it when closed.
 */
export default function VinylPlayer({
  player,
  reducedMotion,
}: {
  player: Player;
  reducedMotion: boolean;
}) {
  const { tracks, index, playing, volume, durations, deck } = player;
  const track = tracks[index];
  const pill = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDialogElement>(null);
  const seek = useRef<HTMLInputElement>(null);
  const elapsed = useRef<HTMLOutputElement>(null);
  const remaining = useRef<HTMLOutputElement>(null);
  const playButton = useRef<HTMLButtonElement>(null);
  const seeking = useRef(false);
  const scrub = useRef<HTMLDivElement>(null);
  // Display fallback: show the probed track length before the audio loads.
  const knownLength = useRef(0);
  knownLength.current = durations[track.src] ?? 0;
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const morph = useRef({ value: 0, from: 0, start: 0, focused: false });
  const durationsLoaded = useRef(false);
  const live = useRef({ open, reducedMotion });
  live.current = { open, reducedMotion };

  const show = () => {
    if (!durationsLoaded.current) {
      durationsLoaded.current = true;
      player.loadDurations();
    }
    morph.current.from = morph.current.value;
    morph.current.start = performance.now();
    morph.current.focused = false;
    setMounted(true);
    setOpen(true);
  };
  const hide = () => {
    if (!live.current.open) return;
    morph.current.from = morph.current.value;
    morph.current.start = performance.now();
    setOpen(false);
  };

  // Anchor the panel's top-right corner to the button's (full width on phones).
  const place = () => {
    const p = pill.current,
      el = panel.current;
    if (!p || !el) return;
    const r = p.getBoundingClientRect();
    el.style.top = `${r.top}px`;
    if (innerWidth < 760) {
      el.style.left = "12px";
      el.style.right = "12px";
      el.style.maxWidth = "";
    } else {
      el.style.left = "auto";
      el.style.right = `${innerWidth - r.right}px`;
      // Never run past the left edge on narrow desktop windows.
      el.style.maxWidth = `${r.right - 12}px`;
    }
  };
  useLayoutEffect(() => {
    if (!mounted) return;
    place();
    window.addEventListener("resize", place);
    return () => window.removeEventListener("resize", place);
  }, [mounted]);

  // Morph + live readouts.
  useEffect(() => {
    return subscribeTicker((now) => {
      const d = deck.current;
      if (elapsed.current)
        elapsed.current.value =
          clock(d.time) === "--:--" ? "0:00" : clock(d.time);
      if (remaining.current)
        remaining.current.value = clock(d.duration || knownLength.current);
      if (seek.current && !seeking.current)
        seek.current.value = String(Math.round(d.progress * 1000));
      if (scrub.current && seek.current)
        scrub.current.style.setProperty(
          "--p",
          String(Number(seek.current.value) / 1000),
        );

      const m = morph.current,
        el = panel.current,
        p = pill.current;
      const isOpen = live.current.open;
      const target = isOpen ? 1 : 0;
      if (!el || !p) return;
      // Only measure while the morph is moving.
      if (m.value === target && el.dataset.settled === String(target)) return;
      if (m.value !== target) {
        const duration = live.current.reducedMotion
          ? 1
          : isOpen
            ? OPEN_MS
            : CLOSE_MS;
        const t = Math.min(1, (now - m.start) / duration);
        const eased = isOpen ? easeOutExpo(t) : easeInCubic(t);
        m.value = m.from + (target - m.from) * eased;
        if (t >= 1) m.value = target;
      }
      // Clip the panel to the button's outline, then open it out to full size.
      const a = p.getBoundingClientRect(),
        b = el.getBoundingClientRect();
      const k = 1 - m.value;
      const inset = [
        Math.max(0, a.top - b.top) * k,
        Math.max(0, b.right - a.right) * k,
        Math.max(0, b.bottom - a.bottom) * k,
        Math.max(0, a.left - b.left) * k,
      ];
      const radius = 18 + 6 * m.value;
      el.style.clipPath =
        m.value === 1
          ? "none"
          : `inset(${inset.map((n) => `${n.toFixed(1)}px`).join(" ")} round ${radius}px)`;
      el.dataset.settled = m.value === target ? String(target) : "";
      el.style.setProperty("--reveal", m.value.toFixed(3));
      el.dataset.state = isOpen
        ? m.value > 0.55
          ? "open"
          : "opening"
        : "closing";
      p.style.opacity = String(Math.max(0, 1 - m.value * 3));
      if (isOpen && m.value > 0.7 && !m.focused) {
        m.focused = true;
        playButton.current?.focus({ preventScroll: true });
      }
      if (!isOpen && m.value === 0) {
        p.style.opacity = "1";
        setMounted(false);
      }
    });
  }, [deck]);

  // Close on Escape or a click outside; return focus to the button.
  useEffect(() => {
    if (!open) return;
    const key = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      hide();
      pill.current?.focus({ preventScroll: true });
    };
    const outside = (event: PointerEvent) => {
      const target = event.target as Node;
      if (panel.current?.contains(target) || pill.current?.contains(target))
        return;
      hide();
    };
    window.addEventListener("keydown", key);
    document.addEventListener("pointerdown", outside, true);
    return () => {
      window.removeEventListener("keydown", key);
      document.removeEventListener("pointerdown", outside, true);
    };
  }, [open]);

  const VolumeIcon = volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2;

  return (
    <>
      <button
        ref={pill}
        type="button"
        className={`vinyl-pill ${playing ? "is-playing" : ""}`}
        onClick={() => (open ? hide() : show())}
        aria-expanded={open}
        aria-controls="vinyl-player"
        aria-label={`Open music player. ${playing ? "Playing" : "Paused"}: ${track.title} by ${track.artist}`}
        style={{ "--label": track.label } as CSSProperties}
      >
        <span className="vinyl-pill-flood" aria-hidden="true" />
        <span className="vinyl-pill-disc" aria-hidden="true">
          <i />
        </span>
        <span className="vinyl-pill-title" aria-hidden="true">
          <span className="vinyl-pill-roll">
            <span>RECORD BOX</span>
            <span>{track.title}</span>
          </span>
        </span>
        <span className="vinyl-pill-eq" aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
      </button>
      {mounted &&
        createPortal(
          <dialog
            ref={panel}
            id="vinyl-player"
            className="vinyl-panel"
            open
            aria-label="Music player"
            data-state="opening"
            style={{ "--label": track.label } as CSSProperties}
          >
            <header className="vinyl-head">
              <span className="vinyl-kicker">
                <i aria-hidden="true" data-live={playing} />
                THE RECORD BOX
              </span>
              <button
                type="button"
                className="vinyl-close"
                onClick={() => {
                  hide();
                  pill.current?.focus({ preventScroll: true });
                }}
                aria-label="Close music player"
              >
                <span aria-hidden="true">ESC</span>
                <X size={13} strokeWidth={2.4} />
              </button>
            </header>
            <div className="vinyl-body">
              <div className="vinyl-deck-col">
                <Turntable
                  deck={deck}
                  track={track}
                  onArmGrab={player.grabArm}
                  onArmDrag={player.dragArm}
                  onArmRelease={player.releaseArm}
                />
                <SignalBay
                  deck={deck}
                  track={track}
                  fx={player.fx}
                  onToggle={player.toggleFx}
                />
              </div>
              <div className="vinyl-side">
                <div className="vinyl-now" aria-live="polite">
                  <h2>{track.title}</h2>
                  <p>{track.artist}</p>
                </div>
                <div className="vinyl-seek">
                  <output ref={elapsed}>0:00</output>
                  <div className="vinyl-scrub" ref={scrub}>
                    <input
                      className="vinyl-range"
                      ref={seek}
                      type="range"
                      min={0}
                      max={1000}
                      step={1}
                      defaultValue={0}
                      aria-label="Song position"
                      onPointerDown={() => (seeking.current = true)}
                      onPointerUp={() => (seeking.current = false)}
                      onPointerCancel={() => (seeking.current = false)}
                      onBlur={() => (seeking.current = false)}
                      onChange={(event) =>
                        player.seek(Number(event.target.value) / 1000)
                      }
                    />
                  </div>
                  <output ref={remaining}>--:--</output>
                </div>
                <div className="vinyl-transport">
                  <button
                    type="button"
                    onClick={player.previous}
                    aria-label="Previous song"
                  >
                    <SkipBack size={15} fill="currentColor" />
                  </button>
                  <button
                    ref={playButton}
                    type="button"
                    className="vinyl-play"
                    onClick={player.toggle}
                    aria-label={playing ? "Pause" : "Play"}
                  >
                    {playing ? (
                      <Pause size={18} fill="currentColor" strokeWidth={0} />
                    ) : (
                      <Play size={18} fill="currentColor" strokeWidth={0} />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={player.next}
                    aria-label="Next song"
                  >
                    <SkipForward size={15} fill="currentColor" />
                  </button>
                  <label className="vinyl-volume">
                    <VolumeIcon size={14} aria-hidden="true" />
                    <input
                      className="vinyl-fader"
                      style={{ "--v": volume } as CSSProperties}
                      type="range"
                      min={0}
                      max={100}
                      value={Math.round(volume * 100)}
                      aria-label="Volume"
                      onChange={(event) =>
                        player.setVolume(Number(event.target.value) / 100)
                      }
                    />
                    <output className="vinyl-volume-readout" aria-hidden="true">
                      {Math.round(volume * 100)}%
                    </output>
                  </label>
                </div>
                <ol className="vinyl-list" aria-label="Playlist">
                  {tracks.map((t, i) => (
                    <li key={t.id}>
                      <button
                        type="button"
                        aria-current={i === index ? "true" : undefined}
                        data-playing={i === index && playing}
                        onClick={() =>
                          i === index ? player.toggle() : player.select(i)
                        }
                        style={{ "--label": t.label } as CSSProperties}
                      >
                        {i === index && playing ? (
                          <span className="vinyl-eq" aria-hidden="true">
                            <i />
                            <i />
                            <i />
                          </span>
                        ) : (
                          <span className="vinyl-list-num">{pad(i + 1)}</span>
                        )}
                        <span className="vinyl-list-copy">
                          <b>{t.title}</b>
                          <small>{t.artist}</small>
                        </span>
                        <span className="vinyl-list-time">
                          {clock(durations[t.src] ?? 0)}
                        </span>
                      </button>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          </dialog>,
          document.body,
        )}
    </>
  );
}
