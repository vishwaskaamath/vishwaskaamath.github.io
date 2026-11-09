"use client";
import { useCallback, useEffect, useState, useRef } from "react";
import { Sun, Moon, Pause, Play, Volume2, VolumeX } from "lucide-react";
import { projects } from "@/data/projects";
import { useParticles } from "@/hooks/useParticles";
import { useProjectWheel } from "@/hooks/useProjectWheel";
import StoryStage from "./StoryStage";
import StoryNavigation from "./StoryNavigation";

import { requestTick } from "@/lib/masterTicker";
import { refreshGeometry } from "@/lib/geometryCache";
import GlassHeader from "./GlassHeader";
import ProjectWheels from "./ProjectWheels";
import ProjectMetadata from "./ProjectMetadata";
import CinemaPlayer, { type CinemaSession } from "./CinemaPlayer";
import WavyBackground from "./WavyBackground";
import RibbonCursor from "./RibbonCursor";
import WarpedText from "./WarpedText";
import LoadingScreen from "./LoadingScreen";
import KineticPill from "./KineticPill";
import { useRouter } from "next/navigation";
import { useShell } from "./SiteShell";
import { assetsReady } from "@/lib/assetPreloader";
import { pageReturn, RESUME_EVENT } from "@/lib/pageReturn";
import { ArrowUpRight } from "lucide-react";

export default function Portfolio() {
  const router = useRouter();
  const [cinema, setCinema] = useState<CinemaSession | null>(null);
  const cinemaRef = useRef<CinemaSession | null>(null);
  const openCinemaRef = useRef<(i?: number, push?: boolean) => void>(() => {});
  const closeCinemaRef = useRef<(historyChange?: boolean) => void>(() => {});
  const [expanded, setExpanded] = useState(false);
  const collapse = useCallback(() => setExpanded(false), []);
  // Server HTML stays visible even when scripts or decorative effects fail.
  const [loading, setLoading] = useState(false);
  const loaded = useCallback(() => setLoading(false), []);
  const [reducedMotion, setReducedMotion] = useState(false);
  useEffect(() => {
    history.replaceState({ ...history.state, view: "work" }, "", location.href);
    document.title = "Vishwas Kamath — Motion Portfolio";
    const pop = () => {
      const slug = new URLSearchParams(location.search).get("project");
      const i = projects.findIndex((p) => p.slug === slug);
      if (i >= 0) openCinemaRef.current(i, false);
      else if (cinemaRef.current) closeCinemaRef.current(false);
    };
    window.addEventListener("popstate", pop);
    return () => window.removeEventListener("popstate", pop);
  }, []);
  const { canvasRef, burst } = useParticles(reducedMotion);
  const { index, engine, select, dragRef } = useProjectWheel(
    projects.length,
    loading || expanded || !!cinema,
    reducedMotion,
  );
  // The record player lives in the site shell (it keeps playing across
  // pages). Project video audio takes priority: it pauses while a film plays.
  const { player, setSuspended, goTo } = useShell();
  useEffect(() => {
    setSuspended(expanded || !!cinema);
  }, [expanded, cinema, setSuspended]);
  useEffect(() => () => setSuspended(false), [setSuspended]);

  // Résumé page: remember where the visitor is, then swap pages behind the
  // OPENING card. Coming back restores the same view (see below).
  const openResume = useCallback(() => {
    const f = engine.read();
    pageReturn.pending = true;
    pageReturn.view = engine.view;
    pageReturn.index = f.index;
    pageReturn.scroll = f.virtualScrollY;
    goTo("/resume/", "RÉSUMÉ");
  }, [engine, goTo]);
  useEffect(() => {
    window.addEventListener(RESUME_EVENT, openResume);
    return () => window.removeEventListener(RESUME_EVENT, openResume);
  }, [openResume]);
  const openCinema = (requested = engine.read().index, push = true) => {
    if (cinemaRef.current || loading) return;
    if (requested !== engine.read().index) {
      engine.select(requested, performance.now());
      engine.advance(performance.now(), true);
    }
    const card = document.querySelector<HTMLElement>(
      `[data-video="${requested}"]`,
    );
    const preview = card?.querySelector("video");
    const box = card?.getBoundingClientRect();
    const rect =
      box && box.width > 0 && box.height > 0
        ? { left: box.left, top: box.top, width: box.width, height: box.height }
        : {
            left: innerWidth * 0.045,
            top: innerHeight * 0.25,
            width: innerWidth * 0.295,
            height: innerWidth * 0.185,
          };
    const next = {
      project: projects[requested],
      rect,
      time: preview?.currentTime || 0,
      closing: false,
    };
    preview?.pause();
    if (preview) preview.muted = true;
    setExpanded(false);
    cinemaRef.current = next;
    setCinema(next);
    if (push)
      history.pushState(
        { view: "work", project: next.project.id, cinema: true },
        "",
        `/?project=${next.project.slug}`,
      );
  };
  openCinemaRef.current = openCinema;
  const closeCinema = (historyChange = true) => {
    const current = cinemaRef.current;
    if (!current || current.closing) return;
    setExpanded(false);
    const returnBox = document
      .querySelector<HTMLElement>(
        `[data-video="${projects.indexOf(current.project)}"]`,
      )
      ?.getBoundingClientRect();
    const rect = returnBox
      ? {
          left: returnBox.left,
          top: returnBox.top,
          width: returnBox.width,
          height: returnBox.height,
        }
      : current.rect;
    const next = { ...current, rect, closing: true };
    cinemaRef.current = next;
    setCinema(next);
    if (historyChange) {
      if (history.state?.cinema) history.back();
      else history.replaceState({ view: "work" }, "", "/");
    }
  };
  closeCinemaRef.current = closeCinema;
  const finishCinema = (time: number) => {
    setExpanded(false);
    const preview = document.querySelector<HTMLVideoElement>(
      ".video-card.is-active video",
    );
    if (preview) {
      preview.muted = true;
      if (Number.isFinite(preview.duration))
        preview.currentTime = Math.min(
          time,
          Math.max(0, preview.duration - 0.1),
        );
    }
    cinemaRef.current = null;
    setCinema(null);
    refreshGeometry();
    const slug = new URLSearchParams(location.search).get("project");
    const nextProject = projects.findIndex((p) => p.slug === slug);
    if (nextProject >= 0)
      requestTick(() => openCinemaRef.current(nextProject, false));
    requestTick(() =>
      document
        .querySelector<HTMLButtonElement>(
          '.title-slot[aria-hidden="false"] .view-project-button',
        )
        ?.focus({ preventScroll: true }),
    );
  };

  // The intro loader runs once per visit; coming back from the résumé page
  // (assets already loaded) skips it.
  useEffect(() => {
    if (!assetsReady()) setLoading(true);
  }, []);

  // Back from the résumé: land on the same Work project or About position.
  useEffect(() => {
    if (!pageReturn.pending) return;
    pageReturn.pending = false;
    const { view, index: at, scroll } = pageReturn;
    if (view === "work") {
      engine.select(at, performance.now());
      engine.advance(performance.now(), true);
      return;
    }
    engine.setView("about");
    document.title = "Vishwas Kamath — About";
    // Let the story measure itself, then jump straight to the old position.
    let frames = 0;
    const settle = () => {
      if (++frames < 3) return requestTick(settle);
      window.dispatchEvent(new Event("resize"));
      requestTick(() => {
        engine.scrollTo(scroll);
        engine.advance(performance.now(), true);
        // After Next applies the route's own title.
        document.title = "Vishwas Kamath — About";
      });
    };
    requestTick(settle);
  }, [engine]);
  useEffect(() => {
    router.prefetch("/resume/");
  }, [router]);

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
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") collapse();
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [expanded, collapse]);

  return (
    <>
      <main
        className="portfolio relative h-dvh w-screen overflow-hidden bg-[#070707] text-[#eeeee7]"
        aria-label="Vishwas Kamath creative portfolio"
        inert={!!cinema}
        data-expanded={expanded}
        data-cinema={cinema ? (cinema.closing ? "closing" : "open") : "closed"}
        data-view="continuous"
        onClick={(event) => {
          if (
            expanded &&
            !(event.target as Element).closest(
              "button,a,.video-card,.software-position,.project-metadata,dialog",
            )
          )
            collapse();
        }}
      >
        <WavyBackground
          engine={engine}
          dragRef={dragRef}
          reducedMotion={reducedMotion}
          paused={loading || expanded || !!cinema}
        />
        <canvas
          ref={canvasRef}
          className="particle-canvas"
          aria-hidden="true"
        />
        <GlassHeader player={player} reducedMotion={reducedMotion} />
        <div className="work-scene" data-active="true">
          <ProjectWheels
            dragRef={dragRef}
            index={index}
            engine={engine}
            reducedMotion={reducedMotion}
            select={select}
            paused={(!expanded && reducedMotion) || loading || !!cinema}
            expanded={expanded}
            onCollapse={collapse}
            onExpand={() => setExpanded(true)}
          />
          <ProjectMetadata
            onView={() => openCinema()}
            dragRef={dragRef}
            index={index}
            engine={engine}
            reducedMotion={reducedMotion}
            onBurst={burst}
          />
          <div
            className="tool-caption toolkit-viewport work-toolkit-static"
            aria-hidden={engine.view !== "work"}
          >
            {projects.map((project, i) => (
              <div
                key={project.id}
                className="tool-caption-slot"
                data-tool-caption={i}
                aria-hidden={i !== index}
              >
                <span className="micro-label">
                  <WarpedText>THE TOOLKIT</WarpedText>
                </span>
                <span>
                  <WarpedText>
                    {project.tools.map((tool) => tool.label).join(" + ")}
                  </WarpedText>
                </span>
              </div>
            ))}
          </div>
        </div>
        <StoryNavigation engine={engine} />
        <StoryStage engine={engine} />
        <div className="resume-trigger">
          <KineticPill
            label="RÉSUMÉ"
            icon={<ArrowUpRight size={15} strokeWidth={2.4} />}
            ariaLabel="Open résumé"
            onClick={openResume}
          />
        </div>
        {loading && <LoadingScreen onComplete={loaded} />}
        <RibbonCursor
          dragRef={dragRef}
          reducedMotion={reducedMotion}
          layerKey="continuous"
        />
      </main>
      {cinema && (
        <CinemaPlayer
          session={cinema}
          reducedMotion={reducedMotion}
          onClose={() => closeCinema()}
          onDone={finishCinema}
        />
      )}
    </>
  );
}
