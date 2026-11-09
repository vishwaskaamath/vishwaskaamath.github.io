"use client";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { ArrowLeft, Instagram, Linkedin } from "lucide-react";
import { NOW, resume, type Clip } from "@/data/resume";
import { assetUrl } from "@/lib/assetPreloader";
import { subscribeTicker } from "@/lib/masterTicker";
import { attachHeadingWarp } from "@/lib/headingWarp";
import { pageReturn } from "@/lib/pageReturn";
import KineticPill from "./KineticPill";
import { WarpChars } from "./RevealText";
import { SoftwareEmblem } from "./SoftwareIcon";
import VinylPlayer from "./VinylPlayer";
import RibbonCursor from "./RibbonCursor";
import ResumeBackground from "./ResumeBackground";
import { useShell } from "./SiteShell";
import type { WheelDrag } from "@/hooks/useProjectWheel";

/** Timeline range, decimal years. */
const T0 = 2021,
  T1 = 2027;
const YEARS = [2021, 2022, 2023, 2024, 2025, 2026];
/** The whole page reads as a 90-second cut on the timecode HUD. */
const CUT_SECONDS = 90,
  FPS = 24;
/** Same inertial glide as the About story (10% per 60 Hz frame). */
const GLIDE = -Math.log(0.9) * 60;
const MONTHS = "JAN FEB MAR APR MAY JUN JUL AUG SEP OCT NOV DEC".split(" ");

const pct = (t: number) => ((t - T0) / (T1 - T0)) * 100;
const monthOf = (t: number) => {
  const m = Math.min(11, Math.floor((t % 1) * 12 + 1e-6));
  return `${MONTHS[m]} ${Math.floor(t)}`;
};
const duration = (c: Clip) => {
  const months = Math.max(1, Math.round((c.end - c.start) * 12));
  const y = Math.floor(months / 12),
    m = months % 12;
  return [y && `${y} YR${y > 1 ? "S" : ""}`, m && `${m} MO${m > 1 ? "S" : ""}`]
    .filter(Boolean)
    .join(" ");
};
const two = (n: number) => String(n).padStart(2, "0");
const timecode = (frames: number) => {
  const f = Math.floor(frames);
  return `${two(Math.floor(f / (FPS * 3600)))}:${two(Math.floor(f / (FPS * 60)) % 60)}:${two(Math.floor(f / FPS) % 60)}:${two(f % FPS)}`;
};

/**
 * The résumé as its own page, cut like an edit: a film slate for the title,
 * the career as clips on an editing timeline (scrub it, click a clip to
 * inspect it), skills as project bins, and the details as end credits.
 * The Record Box keeps playing from the site shell.
 */
export default function ResumePage() {
  const { player, reducedMotion, goTo } = useShell();
  const scroller = useRef<HTMLDivElement>(null);
  const name = useRef<HTMLHeadingElement>(null);
  const tc = useRef<HTMLElement>(null);
  const bar = useRef<HTMLElement>(null);
  // The ribbon cursor only reads isDragging here (no wheel on this page).
  const dragRef = useRef<WheelDrag>({
    isDragging: false,
    lastY: 0,
    distance: 0,
    velocity: 0,
    wasDragged: false,
    pointerId: -1,
  });
  const [copied, setCopied] = useState(false);
  const pdf = assetUrl(resume.pdf);

  useEffect(() => {
    document.title = "Vishwas Kamath — Résumé";
  }, []);

  const back = useCallback(
    (toWork = false) => {
      if (toWork) {
        pageReturn.view = "work";
        pageReturn.pending = true;
      }
      // Stamp the wipe with where the visitor lands.
      goTo(
        "/",
        pageReturn.pending && pageReturn.view === "about" ? "ABOUT" : "WORK",
      );
    },
    [goTo],
  );

  // Inertial scroll on the page's own scroller (native position, so keys,
  // scrollbar and touch still work), the timecode HUD, and on-scroll reveals.
  useLayoutEffect(() => {
    const el = scroller.current!;
    let target = el.scrollTop,
      current = target,
      key = "";
    const max = () => Math.max(1, el.scrollHeight - el.clientHeight);
    const to = (y: number) => (target = Math.max(0, Math.min(max(), y)));
    const wheel = (event: WheelEvent) => {
      if (event.ctrlKey) return;
      event.preventDefault();
      const unit =
        event.deltaMode === 1
          ? 40
          : event.deltaMode === 2
            ? el.clientHeight
            : 1;
      to(target + event.deltaY * unit);
    };
    const scroll = () => {
      if (Math.abs(el.scrollTop - current) > 2) current = target = el.scrollTop;
    };
    const keys = (event: KeyboardEvent) => {
      if (event.key === "Escape") back();
    };
    el.addEventListener("wheel", wheel, { passive: false });
    el.addEventListener("scroll", scroll, { passive: true });
    window.addEventListener("keydown", keys);
    const stop = subscribeTicker((_now, dt) => {
      if (target !== current) {
        current += (target - current) * (1 - Math.exp(-GLIDE * dt));
        if (Math.abs(target - current) < 0.5) current = target;
        el.scrollTop = current;
      }
      const p = el.scrollTop / max();
      const k = timecode(p * CUT_SECONDS * FPS);
      if (k !== key) {
        key = k;
        if (tc.current) tc.current.textContent = k;
        bar.current?.style.setProperty("--p", p.toFixed(4));
      }
    });
    const reveal = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (!e.isIntersecting) return;
          (e.target as HTMLElement).dataset.in = "true";
          reveal.unobserve(e.target);
        }),
      { root: el, rootMargin: "0px 0px -12% 0px" },
    );
    el.querySelectorAll("[data-in]").forEach((n) => reveal.observe(n));
    const detachWarp = name.current ? attachHeadingWarp(name.current) : null;
    return () => {
      el.removeEventListener("wheel", wheel);
      el.removeEventListener("scroll", scroll);
      window.removeEventListener("keydown", keys);
      stop();
      reveal.disconnect();
      detachWarp?.();
    };
  }, [back]);

  const email = async () => {
    try {
      await navigator.clipboard.writeText(resume.email);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {}
    window.location.href = `mailto:${resume.email}`;
  };

  return (
    <div className="cut" ref={scroller} tabIndex={-1}>
      <ResumeBackground scroller={scroller} />
      <RibbonCursor
        dragRef={dragRef}
        reducedMotion={reducedMotion}
        layerKey="resume"
      />
      <div className="cut-rail cut-rail-left" aria-hidden="true" />
      <div className="cut-rail cut-rail-right" aria-hidden="true" />
      <div className="cut-grain" aria-hidden="true" />

      <div className="cut-back">
        <KineticPill
          label="PORTFOLIO"
          icon={<ArrowLeft size={15} strokeWidth={2.4} />}
          ariaLabel="Back to the portfolio"
          onClick={() => back()}
        />
      </div>
      <header className="minimal-hud cut-hud">
        <div className="minimal-controls">
          <KineticPill
            label="↓ PDF"
            tone="orange"
            href={pdf}
            download="Vishwas-Kamath-Resume.pdf"
            ariaLabel="Download the résumé as a PDF"
            className="cut-pdf"
          />
          <VinylPlayer player={player} reducedMotion={reducedMotion} />
        </div>
      </header>
      <footer className="cut-tc" ref={bar} aria-hidden="true">
        <span className="cut-tc-rec" />
        TC <b ref={tc}>00:00:00:00</b>
        <span className="cut-tc-sep">·</span> {FPS} FPS
        <i className="cut-tc-bar" />
      </footer>

      <main className="cut-page">
        {/* ---------- SLATE (wide, like a real clapperboard) ---------- */}
        <section className="cut-hero">
          <Slate nameRef={name} />

          <div className="cut-intro" data-in>
            <div className="cut-intro-lead">
              <p className="cut-role">{resume.role}</p>
            </div>
            <div className="cut-intro-body">
              <p className="cut-summary">{resume.summary}</p>
              <div className="cut-actions">
                <KineticPill
                  label="↓ DOWNLOAD CV"
                  tone="cream"
                  href={pdf}
                  download="Vishwas-Kamath-Resume.pdf"
                />
                <KineticPill
                  label={copied ? "COPIED ✓" : "EMAIL ME ↗"}
                  tone="ghost"
                  ariaLabel={`Email ${resume.email} (also copies the address)`}
                  onClick={email}
                />
                <a
                  className="cut-icon"
                  href={resume.links.linkedin}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="LinkedIn"
                >
                  <Linkedin size={16} />
                </a>
                <a
                  className="cut-icon"
                  href={resume.links.instagram}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Showreel on Instagram"
                >
                  <Instagram size={16} />
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* ---------- TIMELINE ---------- */}
        <section className="cut-section" aria-labelledby="timeline-title">
          <header className="cut-head" data-in>
            <span className="cut-index">01</span>
            <h2 id="timeline-title">THE TIMELINE</h2>
            <p>
              Five years of work, laid out like an edit. Click a clip to open
              it, drag it onto another track, or scrub the playhead to see what
              I was doing when.
            </p>
          </header>
          <Timeline onWork={() => back(true)} />
        </section>

        {/* ---------- THE KIT: software dock + skill bins as rows ---------- */}
        <section className="cut-section" aria-labelledby="kit-title">
          <header className="cut-head" data-in>
            <span className="cut-index">02</span>
            <h2 id="kit-title">THE KIT</h2>
            <p>What I bring to a project, sorted the way I sort footage.</p>
          </header>
          <div className="kit">
            <div className="kit-soft" data-in>
              <header className="kit-label">
                <span>BIN 01</span>
                <strong>SOFTWARE</strong>
                <em>{resume.software.length} APPS</em>
              </header>
              <ul className="kit-apps">
                {resume.software.map(([id, label]) => (
                  <li key={id}>
                    <span className="bin-logo" data-app={id}>
                      <SoftwareEmblem software={id} />
                    </span>
                    <span>{label}</span>
                  </li>
                ))}
              </ul>
            </div>
            {resume.bins.map((bin, b) => (
              <div className="kit-row" key={bin.title} data-in>
                <header className="kit-label">
                  <span>BIN {two(b + 2)}</span>
                  <strong>{bin.title}</strong>
                  <em>{bin.items.length} ITEMS</em>
                </header>
                <ul className="kit-chips">
                  {bin.items.map((item) => (
                    <li key={item}>
                      <i className={`bin-chip bin-chip-${b}`} />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        {/* ---------- END CREDITS ---------- */}
        <section className="credits" aria-labelledby="credits-title">
          <h2 id="credits-title" className="credits-title" data-in>
            END CREDITS
          </h2>
          <dl className="credits-list">
            {resume.credits.map(([role, lines]) => (
              <div key={role} data-in>
                <dt>{role}</dt>
                <dd>
                  {lines.map((line) => (
                    <span key={line}>{line}</span>
                  ))}
                </dd>
              </div>
            ))}
          </dl>
          <p className="credits-fin" data-in>
            THAT&apos;S A WRAP<span>.</span>
          </p>
          <div className="credits-actions" data-in>
            <KineticPill
              label="↓ DOWNLOAD CV"
              tone="orange"
              href={pdf}
              download="Vishwas-Kamath-Resume.pdf"
            />
            <KineticPill
              label={copied ? "COPIED ✓" : "EMAIL ME ↗"}
              tone="ghost"
              onClick={email}
            />
            <KineticPill
              label="BACK TO THE PORTFOLIO"
              tone="cream"
              icon={<ArrowLeft size={15} strokeWidth={2.4} />}
              onClick={() => back()}
            />
          </div>
        </section>
      </main>
    </div>
  );
}

/** Tracks top to bottom, like an editing timeline (video above, audio below). */
const TRACKS = ["V3", "V2", "V1", "A1", "A2"] as const;
/** Sparks thrown off the slate's jaw when it claps (fixed so renders match). */
const SPARKS = [
  [6, -1],
  [14, 1],
  [22, -1],
  [31, 1],
  [39, -1],
  [47, 1],
  [56, -1],
  [64, 1],
  [72, -1],
  [81, 1],
  [89, -1],
  [96, 1],
];

/**
 * The clapperboard. Grab the top stick and lift it, then let go: it snaps
 * shut with a flash, sparks and a thud, and the clap counter ticks up. A plain
 * click anywhere on the slate claps it too.
 */
function Slate({
  nameRef,
}: {
  nameRef: React.RefObject<HTMLHeadingElement | null>;
}) {
  const stick = useRef<HTMLElement>(null);
  const board = useRef<HTMLDivElement>(null);
  const [claps, setClaps] = useState(1);
  const [fx, setFx] = useState(0);
  const [touched, setTouched] = useState(false);
  const grip = useRef({
    on: false,
    moved: false,
    angle: 0,
    x0: 0,
    y0: 0,
    hx: 0,
    hy: 0,
    busy: false,
  });
  const MAX = 34;

  /** Snap the stick shut from `from` degrees, then the impact. */
  const clap = useCallback((from: number) => {
    const el = stick.current;
    if (!el) return;
    const g = grip.current;
    g.busy = true;
    el.style.animation = "none";
    el.style.transform = "rotate(0deg)";
    const shut = 70 + Math.abs(from) * 4;
    el.animate(
      [{ transform: `rotate(${from}deg)` }, { transform: "rotate(0deg)" }],
      { duration: shut, easing: "cubic-bezier(0.6, 0, 1, 0.5)" },
    );
    // Timers, not animation events: those can stall in background tabs.
    window.setTimeout(() => {
      g.busy = false;
      g.angle = 0;
      setClaps((n) => n + 1);
      setFx((n) => n + 1);
      el.animate(
        [
          { transform: "rotate(0deg)" },
          { transform: "rotate(-2.6deg)" },
          { transform: "rotate(0deg)" },
        ],
        { duration: 200, easing: "ease-out" },
      );
      board.current?.animate(
        [
          { transform: "translateY(0)" },
          { transform: "translateY(4px) rotate(0.25deg)" },
          { transform: "translateY(0)" },
        ],
        { duration: 260, easing: "cubic-bezier(0.16, 1, 0.3, 1)" },
      );
    }, shut);
  }, []);

  /** Lift and clap on its own (a click, or Enter/Space). */
  const autoClap = useCallback(() => {
    const el = stick.current;
    const g = grip.current;
    if (!el || g.busy) return;
    g.busy = true;
    setTouched(true);
    el.style.animation = "none";
    el.animate(
      [{ transform: "rotate(0deg)" }, { transform: "rotate(-26deg)" }],
      { duration: 220, easing: "cubic-bezier(0.16, 1, 0.3, 1)" },
    );
    el.style.transform = "rotate(-26deg)";
    window.setTimeout(() => clap(-26), 220);
  }, [clap]);

  const down = (event: ReactPointerEvent<HTMLElement>) => {
    const g = grip.current;
    if (g.busy || event.button !== 0) return;
    event.stopPropagation();
    const el = event.currentTarget;
    try {
      el.setPointerCapture(event.pointerId);
    } catch {}
    el.style.animation = "none";
    const r = el.getBoundingClientRect();
    // Hinge: the stick's bottom-left corner.
    g.hx = r.left + 14;
    g.hy = r.bottom;
    g.x0 = event.clientX;
    g.y0 = event.clientY;
    g.on = true;
    g.moved = false;
    setTouched(true);
  };
  const move = (event: ReactPointerEvent<HTMLElement>) => {
    const g = grip.current;
    if (!g.on) return;
    if (!g.moved && Math.hypot(event.clientX - g.x0, event.clientY - g.y0) < 4)
      return;
    g.moved = true;
    const deg =
      (Math.atan2(event.clientY - g.hy, Math.max(30, event.clientX - g.hx)) *
        180) /
      Math.PI;
    g.angle = Math.max(-MAX, Math.min(0, deg));
    event.currentTarget.style.transform = `rotate(${g.angle.toFixed(2)}deg)`;
  };
  const up = (event: ReactPointerEvent<HTMLElement>) => {
    const g = grip.current;
    if (!g.on) return;
    g.on = false;
    event.stopPropagation();
    if (!g.moved) autoClap();
    else if (g.angle < -3) clap(g.angle);
    else event.currentTarget.style.transform = "rotate(0deg)";
  };

  return (
    <div
      className="slate"
      data-touched={touched}
      onClick={(event) => {
        if (!(event.target as Element).closest(".slate-stick-top")) autoClap();
      }}
    >
      <span className="slate-hint" aria-hidden="true">
        GRAB THE STICK · LIFT · LET GO
      </span>
      <div className="slate-sticks">
        <i
          ref={stick}
          className="slate-stick slate-stick-top"
          role="button"
          tabIndex={0}
          aria-label="Clap the slate"
          onPointerDown={down}
          onPointerMove={move}
          onPointerUp={up}
          onPointerCancel={up}
          onClick={(event) => event.stopPropagation()}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              autoClap();
            }
          }}
        />
        <i className="slate-stick slate-stick-base" aria-hidden="true" />
        <i className="slate-hinge" aria-hidden="true" />
        {fx > 0 && (
          <span className="slate-fx" key={fx} aria-hidden="true">
            <i className="slate-fx-line" />
            {SPARKS.map(([x, dir], i) => (
              <i
                key={i}
                className="slate-fx-spark"
                style={
                  {
                    left: `${x}%`,
                    "--dir": dir,
                    "--len": `${10 + ((i * 7) % 12)}px`,
                    "--tilt": `${((i * 37) % 50) - 25}deg`,
                  } as React.CSSProperties
                }
              />
            ))}
          </span>
        )}
      </div>
      <div className="slate-board" ref={board}>
        {fx > 0 && (
          <i className="slate-flash" key={`f${fx}`} aria-hidden="true" />
        )}
        <div className="slate-top">
          <span className="slate-label">PRODUCTION</span>
          <span className="slate-cut">
            RÉSUMÉ · THE 2026 CUT
            <b className="slate-count" key={claps} aria-live="polite">
              CLAP {two(claps)}
            </b>
          </span>
        </div>
        <h1 ref={nameRef} className="slate-name" aria-label="Vishwas Kamath">
          <span aria-hidden="true">
            <span className="slate-first">
              <WarpChars text={resume.first} />
            </span>{" "}
            <span className="slate-last">
              <WarpChars text={resume.last} />
            </span>
          </span>
        </h1>
      </div>
    </div>
  );
}

/**
 * Career as clips on an NLE-style timeline.
 * - The playhead scrubs through time; clips live at that moment light up.
 * - Click a clip to open it in the inspector (playhead parks on its in-point).
 * - Drag a clip up or down onto another track to swap the two (Alt + ↑/↓ on
 *   a focused clip does the same). The track names and the inspector's clip
 *   number follow the clip's new position.
 */
function Timeline({ onWork }: { onWork: () => void }) {
  const [order, setOrder] = useState(() => resume.clips.map((c) => c.id));
  const [selected, setSelected] = useState("edit");
  const [head, setHead] = useState(NOW);
  const [dragId, setDragId] = useState<string | null>(null);
  const [target, setTarget] = useState(-1);
  const lanes = useRef<HTMLDivElement>(null);
  const scrubbing = useRef(false);
  const justDragged = useRef(false);
  const flips = useRef<{ id: string; from: number }[]>([]);
  const drag = useRef({
    id: "",
    start: 0,
    x0: 0,
    y0: 0,
    lane: 58,
    moved: false,
    to: 0,
  });

  const clips = order.map((id) => resume.clips.find((c) => c.id === id)!);
  const live = (c: Clip, t: number) => t >= c.start - 1e-3 && t <= c.end + 1e-3;
  const clip = clips.find((c) => c.id === selected) ?? clips[0];
  const lane = order.indexOf(clip.id);

  // After a reorder, glide the moved clips from where they were (FLIP).
  useLayoutEffect(() => {
    const moves = flips.current;
    flips.current = [];
    moves.forEach(({ id, from }) => {
      lanes.current
        ?.querySelector<HTMLElement>(`[data-clip="${id}"]`)
        ?.animate(
          [{ transform: `translateY(${from}px)` }, { transform: "none" }],
          { duration: 340, easing: "cubic-bezier(0.16, 1, 0.3, 1)" },
        );
    });
  }, [order]);

  /** Swap the clips in lanes a and b, remembering where each was drawn. */
  const swap = (a: number, b: number, fromA: number) => {
    if (a === b) return;
    const laneH = drag.current.lane;
    flips.current = [
      { id: order[a], from: fromA },
      { id: order[b], from: (b - a) * laneH },
    ];
    setOrder((o) => {
      const next = [...o];
      [next[a], next[b]] = [next[b], next[a]];
      return next;
    });
  };

  const scrubTo = (clientX: number) => {
    const r = lanes.current!.getBoundingClientRect();
    const p = Math.max(0, Math.min(1, (clientX - r.left) / r.width));
    const t = Math.min(NOW, T0 + p * (T1 - T0));
    setHead(t);
    // Keep the selection on something that is "playing" at this moment.
    setSelected((id) => {
      const cur = clips.find((c) => c.id === id);
      if (cur && live(cur, t)) return id;
      return clips.find((c) => live(c, t))?.id ?? id;
    });
  };
  const scrubDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if ((event.target as Element).closest(".tl-clip")) return;
    scrubbing.current = true;
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {}
    scrubTo(event.clientX);
  };
  const scrubMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (scrubbing.current) scrubTo(event.clientX);
  };
  const scrubUp = () => (scrubbing.current = false);

  const clipDown = (event: ReactPointerEvent<HTMLButtonElement>, i: number) => {
    if (event.button !== 0) return;
    event.stopPropagation();
    const el = event.currentTarget;
    try {
      el.setPointerCapture(event.pointerId);
    } catch {}
    const d = drag.current;
    d.id = order[i];
    d.start = i;
    d.to = i;
    d.x0 = event.clientX;
    d.y0 = event.clientY;
    d.moved = false;
    d.lane = el.parentElement?.offsetHeight || 58;
  };
  const clipMove = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const d = drag.current;
    if (!d.id) return;
    const dy = event.clientY - d.y0;
    if (!d.moved) {
      if (Math.abs(dy) < 6) return;
      d.moved = true;
      setDragId(d.id);
    }
    const n = order.length;
    // Follow the pointer, held inside the stack of tracks.
    const min = -d.start * d.lane,
      max = (n - 1 - d.start) * d.lane;
    const y = Math.max(min, Math.min(max, dy));
    event.currentTarget.style.transform = `translateY(${y}px)`;
    const to = Math.max(0, Math.min(n - 1, Math.round(d.start + y / d.lane)));
    if (to !== d.to) {
      d.to = to;
      setTarget(to);
    }
  };
  const clipUp = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const d = drag.current;
    if (!d.id) return;
    const el = event.currentTarget;
    if (d.moved) {
      justDragged.current = true;
      const dy = Math.max(
        -d.start * d.lane,
        Math.min((order.length - 1 - d.start) * d.lane, event.clientY - d.y0),
      );
      el.style.transform = "";
      if (d.to !== d.start)
        swap(d.start, d.to, d.start * d.lane + dy - d.to * d.lane);
      else
        el.animate(
          [{ transform: `translateY(${dy}px)` }, { transform: "none" }],
          {
            duration: 260,
            easing: "cubic-bezier(0.16, 1, 0.3, 1)",
          },
        );
      setSelected(d.id);
    }
    d.id = "";
    setDragId(null);
    setTarget(-1);
  };
  const pick = (c: Clip) => {
    if (justDragged.current) {
      justDragged.current = false;
      return;
    }
    setSelected(c.id);
    setHead(c.start);
  };
  const keyMove = (event: React.KeyboardEvent, i: number) => {
    if (!event.altKey || (event.key !== "ArrowUp" && event.key !== "ArrowDown"))
      return;
    event.preventDefault();
    const to = i + (event.key === "ArrowUp" ? -1 : 1);
    if (to < 0 || to >= order.length) return;
    drag.current.lane =
      (event.currentTarget as HTMLElement).parentElement?.offsetHeight || 58;
    swap(i, to, (i - to) * drag.current.lane);
    requestAnimationFrame(() =>
      lanes.current
        ?.querySelector<HTMLElement>(`[data-clip="${order[i]}"]`)
        ?.focus(),
    );
  };

  return (
    <div className="tl-wrap" data-in>
      <div className="tl-frame">
        <div
          className="tl"
          data-dragging={dragId ? "true" : undefined}
          style={{ "--head": pct(head) / 100 } as React.CSSProperties}
        >
          <div className="tl-corner" aria-hidden="true">
            <span>TRACKS</span>
          </div>
          <div
            className="tl-scrub"
            onPointerDown={scrubDown}
            onPointerMove={scrubMove}
            onPointerUp={scrubUp}
            onPointerCancel={scrubUp}
          >
            <div className="tl-ruler" aria-hidden="true">
              {YEARS.map((y) => (
                <span key={y} style={{ left: `${pct(y)}%` }}>
                  {y}
                </span>
              ))}
              <span className="tl-now" style={{ left: `${pct(NOW)}%` }}>
                NOW
              </span>
            </div>
            <div className="tl-lanes" ref={lanes}>
              {clips.map((c, i) => (
                <div
                  className="tl-lane"
                  key={TRACKS[i]}
                  data-target={
                    target === i && dragId !== null && order[i] !== dragId
                  }
                >
                  <button
                    type="button"
                    className={`tl-clip is-${c.tone}`}
                    key={c.id}
                    data-clip={c.id}
                    data-live={live(c, head)}
                    data-selected={c.id === selected}
                    data-dragging={dragId === c.id}
                    aria-pressed={c.id === selected}
                    aria-label={`${c.title}, ${c.dates}, track ${TRACKS[i]}. Alt plus arrow keys moves it between tracks.`}
                    style={{
                      left: `${pct(c.start)}%`,
                      width: `${Math.max(1.6, pct(c.end) - pct(c.start))}%`,
                    }}
                    onPointerDown={(event) => clipDown(event, i)}
                    onPointerMove={clipMove}
                    onPointerUp={clipUp}
                    onPointerCancel={clipUp}
                    onClick={() => pick(c)}
                    onKeyDown={(event) => keyMove(event, i)}
                  >
                    <span>{c.trackLabel}</span>
                  </button>
                </div>
              ))}
              <div className="tl-head" aria-hidden="true">
                <span>{head >= NOW - 0.01 ? "NOW" : monthOf(head)}</span>
              </div>
            </div>
          </div>
          <div className="tl-labels" aria-hidden="true">
            {clips.map((c, i) => (
              <span
                key={TRACKS[i]}
                data-live={live(c, head)}
                data-target={
                  target === i && dragId !== null && order[i] !== dragId
                }
              >
                <b>{TRACKS[i]}</b> {c.trackLabel}
              </span>
            ))}
          </div>
        </div>
      </div>

      <article className="insp" key={clip.id} aria-live="polite">
        <div className="insp-meta">
          <dl>
            <div>
              <dt>IN</dt>
              <dd>{monthOf(clip.start)}</dd>
            </div>
            <div>
              <dt>OUT</dt>
              <dd>{clip.end >= NOW - 0.01 ? "NOW" : monthOf(clip.end)}</dd>
            </div>
            <div>
              <dt>DURATION</dt>
              <dd>{duration(clip)}</dd>
            </div>
            <div>
              <dt>WHERE</dt>
              <dd>{clip.place}</dd>
            </div>
          </dl>
        </div>
        <div className="insp-main">
          <p className="insp-dates">{clip.dates}</p>
          <h3>{clip.title}</h3>
          <p className="insp-org">{clip.org}</p>
          <ul>
            {clip.bullets.map((b) => (
              <li key={b}>{b}</li>
            ))}
          </ul>
          <div className="insp-foot">
            {clip.action && (
              <KineticPill
                label={`${clip.action} ↗`}
                tone="orange"
                onClick={onWork}
              />
            )}
            {clip.score && (
              <span className="insp-tag is-hot">{clip.score}</span>
            )}
            {clip.tag && <span className="insp-tag">{clip.tag}</span>}
          </div>
        </div>
      </article>
    </div>
  );
}
