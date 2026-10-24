"use client";
import { useEffect, useRef, useState } from "react";
import { ArrowDownToLine, ArrowUpRight, Check, Copy, X } from "lucide-react";
import { profile, projects, type Project } from "@/data/projects";
import { SoftwareIcon } from "./SoftwareIcon";

export type Panel = "about" | "lab" | "studio" | "contact" | "project" | null;
export default function Overlay({
  panel,
  project,
  onClose,
  onSelect,
  onBurst,
}: {
  panel: Panel;
  project: Project;
  onClose: () => void;
  onSelect: (index: number) => void;
  onBurst: (x: number, y: number, count?: number) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    const el = dialog.current;
    if (!el) return;
    const focused = document.activeElement as HTMLElement | null;
    if (panel && !el.open) el.showModal();
    if (!panel && el.open) el.close();
    return () => {
      if (el.open) el.close();
      focused?.focus({ preventScroll: true });
    };
  }, [panel]);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(profile.email);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };
  return (
    <dialog
      ref={dialog}
      className={`overlay ${panel === "project" ? "project-overlay" : ""}`}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      aria-labelledby="panel-title"
    >
      {panel && (
        <div className="overlay-content">
          <button
            className="close-button"
            aria-label="Close panel"
            onClick={onClose}
          >
            <X size={20} />
          </button>
          {panel === "project" ? (
            <>
              <span className="micro-label">
                SELECTED WORK / {project.kind}
              </span>
              <h2 id="panel-title">
                {project.shortTitle}
                <span className="coral">.</span>
              </h2>
              <video
                key={project.id}
                className="full-film"
                src={project.video}
                poster={project.poster}
                controls
                autoPlay
                playsInline
              />
              <div className="project-summary">
                <p>{project.description}</p>
                <div>
                  <span>
                    {project.role} · {project.year}
                  </span>
                  <span>{project.tools.join(" / ")}</span>
                </div>
              </div>
            </>
          ) : panel === "about" ? (
            <>
              <span className="micro-label">A LITTLE ABOUT ME</span>
              <h2 id="panel-title">
                A curious mind.
                <br />
                <em>A moving canvas.</em>
              </h2>
              <p>
                I’m Vishwas, a video editor and motion designer based in
                Bangalore. I turn ideas into films, moving identities, and
                thoughtful digital experiences.
              </p>
              <p>
                From the rhythm of an edit to the smallest interaction, I’m
                interested in what makes something feel right.
              </p>
              <div className="about-signature">
                Vishwas Kamath <span>↗</span>
              </div>
              <a
                className="text-link"
                href="/resume.pdf"
                target="_blank"
                rel="noreferrer"
              >
                Read my résumé <ArrowDownToLine size={16} />
              </a>
            </>
          ) : panel === "studio" ? (
            <>
              <span className="micro-label">THE WAY I WORK</span>
              <h2 id="panel-title">
                Small details.
                <br />
                <em>Big feelings.</em>
              </h2>
              <p>
                Motion graphics, video editing, and UI/UX design — connected by
                one idea: make every frame matter.
              </p>
              <div className="service-list">
                {[
                  [
                    "01",
                    "Motion graphics",
                    "Kinetic type, product films, visual identities.",
                  ],
                  [
                    "02",
                    "Video editing",
                    "Pacing, colour, sound, and storytelling.",
                  ],
                  [
                    "03",
                    "Digital design",
                    "Clear interfaces with a little personality.",
                  ],
                ].map(([n, title, text]) => (
                  <div key={n}>
                    <span>{n}</span>
                    <div>
                      <h3>{title}</h3>
                      <p>{text}</p>
                    </div>
                    <ArrowUpRight size={20} />
                  </div>
                ))}
              </div>
              <button
                className="text-link"
                onClick={() => {
                  onClose();
                  onSelect(0);
                }}
              >
                Explore the work <ArrowUpRight size={16} />
              </button>
            </>
          ) : panel === "lab" ? (
            <>
              <span className="micro-label">THE EXPERIMENT CORNER</span>
              <h2 id="panel-title">
                A little room
                <br />
                <em>to play.</em>
              </h2>
              <p>
                Click the canvas to make a ripple. Move your cursor to leave a
                little trace. Scroll to find something new.
              </p>
              <button
                className="lab-playground"
                onClick={(event) => {
                  const rect = event.currentTarget.getBoundingClientRect();
                  onBurst(
                    rect.x + rect.width / 2,
                    rect.y + rect.height / 2,
                    150,
                  );
                  event.currentTarget.classList.remove("lab-pulse");
                  void event.currentTarget.offsetWidth;
                  event.currentTarget.classList.add("lab-pulse");
                }}
                aria-label="Play motion experiment"
              >
                <span className="lab-orbit orbit-one" />
                <span className="lab-orbit orbit-two" />
                <span className="lab-core">✳</span>
                <span className="micro-label">CLICK TO PLAY</span>
              </button>
              <div className="lab-tools">
                <SoftwareIcon software="figma" />
                <SoftwareIcon software="jitter" />
                <span>
                  Ideas in motion.
                  <br />
                  Always experimenting.
                </span>
              </div>
            </>
          ) : (
            <>
              <span className="micro-label">HAVE SOMETHING IN MIND?</span>
              <h2 id="panel-title">
                Let’s make
                <br />
                <em>something move.</em>
              </h2>
              <p>
                A project, a collaboration, or just a good conversation. My
                inbox is open.
              </p>
              <a className="email-link" href={`mailto:${profile.email}`}>
                {profile.email}
                <ArrowUpRight size={22} />
              </a>
              <button className="text-link copy-link" onClick={copy}>
                {copied ? <Check size={14} /> : <Copy size={14} />}{" "}
                {copied ? "Email copied" : "Copy email address"}
              </button>
              <div className="contact-location">
                <span className="status-led" /> {profile.location}
                <span>UTC +05:30</span>
              </div>
            </>
          )}
        </div>
      )}
    </dialog>
  );
}
