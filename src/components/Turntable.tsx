"use client";
import { useEffect, useId, useRef, type CSSProperties } from "react";
import type { Track } from "@/data/playlist";
import type { Deck } from "@/hooks/useVinylPlayer";
import { subscribeTicker } from "@/lib/masterTicker";
import { ARM_REST, DECK } from "@/lib/turntable";

const pctX = (n: number) => `${(n / DECK.width) * 100}%`;
const pctY = (n: number) => `${(n / DECK.height) * 100}%`;
/** Absolutely positions a circle of radius r (deck units) on the deck centre. */
const disc = (r: number, x: number = DECK.cx, y: number = DECK.cy) => ({
  left: pctX(x - r),
  top: pctY(y - r),
  width: pctX(r * 2),
  height: pctY(r * 2),
});
const easeIn = (t: number) => t * t;
const easeOut = (t: number) => 1 - (1 - t) * (1 - t) * (1 - t);

/**
 * Tonearm drawn pointing down from its pivot (rotation 0): rear counterweight,
 * gimbal, S-curved tube and an angled headshell whose glowing stylus sits at
 * the exact point the arm physics tracks across the grooves.
 */
function ArmShape({ id, hit = false }: { id: string; hit?: boolean }) {
  const { pivotX: x, pivotY: y, armLength: L } = DECK;
  const tip = y + L;
  const tube = `M ${x} ${y + 10} C ${x} ${y + 64} ${x - 15} ${y + 86} ${x - 15} ${y + 116} S ${x} ${tip - 78} ${x} ${tip - 40}`;
  return (
    <>
      {/* Counterweight: dark knurled cylinder behind the pivot. */}
      <rect
        x={x - 12}
        y={y - 56}
        width={24}
        height={30}
        rx={4}
        fill={`url(#${id}-weight)`}
        className="arm-edge"
      />
      {Array.from({ length: 7 }, (_, i) => (
        <line
          key={i}
          x1={x - 12}
          x2={x + 12}
          y1={y - 52 + i * 2.2}
          y2={y - 52 + i * 2.2}
          className="arm-knurl"
        />
      ))}
      <line
        x1={x - 12}
        x2={x + 12}
        y1={y - 33}
        y2={y - 33}
        className="arm-index"
      />
      <rect
        x={x - 3}
        y={y - 27}
        width={6}
        height={18}
        rx={1.5}
        fill={`url(#${id}-chrome)`}
      />
      {/* S-curved tube with a running highlight. */}
      <path d={tube} className="arm-tube" stroke={`url(#${id}-tube)`} />
      <path d={tube} className="arm-tube-shine" transform="translate(-0.9 0)" />
      <rect
        x={x - 3.8}
        y={tip - 42}
        width={7.6}
        height={7}
        rx={1.4}
        fill={`url(#${id}-chrome)`}
      />
      {/* Angled black headshell, cartridge and glowing stylus. */}
      <g transform={`rotate(-22 ${x} ${tip})`}>
        <path
          d={`M ${x - 3.6} ${tip - 36} L ${x - 8.5} ${tip - 26} L ${x - 8.5} ${tip + 3} Q ${x - 8.5} ${tip + 6} ${x - 5.5} ${tip + 6} L ${x + 5.5} ${tip + 6} Q ${x + 8.5} ${tip + 6} ${x + 8.5} ${tip + 3} L ${x + 8.5} ${tip - 26} L ${x + 3.6} ${tip - 36} Z`}
          className="arm-head"
        />
        <rect
          x={x - 5.5}
          y={tip - 23}
          width={11}
          height={1.8}
          rx={0.9}
          className="arm-slot"
        />
        <rect
          x={x - 5.5}
          y={tip - 18.5}
          width={11}
          height={1.8}
          rx={0.9}
          className="arm-slot"
        />
        <rect
          x={x - 6.2}
          y={tip - 15}
          width={12.4}
          height={13.5}
          rx={1.6}
          className="arm-cartridge"
        />
        <rect
          x={x - 6.2}
          y={tip - 15}
          width={12.4}
          height={1.6}
          rx={0.8}
          className="arm-cartridge-line"
        />
        <path
          d={`M ${x + 8.5} ${tip - 24} q 7 -1 11 -8`}
          className="arm-finger"
        />
        <circle
          cx={x}
          cy={tip}
          r={4.2}
          className="arm-stylus-glow"
          filter={`url(#${id}-glow)`}
        />
        <circle cx={x} cy={tip} r={1.5} className="arm-stylus" />
      </g>
      {/* Gimbal housing over the pivot. */}
      <circle cx={x} cy={y} r={11.5} className="arm-gimbal" />
      <circle cx={x} cy={y} r={7.5} className="arm-gimbal-ring" />
      <circle cx={x} cy={y} r={3.6} fill={`url(#${id}-chrome-r)`} />
      {hit && (
        <>
          <path d={tube} className="arm-hit arm-hit-tube" />
          <circle cx={x - 4} cy={tip - 14} r={15} className="arm-hit" />
        </>
      )}
    </>
  );
}

export default function Turntable({
  deck,
  track,
  onArmGrab,
  onArmDrag,
  onArmRelease,
}: {
  deck: React.RefObject<Deck>;
  track: Track;
  onArmGrab: () => boolean;
  onArmDrag: (angle: number) => void;
  onArmRelease: () => void;
}) {
  const strobe = useRef<HTMLDivElement>(null);
  const recordWrap = useRef<HTMLDivElement>(null);
  const recordSpin = useRef<HTMLDivElement>(null);
  const arm = useRef<SVGGElement>(null);
  const armShadow = useRef<SVGGElement>(null);
  const root = useRef<HTMLDivElement>(null);
  const svg = useRef<SVGSVGElement>(null);
  const grip = useRef<{ pointer: number; offset: number } | null>(null);
  const id = useId().replace(/:/g, "");

  useEffect(() => {
    let last = "";
    return subscribeTicker(() => {
      const d = deck.current;
      const key = `${d.angle.toFixed(2)}|${d.arm.toFixed(3)}|${d.lift.toFixed(3)}|${d.swap.toFixed(3)}|${d.speed > 0}`;
      if (key === last) return;
      last = key;
      const spin = `rotate(${d.angle}deg)`;
      if (recordSpin.current) recordSpin.current.style.transform = spin;
      if (strobe.current) strobe.current.style.transform = spin;

      // Record change: lift and slide the old record off, drop the new one on.
      const wrap = recordWrap.current;
      if (wrap) {
        let transform = "none",
          opacity = 1,
          raised = 0;
        if (d.swap > 0 && d.swap <= 1) {
          const s = d.swap,
            t = easeIn(Math.max(0, (s - 0.2) / 0.8));
          raised = Math.min(1, s * 4);
          transform = `translate(${-150 * t}%, ${-12 * t}%) rotate(${-24 * t}deg) scale(${1 + 0.05 * raised})`;
          opacity = 1 - Math.max(0, (s - 0.7) / 0.3);
        } else if (d.swap > 1) {
          const t = Math.min(1, d.swap - 1),
            e = easeOut(t);
          raised = 1 - Math.max(0, (t - 0.65) / 0.35);
          transform = `translate(${-26 * (1 - e)}%, ${-70 * (1 - e)}%) rotate(${18 * (1 - e)}deg) scale(${1 + 0.05 * raised})`;
          opacity = Math.min(1, t * 4);
        }
        wrap.style.transform = transform;
        wrap.style.opacity = String(opacity);
        wrap.style.setProperty("--raised", raised.toFixed(3));
      }

      const { pivotX: px, pivotY: py } = DECK;
      const lift = 1 + 0.03 * d.lift;
      const pose = `rotate(${d.arm} ${px} ${py}) translate(${px} ${py}) scale(${lift}) translate(${-px} ${-py})`;
      arm.current?.setAttribute("transform", pose);
      armShadow.current?.setAttribute(
        "transform",
        `translate(${3 + 8 * d.lift} ${5 + 10 * d.lift}) ${pose}`,
      );
      if (armShadow.current)
        armShadow.current.style.opacity = String(0.55 - 0.25 * d.lift);
    });
  }, [deck]);

  const { pivotX: px, pivotY: py, armLength: L } = DECK;
  const restY = py + L * 0.66;
  const pointerAngle = (event: React.PointerEvent) => {
    const r = svg.current!.getBoundingClientRect();
    const ux = ((event.clientX - r.left) / r.width) * DECK.width;
    const uy = ((event.clientY - r.top) / r.height) * DECK.height;
    return (Math.atan2(-(ux - px), uy - py) * 180) / Math.PI;
  };
  const grab = (event: React.PointerEvent<SVGElement>) => {
    if (event.button !== 0 || grip.current) return;
    if (!onArmGrab()) return;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    // Keep the point that was grabbed under the pointer while dragging.
    grip.current = {
      pointer: event.pointerId,
      offset: deck.current.arm - pointerAngle(event),
    };
    root.current!.dataset.dragging = "true";
  };
  const drag = (event: React.PointerEvent<SVGElement>) => {
    const g = grip.current;
    if (!g || g.pointer !== event.pointerId) return;
    const angle = pointerAngle(event);
    // Ignore the pointer swinging round behind the pivot.
    if (angle < -90 || angle > 120) return;
    onArmDrag(angle + g.offset);
  };
  const drop = (event: React.PointerEvent<SVGElement>) => {
    const g = grip.current;
    if (!g || g.pointer !== event.pointerId) return;
    grip.current = null;
    delete root.current!.dataset.dragging;
    onArmRelease();
  };
  return (
    <div
      ref={root}
      className="deck"
      style={
        {
          aspectRatio: `${DECK.width} / ${DECK.height}`,
          "--label": track.label,
        } as CSSProperties
      }
    >
      {/* Platter: machined rim and a faint micro-strobe ring. */}
      <div
        className="deck-platter"
        style={disc(DECK.platterR)}
        aria-hidden="true"
      >
        <div className="deck-strobe" ref={strobe} />
        <div className="deck-mat" />
      </div>
      <div
        className="deck-record"
        ref={recordWrap}
        style={disc(DECK.recordR)}
        aria-hidden="true"
      >
        <div className="deck-record-spin" ref={recordSpin}>
          <div className="deck-grooves" />
          <div className="deck-label">
            <svg viewBox="0 0 100 100">
              <defs>
                <path id={`${id}-arc`} d="M 50 50 m -37 0 a 37 37 0 1 1 74 0" />
                <path
                  id={`${id}-inner`}
                  d="M 50 50 m -22 0 a 22 22 0 1 1 44 0"
                />
                <path id={`${id}-low`} d="M 50 50 m -38 0 a 38 38 0 0 0 76 0" />
              </defs>
              <circle cx="50" cy="50" r="45" className="deck-label-ring" />
              <text className="deck-label-title">
                <textPath
                  href={`#${id}-arc`}
                  startOffset="50%"
                  textAnchor="middle"
                >
                  {track.title.toUpperCase()}
                </textPath>
              </text>
              <text className="deck-label-mark">
                <textPath
                  href={`#${id}-inner`}
                  startOffset="50%"
                  textAnchor="middle"
                >
                  VK
                </textPath>
              </text>
              <text className="deck-label-small">
                <textPath
                  href={`#${id}-low`}
                  startOffset="50%"
                  textAnchor="middle"
                >
                  {track.artist.toUpperCase()} · 33⅓ RPM · SIDE A
                </textPath>
              </text>
            </svg>
          </div>
          <i className="deck-dust" />
        </div>
        {/* Stationary two-sided specular reflection. */}
        <div className="deck-sheen" />
      </div>
      <div className="deck-spindle" style={disc(5)} aria-hidden="true" />
      <svg
        ref={svg}
        className="deck-arm"
        viewBox={`0 0 ${DECK.width} ${DECK.height}`}
        aria-hidden="true"
      >
        <defs>
          <filter
            id={`${id}-blur`}
            x="-20%"
            y="-20%"
            width="140%"
            height="140%"
          >
            <feGaussianBlur stdDeviation="3" />
          </filter>
          <filter
            id={`${id}-glow`}
            x="-200%"
            y="-200%"
            width="500%"
            height="500%"
          >
            <feGaussianBlur stdDeviation="2.2" />
          </filter>
          <linearGradient
            id={`${id}-tube`}
            gradientUnits="userSpaceOnUse"
            x1={px - 19}
            y1="0"
            x2={px + 4}
            y2="0"
          >
            <stop offset="0" stopColor="#8e8e96" />
            <stop offset="0.5" stopColor="#e4e4ec" />
            <stop offset="1" stopColor="#686870" />
          </linearGradient>
          <linearGradient id={`${id}-weight`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#0d0d10" />
            <stop offset="0.4" stopColor="#34343b" />
            <stop offset="1" stopColor="#0b0b0e" />
          </linearGradient>
          <linearGradient id={`${id}-chrome`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#6a6a72" />
            <stop offset="0.45" stopColor="#f2f2f6" />
            <stop offset="1" stopColor="#55555c" />
          </linearGradient>
          <radialGradient id={`${id}-chrome-r`} cx="0.35" cy="0.3" r="0.8">
            <stop offset="0" stopColor="#ffffff" />
            <stop offset="0.55" stopColor="#a8a8b0" />
            <stop offset="1" stopColor="#3c3c44" />
          </radialGradient>
          <radialGradient id={`${id}-base`} cx="0.4" cy="0.35" r="0.75">
            <stop offset="0" stopColor="#2b2b32" />
            <stop offset="0.75" stopColor="#141418" />
            <stop offset="1" stopColor="#0b0b0e" />
          </radialGradient>
        </defs>
        {/* Machined gimbal base, arm rest and cue lever. */}
        <circle
          cx={px}
          cy={py}
          r={27}
          fill={`url(#${id}-base)`}
          className="arm-base"
        />
        <circle cx={px} cy={py} r={21} className="arm-base-ring" />
        {[0, 120, 240].map((a) => (
          <circle
            key={a}
            cx={px + Math.cos((a * Math.PI) / 180) * 24}
            cy={py + Math.sin((a * Math.PI) / 180) * 24}
            r={1.1}
            className="arm-base-screw"
          />
        ))}
        <rect
          x={px + 22}
          y={py + 58}
          width={6}
          height={22}
          rx={3}
          className="arm-cue"
        />
        <circle
          cx={px}
          cy={restY + 7}
          r={7}
          fill={`url(#${id}-base)`}
          className="arm-base"
        />
        <path
          d={`M ${px - 6} ${restY + 1} V ${restY + 8} a 6 6 0 0 0 12 0 V ${restY + 1}`}
          className="arm-clip"
        />
        <g ref={armShadow} filter={`url(#${id}-blur)`} className="arm-shadow">
          <ArmShape id={id} />
        </g>
        <g
          ref={arm}
          transform={`rotate(${ARM_REST} ${px} ${py})`}
          onPointerDown={grab}
          onPointerMove={drag}
          onPointerUp={drop}
          onPointerCancel={drop}
          onLostPointerCapture={drop}
        >
          <ArmShape id={id} hit />
        </g>
      </svg>
    </div>
  );
}
