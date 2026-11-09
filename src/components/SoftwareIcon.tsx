import { brandAssets } from "@/data/brandAssets";
import { toolCatalog, type Software } from "@/data/projects";

export function SoftwareIcon({ software }: { software: Software }) {
  return (
    <div className={`software-tile software-${software}`}>
      <div className="tile-rim" />
      <div className="tile-emblem">
        <SoftwareEmblem software={software} />
      </div>
      <div className="tile-spotlight" aria-hidden="true" />
      <div className="tile-hover-rim" aria-hidden="true" />
      <span className="tile-brand">{toolCatalog[software].label}</span>
      <span className="tile-screw screw-tl" />
      <span className="tile-screw screw-br" />
    </div>
  );
}

export function SoftwareEmblem({ software }: { software: string }) {
  return (
    <>
      {brandAssets[software] ? (
        <img
          decoding="async"
          loading="eager"
          className="official-tool-logo"
          src={brandAssets[software]}
          alt=""
          draggable={false}
          onError={(e) => {
            const fallback = `/logos/${software}.png`;
            if (e.currentTarget.getAttribute("src") !== fallback)
              e.currentTarget.src = fallback;
          }}
        />
      ) : software === "nextjs" ? (
        <svg
          viewBox="0 0 180 180"
          className="official-tool-logo nextjs-symbol"
          aria-hidden="true"
        >
          <defs>
            <linearGradient
              id="nextjs-a"
              x1="109"
              y1="116.5"
              x2="144.5"
              y2="160.5"
              gradientUnits="userSpaceOnUse"
            >
              <stop stopColor="#fff" />
              <stop offset="1" stopColor="#fff" stopOpacity="0" />
            </linearGradient>
            <linearGradient
              id="nextjs-b"
              x1="121"
              y1="54"
              x2="120.8"
              y2="106.9"
              gradientUnits="userSpaceOnUse"
            >
              <stop stopColor="#fff" />
              <stop offset="1" stopColor="#fff" stopOpacity="0" />
            </linearGradient>
          </defs>
          <circle
            cx="90"
            cy="90"
            r="87"
            fill="#000"
            stroke="#fff"
            strokeOpacity="0.28"
            strokeWidth="3"
          />
          <path
            d="M149.508 157.52L69.142 54H54V125.97H66.1136V69.3836L139.999 164.845C143.333 162.614 146.509 160.165 149.508 157.52Z"
            fill="url(#nextjs-a)"
          />
          <rect x="115" y="54" width="12" height="72" fill="url(#nextjs-b)" />
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
          {software === "ae"
            ? "Ae"
            : software === "pr"
              ? "Pr"
              : software === "ai"
                ? "Ai"
                : "Ps"}
        </span>
      )}
    </>
  );
}
