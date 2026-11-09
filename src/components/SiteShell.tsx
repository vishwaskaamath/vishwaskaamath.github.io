"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { useVinylPlayer, type VinylPlayer } from "@/hooks/useVinylPlayer";
import { subscribeTicker } from "@/lib/masterTicker";

type Shell = {
  player: VinylPlayer;
  reducedMotion: boolean;
  /** Project films pause the record (set by the portfolio). */
  setSuspended: (value: boolean) => void;
  /** Page change behind the Work/About tile wipe, stamped with `word`. */
  goTo: (href: string, word: string) => void;
};

const ShellContext = createContext<Shell | null>(null);
export const useShell = () => {
  const shell = useContext(ShellContext);
  if (!shell) throw new Error("useShell must be used inside <SiteShell>");
  return shell;
};

const clamp = (x: number) => Math.max(0, Math.min(1, x));
const out = (x: number) => 1 - Math.pow(1 - clamp(x), 3);
const ease = (x: number) => {
  x = clamp(x);
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
};
/** Timeline (ms), matching the Work ↔ About switch in StoryNavigation. */
const COVERED = 600,
  SWAP = 680,
  UNCOVER = 780,
  DONE = 1380;

/**
 * Lives in the root layout, so it survives page changes: the Record Box keeps
 * playing between the portfolio and the résumé, and page changes use the same
 * transition as Work ↔ About: cream tiles wipe up across the screen with the
 * destination's name stamped in giant type, the page swaps underneath, then
 * the tiles wipe away.
 */
export default function SiteShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [reducedMotion, setReducedMotion] = useState(false);
  const [suspended, setSuspended] = useState(false);
  const player = useVinylPlayer(suspended, reducedMotion);
  const canvas = useRef<HTMLCanvasElement>(null);
  const trip = useRef<{
    href: string;
    word: string;
    from: string;
    elapsed: number;
    pushed: boolean;
    arrived: boolean;
    /** Time spent holding the cover while the next page loads. */
    waited: number;
  } | null>(null);
  const kick = useRef<() => void>(() => {});

  useEffect(() => {
    const query = matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  // The new page is in: the wipe may lift.
  useEffect(() => {
    const t = trip.current;
    if (t && t.pushed) t.arrived = true;
  }, [pathname]);

  // The tile wipe, drawn on one canvas (same maths as StoryNavigation).
  useEffect(() => {
    const c = canvas.current!,
      ctx = c.getContext("2d")!;
    let width = 0,
      height = 0,
      stamp: HTMLCanvasElement | null = null,
      stampWord = "",
      stop: (() => void) | null = null;
    const size = () => {
      width = c.width = innerWidth;
      height = c.height = innerHeight;
      stampWord = "";
    };
    const bake = (word: string) => {
      if (stampWord === word && stamp) return stamp;
      stampWord = word;
      stamp = document.createElement("canvas");
      stamp.width = width;
      stamp.height = height;
      const s = stamp.getContext("2d")!;
      // Fit the word to the width (RÉSUMÉ is longer than WORK).
      let px = Math.round(Math.min(width * 0.36, height * 0.58));
      s.font = `700 ${px}px "Bebas Neue", sans-serif`;
      const w = s.measureText(word).width;
      if (w > width * 0.93) {
        px = Math.floor((px * width * 0.93) / w);
        s.font = `700 ${px}px "Bebas Neue", sans-serif`;
      }
      s.fillStyle = "#111113";
      s.fillText(word, width * 0.035, height * 0.95);
      return stamp;
    };
    size();
    window.addEventListener("resize", size);
    document.fonts.load('700 100px "Bebas Neue"').catch(() => {});

    kick.current = () => {
      if (stop) return;
      c.style.visibility = "visible";
      c.style.pointerEvents = "auto";
      stop = subscribeTicker((_now, dt) => {
        const t = trip.current;
        if (!t) return;
        t.elapsed += Math.min(dt * 1000, 16.67);
        if (t.elapsed >= SWAP && !t.pushed) {
          t.pushed = true;
          router.push(t.href);
        }
        // Hold fully covered until the new page has arrived (never more
        // than 2.5s, so the wipe can't get stuck).
        if (!t.arrived && t.elapsed > UNCOVER - 1) {
          t.elapsed = UNCOVER - 1;
          t.waited += dt * 1000;
          if (t.waited > 2500) t.arrived = true;
        }
        const e = t.elapsed;
        ctx.clearRect(0, 0, width, height);
        ctx.fillStyle = "#F3EFE6";
        const cover = e < COVERED,
          uncover = e >= UNCOVER,
          wave = cover
            ? (e / COVERED) * 1.15
            : uncover
              ? ((e - UNCOVER) / 600) * 1.15
              : 2;
        const cw = width / 16,
          ch = height / 10;
        for (let col = 0; col < 16; col++)
          for (let row = 0; row < 10; row++) {
            const threshold =
              (col / 15) * 0.42 +
              ((9 - row) / 9) * 0.48 +
              ((col * 3) % 4) * 0.035;
            const local = clamp((wave - threshold) / 0.14);
            const fill = uncover ? 1 - ease(local) : out(local);
            if (fill > 0)
              ctx.fillRect(
                col * cw - 0.5,
                row * ch + (cover ? ch * (1 - fill) : 0) - 0.5,
                cw + 1,
                ch * fill + 1,
              );
          }
        const enter = out((e - 140) / 280),
          exit = ease((e - UNCOVER) / 600),
          offset = e < UNCOVER ? 140 * (1 - enter) : -180 * exit;
        ctx.globalCompositeOperation = "source-atop";
        ctx.globalAlpha = e < UNCOVER ? enter : 1 - exit;
        ctx.drawImage(bake(t.word), 0, offset);
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = "source-over";
        if (e >= DONE) {
          trip.current = null;
          ctx.clearRect(0, 0, width, height);
          c.style.visibility = "hidden";
          c.style.pointerEvents = "none";
          stop?.();
          stop = null;
        }
      });
    };
    return () => {
      stop?.();
      window.removeEventListener("resize", size);
    };
  }, [router]);

  const goTo = useCallback(
    (href: string, word: string) => {
      if (trip.current) return;
      if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
        router.push(href);
        return;
      }
      trip.current = {
        href,
        word,
        from: location.pathname,
        elapsed: 0,
        pushed: false,
        arrived: false,
        waited: 0,
      };
      kick.current();
    },
    [router],
  );

  return (
    <ShellContext.Provider
      value={{ player, reducedMotion, setSuspended, goTo }}
    >
      {children}
      <canvas
        ref={canvas}
        className="page-transition-canvas"
        aria-hidden="true"
      />
    </ShellContext.Provider>
  );
}
