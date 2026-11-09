"use client";
import { useEffect, useRef } from "react";
import type { Track } from "@/data/playlist";
import type { Deck } from "@/hooks/useVinylPlayer";
import { subscribeTicker } from "@/lib/masterTicker";

const BANDS = 28;
const SEGMENTS = 16;
type Fx = { slowed: boolean; lofi: boolean; dust: boolean };

/**
 * OLED audio analyzer and analog FX bay under the turntable: a 28-band
 * spectrum and stereo peak meters fed by the deck's Web Audio analyzers,
 * plus three working switches (slowed speed, lo-fi low-pass, vinyl dust).
 */
export default function SignalBay({
  deck,
  track,
  fx,
  onToggle,
}: {
  deck: React.RefObject<Deck>;
  track: Track;
  fx: Fx;
  onToggle: (name: keyof Fx) => void;
}) {
  const bars = useRef<HTMLDivElement>(null);
  const left = useRef<HTMLDivElement>(null);
  const right = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const barEls = Array.from(bars.current!.children) as HTMLElement[];
    const meters = [left.current!, right.current!].map(
      (el) => Array.from(el.children) as HTMLElement[],
    );
    const shown = barEls.map(() => -1);
    const lit = [-1, -1];
    return subscribeTicker(() => {
      const d = deck.current;
      for (let i = 0; i < BANDS; i++) {
        const v = Math.round(Math.max(0, Math.min(1, d.spectrum[i])) * 200);
        if (v === shown[i]) continue;
        shown[i] = v;
        barEls[i].style.setProperty("--v", String(v / 200));
      }
      [d.peakL, d.peakR].forEach((peak, side) => {
        const n = Math.round(Math.max(0, Math.min(1, peak)) * SEGMENTS);
        if (n === lit[side]) return;
        lit[side] = n;
        meters[side].forEach((seg, k) => (seg.dataset.on = String(k < n)));
      });
    });
  }, [deck]);

  const switches: { name: keyof Fx; label: string }[] = [
    { name: "slowed", label: fx.slowed ? "SLOWED • 28 RPM" : "33.3 RPM" },
    { name: "lofi", label: "LO-FI FILTER" },
    { name: "dust", label: "VINYL DUST" },
  ];
  const segments = (ref: React.RefObject<HTMLDivElement | null>) => (
    <div className="bay-segments" ref={ref}>
      {Array.from({ length: SEGMENTS }, (_, k) => (
        <i key={k} data-on="false" data-peak={k >= SEGMENTS - 2} />
      ))}
    </div>
  );

  return (
    <section className="signal-bay" aria-label="Signal analyzer and effects">
      <header className="bay-head">
        <span>
          <i className="bay-dot" aria-hidden="true" />
          SIGNAL ANALYZER {"//"} CH L-R
        </span>
        <span className="bay-meta">
          {track.bpm} BPM • {track.key} • STEREO
        </span>
      </header>
      <div className="bay-screen" aria-hidden="true">
        <div className="bay-bars" ref={bars}>
          {Array.from({ length: BANDS }, (_, i) => (
            <i key={i} />
          ))}
        </div>
        <div className="bay-meters">
          <span className="bay-ch">L</span>
          {segments(left)}
          <span className="bay-ch">R</span>
          {segments(right)}
          <span />
          <span className="bay-scale">
            <span>-24</span>
            <span>-12</span>
            <span>-6</span>
            <span>0 dB</span>
          </span>
        </div>
      </div>
      <div className="bay-switches">
        {switches.map(({ name, label }) => (
          <button
            key={name}
            type="button"
            className="bay-switch"
            aria-pressed={fx[name]}
            onClick={() => onToggle(name)}
          >
            <i aria-hidden="true" />
            {label}
          </button>
        ))}
      </div>
    </section>
  );
}
