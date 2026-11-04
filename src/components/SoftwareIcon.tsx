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

const brandAssets:Record<string,string>={figma:'https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/figma/figma-original.svg',blender:'https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/blender/blender-original.svg',davinci:'https://upload.wikimedia.org/wikipedia/commons/4/4d/DaVinci_Resolve_Studio.png',handbrake:'/logos/handbrake.png'};
export function SoftwareEmblem({software}: {software: string}) { return <>{brandAssets[software] ? <img className="official-tool-logo" src={brandAssets[software]} alt="" draggable={false} onError={e=>{const fallback=`/logos/${software}.png`;if(e.currentTarget.getAttribute('src')!==fallback)e.currentTarget.src=fallback;}}/> : software === "jitter" ? (
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
