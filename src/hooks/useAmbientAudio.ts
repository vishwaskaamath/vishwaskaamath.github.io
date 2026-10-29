"use client";
import { assetUrl } from "@/lib/assetPreloader";
import { useCallback, useEffect, useRef, useState } from "react";

/** User-supplied background track; starts only after the sound toggle is pressed. */
export function useAmbientAudio() {
  const [playing, setPlaying] = useState(false);
  const audio = useRef<HTMLAudioElement | null>(null);
  const wanted = useRef(false);
  const request = useRef(0);
  const toggle = useCallback(async () => {
    if (!audio.current) {
      const track = new Audio(assetUrl('/media/unrequited.mp3'));
      track.loop = true;
      track.volume = 0.25;
      track.preload = 'none';
      audio.current = track;
    }
    const track = audio.current;
    const version = ++request.current;
    wanted.current = !wanted.current;
    if (!wanted.current) {
      track.pause();
      setPlaying(false);
      return;
    }
    try {
      await track.play();
      if (version === request.current) setPlaying(true);
    } catch {
      if (version === request.current) {
        wanted.current = false;
        setPlaying(false);
      }
    }
  }, []);
  useEffect(() => () => {
    request.current++;
    wanted.current = false;
    audio.current?.pause();
    audio.current?.removeAttribute('src');
    audio.current?.load();
    audio.current = null;
  }, []);
  return { playing, toggle };
}
