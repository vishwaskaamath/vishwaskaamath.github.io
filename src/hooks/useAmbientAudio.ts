"use client";
import { useCallback, useEffect, useRef, useState } from "react";

/** A quiet original ambient pad, synthesized locally only after a user gesture. */
export function useAmbientAudio() {
  const [playing, setPlaying] = useState(false);
  const context = useRef<AudioContext | null>(null);
  const gain = useRef<GainNode | null>(null);
  const playingRef = useRef(false);
  const toggle = useCallback(async () => {
    try {
      if (!context.current) {
        const ctx = new AudioContext();
        context.current = ctx;
        const master = ctx.createGain();
        master.gain.value = 0;
        master.connect(ctx.destination);
        gain.current = master;
        [130.81, 164.81, 196, 261.63, 329.63].forEach((frequency, i) => {
          const oscillator = ctx.createOscillator(),
            volume = ctx.createGain();
          oscillator.type = "sine";
          oscillator.frequency.value = frequency;
          oscillator.detune.value = i % 2 ? 3 : -3;
          volume.gain.value = 0.075 / (i + 1);
          oscillator.connect(volume);
          volume.connect(master);
          oscillator.start();
          const lfo = ctx.createOscillator(),
            depth = ctx.createGain();
          lfo.frequency.value = 0.08 + i * 0.025;
          depth.gain.value = 0.015 / (i + 1);
          lfo.connect(depth);
          depth.connect(volume.gain);
          lfo.start();
        });
      }
      const ctx = context.current;
      await ctx.resume();
      const next = !playingRef.current;
      gain.current!.gain.setTargetAtTime(next ? 0.7 : 0, ctx.currentTime, 0.18);
      playingRef.current = next;
      setPlaying(next);
    } catch {
      setPlaying(false);
      playingRef.current = false;
    }
  }, []);
  useEffect(
    () => () => {
      void context.current?.close();
    },
    [],
  );
  return { playing, toggle };
}
