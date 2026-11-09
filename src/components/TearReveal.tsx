import { projects } from "@/data/projects";
import { assetUrl, monoPoster } from "@/lib/assetPreloader";

/**
 * Torn-paper cinema aperture between "This is my thing" (cream) and
 * "Inside the workflow" (dark). The cream chapter's paper teeth hang over
 * it; the section pins briefly while a 35mm strip rolls across the falling
 * background (the frames repeat twice so the loop is seamless). Motion is
 * driven by the About loop in StoryStage; the strip can also be grabbed
 * and thrown.
 */
export default function TearReveal() {
  return (
    <section className="tear-section" aria-label="Selected work">
      <div className="tear-pin">
        <div className="tear-reel" aria-hidden="true">
          <div className="tear-strip-angle" data-drag-own>
            <div className="tear-strip">
              {[...projects, ...projects].map((project, i) => (
                <figure className="tear-frame" key={`${project.id}-${i}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={assetUrl(monoPoster(project.poster))}
                    alt=""
                    loading="eager"
                    decoding="async"
                    draggable={false}
                  />
                  <figcaption>
                    {String((i % projects.length) + 1).padStart(2, "0")} /{" "}
                    {project.shortTitle.toUpperCase()}
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
          <p className="tear-caption">
            <span>✳ 2021 — 2026 ✳</span>
          </p>
        </div>
      </div>
    </section>
  );
}
