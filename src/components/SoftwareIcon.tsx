import type { Software } from "@/data/projects";

const labels: Record<Software, string> = {
  ae: "After Effects",
  pr: "Premiere Pro",
  ps: "Photoshop",
  figma: "Figma",
  jitter: "Jitter",
};
export function SoftwareIcon({ software }: { software: Software }) {
  return (
    <div className={`software-tile software-${software}`}>
      <div className="tile-rim" />
      {software === "figma" ? (
        <svg viewBox="0 0 60 90" className="figma-symbol" aria-hidden="true">
          <path fill="#f24e1e" d="M15 0h15v30H15a15 15 0 010-30" />
          <path fill="#ff7262" d="M30 0h15a15 15 0 010 30H30" />
          <path fill="#a259ff" d="M15 30h15v30H15a15 15 0 010-30" />
          <circle fill="#1abcfe" cx="45" cy="45" r="15" />
          <path fill="#0acf83" d="M15 60h15v15a15 15 0 11-15-15" />
        </svg>
      ) : software === "jitter" ? (
        <svg viewBox="0 0 100 100" className="jitter-symbol" aria-hidden="true">
          <path
            d="M26 23v34c0 17 10 25 25 25s25-10 25-25V23M40 23v34c0 7 3 11 11 11s11-5 11-11V23"
            fill="none"
            stroke="currentColor"
            strokeWidth="8"
            strokeLinecap="round"
          />
        </svg>
      ) : (
        <span className="adobe-symbol" aria-hidden="true">
          {software === "ae" ? "Ae" : software === "pr" ? "Pr" : "Ps"}
        </span>
      )}
      <span className="tile-brand">{labels[software]}</span>
      <span className="tile-screw screw-tl" />
      <span className="tile-screw screw-br" />
    </div>
  );
}
