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
      <div className="tile-emblem"><SoftwareEmblem software={software}/></div>
      <div className="tile-spotlight" aria-hidden="true"/><div className="tile-hover-rim" aria-hidden="true"/>
      <span className="tile-brand">{labels[software]}</span>
      <span className="tile-screw screw-tl" />
      <span className="tile-screw screw-br" />
    </div>
  );
}

export function SoftwareEmblem({software}: {software: string}) { return <>{software === "blender" ? (
 <svg viewBox="0 0 100 100" aria-hidden="true"><path fill="#F5792A" d="M12 23 43 42 17 43 3 56 34 56 11 72 20 82 39 68C44 87 76 90 91 72 108 51 84 29 63 35L38 12 27 16 51 39 19 17Z"/><ellipse cx="64" cy="60" rx="22" ry="19" fill="#fff"/><ellipse cx="64" cy="60" rx="15" ry="13" fill="#265787"/></svg>
 ) : software === "davinci" ? (
 <svg viewBox="0 0 100 100" aria-hidden="true"><path fill="#06B6D4" d="M49 46C17 33 21 5 49 5S83 33 53 46Z"/><path fill="#10B981" d="M49 8C30 8 25 24 34 35L49 45Z"/><path fill="#F59E0B" d="M44 51C41 82 14 95 7 70S19 37 44 51Z"/><path fill="#EF4444" d="M55 51C82 35 102 53 91 76S59 86 55 51Z"/><circle cx="50" cy="50" r="7" fill="#e7e8ee"/></svg>
 ) : software === "handbrake" ? (
 <svg viewBox="0 0 100 100" aria-hidden="true"><path fill="#65a83d" d="m34 31-16-20 17 6L39 2l6 16 18-9-13 23Z"/><path fill="#FACC15" stroke="#d99b20" strokeWidth="2" d="M27 30Q42 22 55 35L59 73Q43 88 25 72Z"/><path d="m27 35 29 32m-29-17 24 26m-18-44 24 24m-3-23-28 31m31-15-24 27" stroke="#bd8616" strokeWidth="2"/><path fill="#38BDF8" fillOpacity=".6" stroke="#c0edff" strokeWidth="2" d="M45 29h47L72 60v26h15v5H55v-5h13V60Z"/><path fill="#FB7185" d="m52 39 16 18h5l13-18Z"/><path d="m72 44 11-31h11" fill="none" stroke="#F3EFE6" strokeWidth="3"/><circle cx="27" cy="79" r="15" fill="#384153" stroke="#9aa9bd" strokeWidth="2"/>{[0,1,2,3,4].map(i=><circle key={i} cx={27+9*Math.cos(i*1.257)} cy={79+9*Math.sin(i*1.257)} r="3.2" fill="#09090b"/>)}<circle cx="27" cy="79" r="2.5" fill="#FACC15"/></svg>
 ) : software === "figma" ? (
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
          {software === "ae" ? "Ae" : software === "pr" ? "Pr" : software === "ai" ? "Ai" : "Ps"}
        </span>
      )}</>; }
