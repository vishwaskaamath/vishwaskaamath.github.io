import type { ReactNode } from "react";

type Tone = "cream" | "dark" | "orange" | "outline" | "ghost";

type Props = {
  label: string;
  tone?: Tone;
  /** Content of the round end cap (an arrow or icon). Omit for a plain pill. */
  icon?: ReactNode;
  className?: string;
  ariaLabel?: string;
} & (
  | { href: string; download?: string; external?: boolean; onClick?: never }
  | { onClick: () => void; href?: never; download?: never; external?: never }
);

/**
 * The site's kinetic pill: the label rolls up on hover while an ink flood
 * spreads out from the right (from the round end cap when there is one).
 * Same motion language as the Work/About portal pill. Styles: resume.css.
 */
export default function KineticPill(props: Props) {
  const { label, tone = "cream", icon, className = "", ariaLabel } = props;
  const body = (
    <>
      <span className="kpill-flood" aria-hidden="true" />
      <span className="kpill-title" aria-hidden="true">
        <span className="kpill-roll">
          <span>{label}</span>
          <span>{label}</span>
        </span>
      </span>
      {icon && (
        <span className="kpill-circle" aria-hidden="true">
          {icon}
        </span>
      )}
    </>
  );
  const cls = `kpill kpill-${tone}${icon ? " has-icon" : ""} ${className}`;
  if ("href" in props && props.href)
    return (
      <a
        className={cls}
        href={props.href}
        download={props.download}
        target={props.external ? "_blank" : undefined}
        rel={props.external ? "noreferrer" : undefined}
        aria-label={ariaLabel ?? label}
      >
        {body}
      </a>
    );
  return (
    <button
      type="button"
      className={cls}
      onClick={props.onClick}
      aria-label={ariaLabel ?? label}
    >
      {body}
    </button>
  );
}
