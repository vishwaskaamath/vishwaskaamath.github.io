"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { playlist } from "@/data/playlist";
import { assetUrl } from "@/lib/assetPreloader";
import { subscribeTicker } from "@/lib/masterTicker";
import {
  ARM_LEAD_IN,
  ARM_RUN_OUT,
  ARM_REST,
  PLATTER_DEG_PER_SEC,
  armAngleAt,
  progressAtAngle,
  stepArm,
  stepLift,
  stepPlatter,
} from "@/lib/turntable";

/** Live deck state, written every frame by the engine and read by the UI. */
export type Deck = {
  /** Platter speed as a fraction of 33⅓ rpm. */
  speed: number;
  /** Record rotation in degrees. */
  angle: number;
  /** Tonearm rotation in degrees (ARM_REST when parked). */
  arm: number;
  /** Cue lift: 0 = stylus in the groove, 1 = raised. */
  lift: number;
  /** Record change: 0 idle, 0..1 old record leaving, 1..2 new one arriving. */
  swap: number;
  needleDown: boolean;
  time: number;
  duration: number;
  progress: number;
  /** Five 0..1 audio levels for meters. */
  levels: number[];
  /** 28 log-spaced 0..1 spectrum bands for the analyzer screen. */
  spectrum: number[];
  /** Left / right peak levels, 0..1 across -24 dB..0 dB. */
  peakL: number;
  peakR: number;
};

type Engine = {
  audio: HTMLAudioElement;
  ctx: AudioContext | null;
  master: GainNode | null;
  analyser: AnalyserNode | null;
  bins: Uint8Array<ArrayBuffer> | null;
  analyserL: AnalyserNode | null;
  analyserR: AnalyserNode | null;
  wave: Float32Array<ArrayBuffer> | null;
  lowpass: BiquadFilterNode | null;
  dust: GainNode | null;
  thump: AudioBuffer | null;
  gain: number;
  unlocked: boolean;
  starting: boolean;
  /** When the current fade-in began (ticker ms), or -1 when not fading. */
  fadeAt: number;
  /** The browser refused to start audio before any user gesture. */
  blocked: boolean;
};

const SWAP_HALF_SECONDS = 0.5;
const BANDS = 28;
/** Playback-rate multiplier for the SLOWED switch (33⅓ → ~28 rpm). */
const SLOWED = 0.86;
const LOFI_HZ = 950;
const DUST_LEVEL = 0.55;
const STOP_SPEED = 0.07;
/** Each song fades in over this long when it starts (seconds). */
const FADE_IN = 2.4;

function noiseBuffer(
  ctx: AudioContext,
  seconds: number,
  fill: (i: number, rate: number) => number,
) {
  const buffer = ctx.createBuffer(
    1,
    Math.floor(ctx.sampleRate * seconds),
    ctx.sampleRate,
  );
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = fill(i, ctx.sampleRate);
  return buffer;
}

/**
 * A working turntable. The music's playback rate follows the platter, so
 * starting glides the pitch up and stopping pitches it down as the record
 * coasts to a halt. Surface crackle and the needle-drop thump only play while
 * the stylus is in the groove. Project video audio suspends the deck.
 */
export function useVinylPlayer(suspended = false, reducedMotion = false) {
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [volume, setVolumeState] = useState(0.2);
  const [fx, setFx] = useState({ slowed: true, lofi: true, dust: true });
  const [durations, setDurations] = useState<Record<string, number>>({});
  const deck = useRef<Deck>({
    speed: 0,
    angle: 0,
    arm: ARM_REST,
    lift: 1,
    swap: 0,
    needleDown: false,
    time: 0,
    duration: 0,
    progress: 0,
    levels: [0, 0, 0, 0, 0],
    spectrum: Array.from({ length: BANDS }, () => 0),
    peakL: 0,
    peakR: 0,
  });
  const control = useRef({
    wanted: true,
    suspended,
    reducedMotion,
    index: 0,
    swapTo: -1,
    volume: 0.2,
    pendingSeek: -1,
    /** Start point (s) to apply once the loaded song's metadata is ready. */
    pendingStart: -1,
    /** The loaded song has not started yet, so its first needle drop fades in. */
    fresh: true,
    /** Tonearm held by the listener (hand cueing) and its held angle. */
    armHeld: false,
    heldAngle: ARM_REST,
    /** FX bay switches. */
    slowed: true,
    lofi: true,
    dust: true,
  });
  control.current.suspended = suspended;
  control.current.reducedMotion = reducedMotion;
  const engine = useRef<Engine | null>(null);
  // Development-only handle for inspecting the deck from the console.
  if (process.env.NODE_ENV !== "production" && typeof window !== "undefined")
    (window as unknown as { __vinyl?: unknown }).__vinyl = {
      deck,
      engine,
      control,
    };

  const load = (audio: HTMLAudioElement, trackIndex: number) => {
    const track = playlist[trackIndex];
    const c = control.current;
    c.pendingStart = track.start ?? 0;
    c.fresh = true;
    audio.src = assetUrl(track.src);
    audio.load();
    const d = deck.current;
    d.time = track.start ?? 0;
    d.progress = 0;
  };

  const ensureEngine = useCallback(() => {
    if (engine.current) return engine.current;
    const audio = new Audio();
    audio.preload = "auto";
    // Let pitch follow speed, like a real platter.
    audio.preservesPitch = false;
    (
      audio as unknown as { webkitPreservesPitch?: boolean }
    ).webkitPreservesPitch = false;
    let ctx: AudioContext | null = null,
      master: GainNode | null = null,
      analyser: AnalyserNode | null = null,
      bins: Uint8Array<ArrayBuffer> | null = null,
      thump: AudioBuffer | null = null,
      analyserL: AnalyserNode | null = null,
      analyserR: AnalyserNode | null = null,
      wave: Float32Array<ArrayBuffer> | null = null,
      lowpass: BiquadFilterNode | null = null,
      dust: GainNode | null = null;
    try {
      ctx = new AudioContext();
      const source = ctx.createMediaElementSource(audio);
      master = ctx.createGain();
      master.gain.value = 0;
      // source → lo-fi low-pass → master volume → speakers. The analyzers tap
      // the signal before the volume, like pre-fader meters on a mixer.
      lowpass = ctx.createBiquadFilter();
      lowpass.type = "lowpass";
      lowpass.Q.value = 0.9;
      lowpass.frequency.value = control.current.lofi ? LOFI_HZ : 20000;
      analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.7;
      bins = new Uint8Array(analyser.frequencyBinCount);
      const splitter = ctx.createChannelSplitter(2);
      analyserL = ctx.createAnalyser();
      analyserR = ctx.createAnalyser();
      analyserL.fftSize = analyserR.fftSize = 256;
      wave = new Float32Array(analyserL.fftSize);
      // Analyzers only need to be pulled by the graph, not heard.
      const sink = ctx.createGain();
      sink.gain.value = 0;
      source.connect(lowpass);
      lowpass.connect(master);
      master.connect(ctx.destination);
      lowpass.connect(analyser).connect(sink);
      lowpass.connect(splitter);
      splitter.connect(analyserL, 0);
      splitter.connect(analyserR, 1);
      analyserL.connect(sink);
      analyserR.connect(sink);
      sink.connect(ctx.destination);
      // Surface noise: faint hiss with sparse clicks, high-passed so it sits
      // above the music. It runs through `master`, so it is silent whenever
      // the stylus is raised.
      let click = 0;
      const crackle = ctx.createBufferSource();
      crackle.buffer = noiseBuffer(ctx, 4, () => {
        if (Math.random() < 0.00035) click = 0.25 + Math.random() * 0.55;
        const sample = (Math.random() * 2 - 1) * (0.012 + click);
        click *= 0.55;
        return sample;
      });
      crackle.loop = true;
      const highpass = ctx.createBiquadFilter();
      highpass.type = "highpass";
      highpass.frequency.value = 900;
      dust = ctx.createGain();
      dust.gain.value = control.current.dust ? DUST_LEVEL : 0;
      crackle.connect(highpass).connect(dust).connect(master);
      crackle.start();
      // Needle drop: a short, low, decaying thump.
      thump = noiseBuffer(ctx, 0.16, (i, rate) => {
        const t = i / rate;
        return (
          (Math.sin(2 * Math.PI * 62 * t) * 0.9 +
            (Math.random() * 2 - 1) * 0.25) *
          Math.exp(-t * 28)
        );
      });
    } catch {
      ctx = null;
      master = null;
      analyser = null;
    }
    const created: Engine = {
      audio,
      ctx,
      master,
      analyser,
      bins,
      thump,
      analyserL,
      analyserR,
      wave,
      lowpass,
      dust,
      gain: 0,
      unlocked: false,
      starting: false,
      fadeAt: -1,
      blocked: false,
    };
    audio.addEventListener("ended", () => {
      // The arm reaches the run-out groove: return it and play the next record.
      const c = control.current;
      c.swapTo = (c.index + 1) % playlist.length;
    });
    audio.addEventListener("loadedmetadata", () => {
      const c = control.current;
      if (c.pendingSeek >= 0 && Number.isFinite(audio.duration)) {
        audio.currentTime = c.pendingSeek * audio.duration;
        c.pendingSeek = -1;
        c.pendingStart = -1;
      } else if (c.pendingStart > 0 && Number.isFinite(audio.duration)) {
        // Some songs start partway in (Track.start).
        audio.currentTime = Math.min(c.pendingStart, audio.duration - 1);
      }
      c.pendingStart = -1;
    });
    load(audio, control.current.index);
    engine.current = created;
    return created;
  }, []);

  /** Runs inside every user gesture so browsers allow later playback. */
  const prime = useCallback(() => {
    const e = ensureEngine();
    e.blocked = false;
    void e.ctx?.resume().catch(() => {});
    if (!e.unlocked) {
      e.unlocked = true;
      // Silent (gain 0) play/pause unlocks the element for later, non-gesture starts.
      if (e.ctx) {
        void e.audio
          .play()
          .then(() => {
            const c = control.current;
            if (!deck.current.needleDown) e.audio.pause();
            else if (c.fresh) {
              // The record was already down: this is the song starting.
              c.fresh = false;
              e.fadeAt = performance.now();
            }
          })
          .catch(() => {});
      }
    }
    return e;
  }, [ensureEngine]);

  const setWanted = (value: boolean) => {
    control.current.wanted = value;
    setPlaying(value);
  };

  const toggle = useCallback(() => {
    prime();
    setWanted(!control.current.wanted);
  }, [prime]);

  const select = useCallback(
    (next: number) => {
      prime();
      const c = control.current;
      const target =
        ((next % playlist.length) + playlist.length) % playlist.length;
      if (c.swapTo < 0 && target === c.index) {
        if (!c.wanted) setWanted(true);
        return;
      }
      c.swapTo = target;
      setWanted(true);
    },
    [prime],
  );

  const current = () =>
    control.current.swapTo >= 0
      ? control.current.swapTo
      : control.current.index;
  const next = useCallback(() => select(current() + 1), [select]);
  const previous = useCallback(() => {
    // Like a CD/streaming player: restart the song (from its start point)
    // unless it has just begun.
    const start = playlist[control.current.index].start ?? 0;
    if (deck.current.time > start + 3 && control.current.swapTo < 0) {
      const e = prime();
      e.audio.currentTime = start;
      return;
    }
    select(current() - 1);
  }, [prime, select]);

  const seek = useCallback(
    (fraction: number) => {
      const e = prime();
      const f = Math.max(0, Math.min(0.999, fraction));
      if (Number.isFinite(e.audio.duration) && e.audio.duration > 0)
        e.audio.currentTime = f * e.audio.duration;
      else control.current.pendingSeek = f;
      deck.current.progress = f;
    },
    [prime],
  );

  /** Pick up the tonearm: the stylus lifts and the music pauses. */
  const grabArm = useCallback(() => {
    const c = control.current;
    if (c.swapTo >= 0) return false;
    prime();
    c.armHeld = true;
    c.heldAngle = deck.current.arm;
    return true;
  }, [prime]);
  /** Move the held tonearm; it can swing from its rest to the run-out groove. */
  const dragArm = useCallback((angle: number) => {
    const c = control.current;
    if (!c.armHeld) return;
    c.heldAngle = Math.max(ARM_REST - 2, Math.min(ARM_RUN_OUT + 1.5, angle));
  }, []);
  /**
   * Let go of the tonearm. Over the record: play from that groove (starting
   * the platter if needed). Back near the rest: stop the record.
   */
  const releaseArm = useCallback(() => {
    const c = control.current;
    if (!c.armHeld) return;
    c.armHeld = false;
    if (c.heldAngle >= ARM_LEAD_IN - 1.5) {
      seek(progressAtAngle(c.heldAngle));
      if (!c.wanted) setWanted(true);
    } else if (c.wanted) setWanted(false);
  }, [seek]);

  /** FX bay switches: SLOWED speed, LO-FI low-pass, VINYL DUST crackle. */
  const toggleFx = useCallback(
    (name: "slowed" | "lofi" | "dust") => {
      const e = prime();
      const c = control.current;
      c[name] = !c[name];
      setFx({ slowed: c.slowed, lofi: c.lofi, dust: c.dust });
      const now = e.ctx?.currentTime ?? 0;
      if (name === "lofi" && e.lowpass)
        e.lowpass.frequency.setTargetAtTime(
          c.lofi ? LOFI_HZ : 20000,
          now,
          0.08,
        );
      if (name === "dust" && e.dust)
        e.dust.gain.setTargetAtTime(c.dust ? DUST_LEVEL : 0, now, 0.06);
    },
    [prime],
  );

  const setVolume = useCallback((value: number) => {
    control.current.volume = value;
    setVolumeState(value);
  }, []);

  /** Reads each track's length once; called when the player first opens. */
  const loadDurations = useCallback(() => {
    const seen = new Set<string>();
    playlist.forEach((track) => {
      if (seen.has(track.src)) return;
      seen.add(track.src);
      const probe = new Audio();
      probe.preload = "metadata";
      probe.addEventListener(
        "loadedmetadata",
        () => {
          const length = probe.duration;
          if (Number.isFinite(length))
            setDurations((known) => ({ ...known, [track.src]: length }));
          probe.removeAttribute("src");
          probe.load();
        },
        { once: true },
      );
      probe.src = assetUrl(track.src);
    });
  }, []);

  useEffect(
    () =>
      subscribeTicker((now, frameDt) => {
        const c = control.current,
          d = deck.current,
          e = engine.current;
        const dt = c.reducedMotion ? 1 : frameDt;
        const swapping = c.swapTo >= 0;
        const motor = c.wanted && !c.suspended && !swapping;
        const factor = c.slowed ? SLOWED : 1;
        const audio = e?.audio;

        // Platter.
        d.speed = c.reducedMotion
          ? motor
            ? 1
            : 0
          : stepPlatter(d.speed, motor, dt, swapping ? 2.6 : 0.85);
        if (!c.reducedMotion)
          d.angle =
            (d.angle + d.speed * factor * PLATTER_DEG_PER_SEC * frameDt) % 360;

        // Groove position.
        if (audio && Number.isFinite(audio.duration) && audio.duration > 0) {
          d.time = audio.currentTime;
          d.duration = audio.duration;
          d.progress = Math.min(1, d.time / d.duration);
        }

        // Tonearm. In the groove the record drives the arm; otherwise the cue
        // lifts it, swings it to its target, and lowers it once the platter
        // is up to speed.
        const grooveAngle = armAngleAt(d.progress);
        const coasting = !swapping && d.needleDown && d.speed > STOP_SPEED;
        let armTarget = ARM_REST,
          liftTarget = 1;
        if (motor || coasting) {
          armTarget = grooveAngle;
          const aligned = Math.abs(d.arm - grooveAngle) < 0.6;
          liftTarget =
            d.needleDown || (motor && aligned && d.speed > 0.45) ? 0 : 1;
        }
        // Hand cueing: the held arm follows the pointer with the stylus raised.
        if (c.armHeld) liftTarget = 1;
        if (c.armHeld) d.arm = c.heldAngle;
        else if (d.needleDown && liftTarget === 0) d.arm = grooveAngle;
        else if (d.lift > 0.85 || c.reducedMotion)
          d.arm = c.reducedMotion
            ? armTarget
            : stepArm(d.arm, armTarget, dt, swapping ? 80 : 55);
        d.lift = c.reducedMotion
          ? liftTarget
          : stepLift(d.lift, liftTarget, dt);
        const wasDown = d.needleDown;
        d.needleDown = d.lift < 0.12 && d.arm >= ARM_LEAD_IN - 1;

        // Record change once the arm is parked and the platter has stopped.
        if (swapping) {
          const parked =
            Math.abs(d.arm - ARM_REST) < 1 && d.lift > 0.9 && d.speed < 0.03;
          if (parked || d.swap > 0) {
            d.swap = c.reducedMotion
              ? 2
              : Math.min(2, d.swap + frameDt / SWAP_HALF_SECONDS);
            if (d.swap >= 1 && c.index !== c.swapTo) {
              c.index = c.swapTo;
              setIndex(c.swapTo);
              if (audio) load(audio, c.index);
            }
            if (d.swap >= 2) {
              d.swap = 0;
              c.swapTo = -1;
            }
          }
        }

        // Audio follows the deck.
        if (e && audio) {
          const rate = Math.max(0.0625, Math.min(1, d.speed * factor));
          if (Math.abs(audio.playbackRate - rate) > 0.004) {
            try {
              audio.playbackRate = rate;
            } catch {}
          }
          // A new song fades in from its first needle drop.
          let fade = c.fresh ? 0 : 1;
          if (e.fadeAt >= 0) {
            const t = Math.min(1, (now - e.fadeAt) / (FADE_IN * 1000));
            fade = t * t * (3 - 2 * t);
            if (t >= 1) e.fadeAt = -1;
          }
          // Lifting the stylus (e.g. to change record) cuts the sound at once.
          const gain = d.needleDown && !swapping ? c.volume * fade : 0;
          if (Math.abs(gain - e.gain) > 0.001) {
            e.gain = gain;
            if (e.master && e.ctx)
              e.master.gain.setTargetAtTime(gain, e.ctx.currentTime, 0.025);
            else audio.volume = gain;
          }
          if (d.needleDown && !wasDown && e.ctx && e.thump && e.master) {
            const drop = e.ctx.createBufferSource();
            drop.buffer = e.thump;
            const level = e.ctx.createGain();
            // Straight to the speakers, so the song's fade-in never hides it.
            level.gain.value = 0.35 * c.volume;
            drop.connect(level).connect(e.ctx.destination);
            drop.start();
          }
          if (
            d.needleDown &&
            !swapping &&
            audio.paused &&
            !audio.ended &&
            !e.starting &&
            !e.blocked
          ) {
            e.starting = true;
            audio
              .play()
              .then(() => {
                // A new song fades in from its first moment of sound.
                if (c.fresh) {
                  c.fresh = false;
                  e.fadeAt = performance.now();
                }
              })
              .catch((error: unknown) => {
                // Autoplay refused: keep the record "on" and start on the
                // visitor's first click or key press (see the effect below).
                if ((error as DOMException)?.name === "NotAllowedError")
                  e.blocked = true;
                else setWanted(false);
              })
              .finally(() => {
                e.starting = false;
              });
          } else if (
            (!d.needleDown || swapping) &&
            !audio.paused &&
            !e.starting
          )
            audio.pause();

          const live = d.needleDown && !swapping;
          const fall = Math.min(1, frameDt * 1.8);
          if (live && e.analyser && e.bins) {
            e.analyser.getByteFrequencyData(e.bins);
            const bins = e.bins;
            [8, 24, 48, 80, 128].forEach((bin, i) => {
              d.levels[i] = (bins[bin] ?? 0) / 255;
            });
            // 28 log-spaced bands from ~90 Hz to ~10 kHz (bins 1..110),
            // interpolated so neighbouring bass bands stay distinct.
            for (let b = 0; b < BANDS; b++) {
              const pos = Math.exp(
                Math.log(1) + ((Math.log(110) - Math.log(1)) * b) / (BANDS - 1),
              );
              const k = Math.floor(pos),
                f = pos - k;
              const raw = (bins[k] ?? 0) * (1 - f) + (bins[k + 1] ?? 0) * f;
              // Gentle tilt so the treble is visible next to the bass.
              const v = Math.min(1, (raw / 255) * (0.85 + (b / BANDS) * 0.45));
              d.spectrum[b] = Math.max(v, d.spectrum[b] - fall);
            }
            const peak = (an: AnalyserNode | null) => {
              if (!an || !e.wave) return 0;
              an.getFloatTimeDomainData(e.wave);
              let m = 0;
              for (let k = 0; k < e.wave.length; k++)
                m = Math.max(m, Math.abs(e.wave[k]));
              const db = 20 * Math.log10(m + 1e-6);
              return Math.max(0, Math.min(1, (db + 24) / 24));
            };
            d.peakL = Math.max(peak(e.analyserL), d.peakL - fall * 0.7);
            d.peakR = Math.max(peak(e.analyserR), d.peakR - fall * 0.7);
          } else if (live) {
            // No Web Audio: a smooth multi-sine simulation keeps it alive.
            const t = performance.now() / 1000;
            for (let b = 0; b < BANDS; b++) {
              const v =
                (0.35 +
                  0.3 * Math.sin(t * (1.3 + b * 0.21) + b) +
                  0.2 * Math.sin(t * (3.1 - b * 0.05) + b * 2.3)) *
                (1 - b / (BANDS * 1.4));
              d.spectrum[b] = Math.max(Math.max(0, v), d.spectrum[b] - fall);
            }
            const avg = d.spectrum.reduce((a, v) => a + v, 0) / BANDS;
            d.peakL = Math.max(
              avg + 0.1 * Math.sin(t * 7),
              d.peakL - fall * 0.7,
            );
            d.peakR = Math.max(
              avg + 0.1 * Math.cos(t * 6),
              d.peakR - fall * 0.7,
            );
            d.spectrum.slice(0, 5).forEach((v, i) => (d.levels[i] = v));
          } else {
            d.levels.forEach((level, i) => {
              d.levels[i] = level * 0.85 < 0.01 ? 0 : level * 0.85;
            });
            for (let b = 0; b < BANDS; b++)
              d.spectrum[b] = Math.max(0, d.spectrum[b] - fall);
            d.peakL = Math.max(0, d.peakL - fall);
            d.peakR = Math.max(0, d.peakR - fall);
          }
        }
      }),
    [],
  );

  // The record is on by default. Browsers only allow sound after the visitor
  // interacts, so try now and otherwise start on the first click, tap or key.
  useEffect(() => {
    const e = ensureEngine();
    void e.ctx?.resume().catch(() => {});
    const unlock = () => {
      prime();
      ["pointerdown", "keydown", "touchend"].forEach((type) =>
        window.removeEventListener(type, unlock, true),
      );
    };
    ["pointerdown", "keydown", "touchend"].forEach((type) =>
      window.addEventListener(type, unlock, true),
    );
    return () =>
      ["pointerdown", "keydown", "touchend"].forEach((type) =>
        window.removeEventListener(type, unlock, true),
      );
  }, [ensureEngine, prime]);

  useEffect(
    () => () => {
      const e = engine.current;
      if (!e) return;
      e.audio.pause();
      e.audio.removeAttribute("src");
      e.audio.load();
      void e.ctx?.close().catch(() => {});
      engine.current = null;
    },
    [],
  );

  return {
    tracks: playlist,
    index,
    playing,
    volume,
    durations,
    deck,
    toggle,
    select,
    next,
    previous,
    seek,
    setVolume,
    grabArm,
    fx,
    toggleFx,
    dragArm,
    releaseArm,
    loadDurations,
  };
}

export type VinylPlayer = ReturnType<typeof useVinylPlayer>;
