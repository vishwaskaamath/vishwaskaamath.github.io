import { Fragment, type CSSProperties, type ReactNode } from "react";

/**
 * A run of text split into per-character inline blocks for the heading warp
 * (lib/headingWarp). `live` marks the characters that warp.
 */
export function WarpChars({
  text,
  live = true,
}: {
  text: string;
  live?: boolean;
}) {
  return (
    <>
      {Array.from(text).map((char, i) => (
        <span className="warp-char" data-warp={live ? "" : undefined} key={i}>
          {char === " " ? " " : char}
        </span>
      ))}
    </>
  );
}

/**
 * One line of display type that rises into place: every word is an overflow
 * mask and its characters slide up from below the baseline with a slight
 * vertical stretch, staggered 18ms apart. The reveal is switched by
 * `data-revealed` on the heading (StoryStage). Each character carries its
 * own `.warp-char` inside, so the hover warp and the entrance never share a
 * transform. `start` continues the stagger from a previous line; `after`
 * (e.g. the marker's full-stop target) follows the last word.
 */
export default function RevealText({
  text,
  className = "",
  start = 0,
  after,
}: {
  text: string;
  className?: string;
  start?: number;
  after?: ReactNode;
}) {
  let index = start;
  return (
    <span className={`rise-line ${className}`}>
      {text.split(" ").map((word, w) => (
        <Fragment key={w}>
          {w > 0 && " "}
          <span className="rise-word" aria-hidden="true">
            {Array.from(word).map((char, c) => (
              <span
                className="rise-char"
                key={c}
                style={{ "--d": `${index++ * 18}ms` } as CSSProperties}
              >
                <span className="warp-char" data-warp="">
                  {char}
                </span>
              </span>
            ))}
          </span>
        </Fragment>
      ))}
      {after}
    </span>
  );
}
