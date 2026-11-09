"use client";
import { useEffect, useRef } from "react";
import { cancelTick, requestTick } from "@/lib/masterTicker";
import {
  actualProgressRef,
  assetsReady,
  loaderState,
  preloadAssets,
} from "@/lib/assetPreloader";

/** 1 - e^(-k/60) = 0.12: the display eases 12% of the gap per 60 Hz frame. */
const EASE = -Math.log(0.88) * 60;
const REVEAL_MS = 850;

/**
 * Obsidian intro stage: the name fills with orange as real assets finish
 * loading, a tabular counter and the current file run along the bottom, and
 * once everything is decoded the stage splits like a curtain.
 */
export default function LoadingScreen({
  onComplete,
}: {
  onComplete: () => void;
}) {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = root.current!;
    const counters = element.querySelectorAll<HTMLElement>("[data-count]");
    const labels = element.querySelectorAll<HTMLElement>("[data-label]");
    const reduce = matchMedia("(prefers-reduced-motion: reduce)");
    void preloadAssets();
    document.documentElement.dataset.loading = "true";
    const siblings = Array.from(element.parentElement!.children).filter(
      (e) => e !== element,
    ) as HTMLElement[];
    const inert = siblings.map((e) => e.inert);
    siblings.forEach((e) => (e.inert = true));

    let raf = 0,
      last = 0,
      display = 0,
      shown = -1,
      label = "",
      finish = 0;
    const tick = (now: number) => {
      const dt = last ? Math.min((now - last) / 1000, 0.05) : 1 / 60;
      last = now;
      const real = actualProgressRef.current;
      display = reduce.matches
        ? real
        : display + (real - display) * (1 - Math.exp(-EASE * dt));
      if (real >= 100 && display >= 99.5) display = 100;
      const whole = Math.floor(display);
      if (whole !== shown) {
        shown = whole;
        const text = `${String(whole).padStart(3, "0")}%`;
        counters.forEach((c) => (c.textContent = text));
      }
      element.style.setProperty("--p", `${display.toFixed(2)}%`);
      if (loaderState.label !== label) {
        label = loaderState.label;
        labels.forEach((l) => (l.textContent = label));
      }
      // Split the curtain only once the counter has landed and every
      // critical asset is decoded in memory.
      if (display >= 99.5 && assetsReady()) {
        element.classList.add("is-revealing");
        finish = window.setTimeout(
          onComplete,
          reduce.matches ? 0 : REVEAL_MS + 50,
        );
        return;
      }
      raf = requestTick(tick);
    };
    raf = requestTick(tick);
    return () => {
      cancelTick(raf);
      clearTimeout(finish);
      delete document.documentElement.dataset.loading;
      siblings.forEach((e, i) => (e.inert = inert[i]));
    };
  }, [onComplete]);

  return (
    <div
      ref={root}
      className="loading-screen"
      role="status"
      aria-label="Loading portfolio"
    >
      {(["top", "bottom"] as const).map((half) => (
        <div
          key={half}
          className={`loader-half loader-${half}`}
          aria-hidden={half === "bottom" ? true : undefined}
        >
          <div className="loader-inner">
            <p className="loader-name">
              <span>VISHWAS KAMATH</span>
              <span className="loader-name-fill" aria-hidden="true">
                VISHWAS KAMATH
              </span>
            </p>
            <div className="loader-bar">
              <i className="loader-line" />
              <span data-label>STANDBY</span>
              <span className="loader-count" data-count>
                000%
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
