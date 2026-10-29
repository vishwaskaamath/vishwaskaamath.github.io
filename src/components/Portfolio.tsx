"use client";
import { useCallback, useEffect, useState, useRef } from "react";
import {
  Sun, Moon,
  Pause,
  Play,
  Volume2,
  VolumeX,
} from "lucide-react";
import { ThemeContext, THEME_EVENT, type Theme } from "@/lib/theme";
import { projects } from "@/data/projects";
import { useParticles } from "@/hooks/useParticles";
import { useProjectWheel } from "@/hooks/useProjectWheel";
import { useAmbientAudio } from "@/hooks/useAmbientAudio";
import AboutView from "./AboutView";
import ProjectWheels from "./ProjectWheels";
import ProjectMetadata from "./ProjectMetadata";
import WavyBackground from "./WavyBackground";
import RibbonCursor from "./RibbonCursor";
import WarpedText from "./WarpedText";
import LoadingScreen from "./LoadingScreen";
import Overlay, { type Panel } from "./Overlay";

export default function Portfolio() {
  const [isLightMode, setIsLightMode] = useState(false);
  const themeRef = useRef<Theme>('dark');
  const toggleTheme = () => {
    const next = themeRef.current !== 'light';
    themeRef.current = next ? 'light' : 'dark';
    document.documentElement.dataset.theme = themeRef.current;
    setIsLightMode(next);
    window.dispatchEvent(new Event(THEME_EVENT));
  };
  const [expanded, setExpanded] = useState(false);
  const collapse = useCallback(() => setExpanded(false), []);
  // Server HTML stays visible even when scripts or decorative effects fail.
  const [loading, setLoading] = useState(false);
  const loaded = useCallback(() => setLoading(false), []);
  const [panel, setPanel] = useState<Panel>(null);
  const [reducedMotion, setReducedMotion] = useState(false);
  const { canvasRef, burst } = useParticles(reducedMotion, themeRef);
  const { index, engine, select, dragRef } = useProjectWheel(
    projects.length,
    !!panel || loading || expanded,
    reducedMotion,
  );
  const { playing, toggle } = useAmbientAudio();
  const close = useCallback(() => setPanel(null), []);

  useEffect(() => {
    if (matchMedia('(max-width: 759px), (pointer: coarse), (prefers-reduced-motion: reduce)').matches) return;
    setLoading(true);
    const fallback = window.setTimeout(() => setLoading(false), 4500);
    return () => window.clearTimeout(fallback);
  }, []);

  useEffect(() => {
    const query = matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => {
      setReducedMotion(query.matches);
    };
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  useEffect(() => {
    if (!expanded) return;
    const key = (event: KeyboardEvent) => { if (event.key === "Escape") collapse(); };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [expanded, collapse]);


  return (
    <ThemeContext.Provider value={themeRef}>
    <main
      className="portfolio relative h-dvh w-screen overflow-hidden bg-[#070707] text-[#eeeee7]"
      aria-label="Vishwas Kamath creative portfolio"
      data-expanded={expanded}
      data-view={panel === "about" ? "about" : "work"}
      onClick={(event) => { if (expanded && !(event.target as Element).closest("button,a,.video-card,.software-position,.project-metadata,dialog")) collapse(); }}
    >
      <WavyBackground dragRef={dragRef} reducedMotion={reducedMotion} paused={loading || expanded} />
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
                onClick={() => {
                  if (label === "About") setExpanded(false);
                  setPanel(label === "Work" ? null : label.toLowerCase() as Panel);
                }}
                aria-current={(label === "Work" && !panel) || panel === label.toLowerCase() ? "page" : undefined}
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
          <span className="nav-divider" />
          <button className="theme-toggle" onClick={toggleTheme}
            aria-label={isLightMode ? 'Switch to dark mode' : 'Switch to white mode'}
            aria-pressed={isLightMode} title={isLightMode ? 'Dark mode' : 'White mode'}>
            {isLightMode ? <Moon size={16} /> : <Sun size={16} />}
          </button>
        </nav>
      </header>
      <div className="work-scene" inert={panel === "about"} aria-hidden={panel === "about"}>
      <ProjectWheels
        dragRef={dragRef}
        index={index}
        engine={engine}
        reducedMotion={reducedMotion}
        select={select}
        paused={(!expanded && reducedMotion) || !!panel || loading}
        expanded={expanded}
        onCollapse={collapse}
        onExpand={() => { if (playing) toggle(); setExpanded(true); }}
      />
      <ProjectMetadata
        index={index}
        engine={engine}
        reducedMotion={reducedMotion}
        onBurst={burst}
      />
      </div>
      <AboutView active={panel === "about"} reducedMotion={reducedMotion} onBurst={burst} />
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
            <b className="track-name"><WarpedText>Unrequited</WarpedText></b>
            <span><WarpedText>{`ORIGINAL AMBIENT · ${playing ? "PLAYING" : "SOUND OFF"}`}</WarpedText></span>
          </span>
          <span className="equalizer" aria-hidden="true">
            
            {[0, 1, 2, 3, 4].map((i) => (
              <i key={i} style={{ animationDelay: `${i * 0.18}s` }} />
            ))}
          </span>
          <span className="player-control">
            {playing ? <Pause size={12} /> : <Play size={12} />}
          </span>
        </button>
      </footer>
      <Overlay
        panel={panel === "about" ? null : panel}
        project={projects[engine.read().index]}
        onClose={close}
        onSelect={(i) => select(i, true)}
        onBurst={burst}
      />
      {loading && <LoadingScreen onComplete={loaded} />}
      <RibbonCursor dragRef={dragRef} reducedMotion={reducedMotion} layerKey={panel} />
    </main>
    </ThemeContext.Provider>
  );
}
