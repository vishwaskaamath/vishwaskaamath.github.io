"use client";
import { assetUrl } from "@/lib/assetPreloader";
import { subscribeTicker, damp } from "@/lib/masterTicker";
import { useCallback, useEffect, useRef, useState } from "react";

/** Preserve listener preference while project audio temporarily takes priority. */
export function useAmbientAudio(suspended = false) {
  const [playing, setPlaying] = useState(false);
  const audio = useRef<HTMLAudioElement | null>(null);
  const wanted = useRef(false);
  const blocked = useRef(suspended);
  const request = useRef(0);
  blocked.current = suspended;
  const sync = useCallback(async () => {
    const version = ++request.current;
    if (!wanted.current || blocked.current) {
      audio.current?.pause(); setPlaying(false); return;
    }
    if (!audio.current) {
      const track = new Audio(assetUrl('/media/unrequited.mp3'));
      track.loop = true; track.preload = 'none'; audio.current = track;
    }
    const track = audio.current;
    track.volume = 0;
    try {
      await track.play();
      if (version === request.current) setPlaying(true);
      else if (!wanted.current || blocked.current) track.pause();
    } catch { if (version === request.current) setPlaying(false); }
  }, []);
  const toggle = useCallback(() => { wanted.current = !wanted.current; void sync(); }, [sync]);
  useEffect(() => { void sync(); }, [suspended, sync]);
  useEffect(() => subscribeTicker((_now, dt) => {
    const track = audio.current;
    if (track && !track.paused) track.volume = damp(track.volume, .25, 15, dt);
  }), []);
  useEffect(() => () => {
    request.current++; wanted.current = false;
    audio.current?.pause(); audio.current?.removeAttribute('src'); audio.current?.load(); audio.current = null;
  }, []);
  return { playing, toggle, audio };
}
