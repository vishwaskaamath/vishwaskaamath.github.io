"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowUpRight,
  Pause,
  Play,
  Volume2,
  VolumeX,
} from "lucide-react";
import { projects } from "@/data/projects";
import { useParticles } from "@/hooks/useParticles";
import { useProjectWheel } from "@/hooks/useProjectWheel";
import { useAmbientAudio } from "@/hooks/useAmbientAudio";
import ProjectWheels from "./ProjectWheels";
import ProjectMetadata from "./ProjectMetadata";
import WavyBackground from "./WavyBackground";
import RibbonCursor from "./RibbonCursor";
import WarpedText from "./WarpedText";
import LoadingScreen from "./LoadingScreen";
import FullscreenVideo, { type FullscreenSource } from "./FullscreenVideo";
import Overlay, { type Panel } from "./Overlay";

export default function Portfolio() {
  const pagination = useRef<HTMLDivElement>(null);
  const [fullscreen, setFullscreen] = useState<FullscreenSource | null>(null);
  const closeFullscreen = useCallback(() => setFullscreen(null), []);
  const [loading, setLoading] = useState(true);
  const loaded = useCallback(() => setLoading(false), []);
  const [panel, setPanel] = useState<Panel>(null);
  const [reducedMotion, setReducedMotion] = useState(false);
  const { canvasRef, burst } = useParticles(reducedMotion);
  const { index, engine, select } = useProjectWheel(
    projects.length,
    !!panel || loading || !!fullscreen,
    reducedMotion,
  );
  const { playing, toggle } = useAmbientAudio();
  const close = useCallback(() => setPanel(null), []);

  useEffect(() => {
    const query = matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => {
      setReducedMotion(query.matches);
    };
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  useEffect(() => engine.subscribe(({ index: active }) => {
    pagination.current?.querySelectorAll('button').forEach((button, i) => {
      if (i === active) button.setAttribute('aria-current', 'true'); else button.removeAttribute('aria-current');
    });
  }), [engine]);

  return (
    <main
      className="portfolio relative h-dvh w-screen overflow-hidden bg-[#070707] text-[#eeeee7]"
      aria-label="Vishwas Kamath creative portfolio"
    >
      <WavyBackground reducedMotion={reducedMotion} paused={loading || !!fullscreen} />
      <div className="structural-grid" aria-hidden="true" />
      <canvas ref={canvasRef} className="particle-canvas" aria-hidden="true" />
      <header className="hud-header">
        <button
          className="identity"
          onClick={() => {
            setPanel(null);
            select(0, true);
          }}
          aria-label="Vishwas Kamath, home"
        >
          <span className="monogram">
            v<span>k</span>
            <i />
          </span>
          <span className="identity-copy">
            <b className="identity-name"><WarpedText>VISHWAS KAMATH</WarpedText></b><span><WarpedText>INDEPENDENT CREATIVE</WarpedText></span>
          </span>
        </button>
        <nav className="main-nav" aria-label="Main navigation">
          {(["About", "Lab", "Work", "Studio", "Contact"] as const).map(
            (label) => (
              <button
                key={label}
                className={
                  (label === "Work" && !panel) || panel === label.toLowerCase()
                    ? "nav-active"
                    : ""
                }
                onClick={() =>
                  label === "Work"
                    ? setPanel(null)
                    : setPanel(label.toLowerCase() as Panel)
                }
              >
                <WarpedText>{label}</WarpedText>
              </button>
            ),
          )}
          <span className="nav-divider" />
          <button
            className="audio-toggle"
            onClick={toggle}
            aria-label={playing ? "Mute ambient audio" : "Enable ambient audio"}
            aria-pressed={playing}
          >
            {playing ? <Volume2 size={16} /> : <VolumeX size={16} />}
          </button>
        </nav>
        <button className="header-contact" onClick={() => setPanel("contact")}>
          <span className="status-led" /> <WarpedText>LET’S TALK</WarpedText> <ArrowUpRight size={14} />
        </button>
      </header>
      <ProjectWheels
        index={index}
        engine={engine}
        reducedMotion={reducedMotion}
        select={select}
        paused={reducedMotion || !!panel || loading || !!fullscreen}
        onExpand={(source) => { if (playing) toggle(); setFullscreen(source); }}
      />
      <ProjectMetadata
        index={index}
        engine={engine}
        reducedMotion={reducedMotion}
        onBurst={burst}
      />
      <div className="bottom-center">
        <div ref={pagination} className="pagination" aria-label="Choose a project">
          {projects.map((p, i) => (
            <button
              key={p.id}
              onClick={() => select(i)}
              aria-label={`Show project ${i + 1}: ${p.shortTitle}`}
              aria-current={index === i ? "true" : undefined}
            >
              <span />
            </button>
          ))}
        </div>
      </div>
      <footer className="hud-footer">
        <button
          className={`audio-player ${playing ? "is-playing" : ""}`}
          onClick={toggle}
          aria-label={playing ? "Pause ambient track" : "Play ambient track"}
        >
          <span className="record">
            <span />
          </span>
          <span className="audio-track">
            <b className="track-name"><WarpedText>A softer frequency</WarpedText></b>
            <span><WarpedText>{`ORIGINAL AMBIENT · ${playing ? "PLAYING" : "SOUND OFF"}`}</WarpedText></span>
          </span>
          <span className="equalizer" aria-hidden="true">
            {[0, 1, 2, 3, 4].map((i) => (
              <i key={i} style={{ animationDelay: `${i * -0.18}s` }} />
            ))}
          </span>
          <span className="player-control">
            {playing ? <Pause size={12} /> : <Play size={12} />}
          </span>
        </button>
      </footer>
      <Overlay
        panel={panel}
        project={projects[engine.read().index]}
        onClose={close}
        onSelect={(i) => select(i, true)}
        onBurst={burst}
      />
      {fullscreen && <FullscreenVideo source={fullscreen} onClose={closeFullscreen} reducedMotion={reducedMotion} />}
      {loading && <LoadingScreen onComplete={loaded} />}
      <RibbonCursor reducedMotion={reducedMotion} layerKey={fullscreen ? "fullscreen" : panel} />
    </main>
  );
}
