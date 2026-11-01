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
import StoryStage from "./StoryStage";
import StoryNavigation from "./StoryNavigation";


import { requestTick } from "@/lib/masterTicker";
import { refreshGeometry } from "@/lib/geometryCache";
import GlassHeader from "./GlassHeader";
import ProjectWheels from "./ProjectWheels";
import ProjectMetadata from "./ProjectMetadata";
import CinemaPlayer, {type CinemaSession} from "./CinemaPlayer";
import WavyBackground from "./WavyBackground";
import RibbonCursor from "./RibbonCursor";
import WarpedText from "./WarpedText";
import LoadingScreen from "./LoadingScreen";


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
  const [cinema,setCinema]=useState<CinemaSession|null>(null);
  const cinemaRef=useRef<CinemaSession|null>(null);
  const openCinemaRef=useRef<(i?:number,push?:boolean)=>void>(()=>{});
  const closeCinemaRef=useRef<(historyChange?:boolean)=>void>(()=>{});
  const [expanded, setExpanded] = useState(false);
  const collapse = useCallback(() => setExpanded(false), []);
  // Server HTML stays visible even when scripts or decorative effects fail.
  const [loading, setLoading] = useState(false);
  const loaded = useCallback(() => setLoading(false), []);
  const [reducedMotion, setReducedMotion] = useState(false);
  useEffect(()=>{
    history.replaceState({...history.state,view:'work'},'',location.href);
    document.title='Vishwas Kamath — Motion Portfolio';
    const pop=()=>{const slug=new URLSearchParams(location.search).get('project');const i=projects.findIndex(p=>p.slug===slug);if(i>=0)openCinemaRef.current(i,false);else if(cinemaRef.current)closeCinemaRef.current(false);};
    window.addEventListener('popstate',pop);return()=>window.removeEventListener('popstate',pop);
  },[]);
  const { canvasRef, burst } = useParticles(reducedMotion, themeRef);
  const { index, engine, select, dragRef } = useProjectWheel(
    projects.length,
    loading || expanded || !!cinema,
    reducedMotion,
  );
  const { playing, toggle } = useAmbientAudio();
  const openCinema=(requested=engine.read().index,push=true)=>{
    if(cinemaRef.current||loading)return;
    if(requested!==engine.read().index){engine.select(requested,performance.now());engine.advance(performance.now(),true);}
    const card=document.querySelector<HTMLElement>(`[data-video="${requested}"]`);
    const preview=card?.querySelector('video');
    const box=card?.getBoundingClientRect();
    const rect=box&&box.width>0&&box.height>0?{left:box.left,top:box.top,width:box.width,height:box.height}:{left:innerWidth*.045,top:innerHeight*.25,width:innerWidth*.295,height:innerWidth*.185};
    const next={project:projects[requested],rect,time:preview?.currentTime||0,closing:false};
    preview?.pause();if(preview)preview.muted=true;
    if(playing)toggle();
    setExpanded(false);cinemaRef.current=next;setCinema(next);
    if(push)history.pushState({view:'work',project:next.project.id,cinema:true},'',`/?project=${next.project.slug}`);
  };
  openCinemaRef.current=openCinema;
  const closeCinema=(historyChange=true)=>{
    const current=cinemaRef.current;if(!current||current.closing)return;
    setExpanded(false);
    const returnBox=document.querySelector<HTMLElement>(`[data-video="${projects.indexOf(current.project)}"]`)?.getBoundingClientRect();
    const rect=returnBox?{left:returnBox.left,top:returnBox.top,width:returnBox.width,height:returnBox.height}:current.rect;
    const next={...current,rect,closing:true};cinemaRef.current=next;setCinema(next);
    if(historyChange){if(history.state?.cinema)history.back();else history.replaceState({view:'work'},'','/');}
  };
  closeCinemaRef.current=closeCinema;
  const finishCinema=(time:number)=>{
    setExpanded(false);
    const preview=document.querySelector<HTMLVideoElement>('.video-card.is-active video');
    if(preview){preview.muted=true;if(Number.isFinite(preview.duration))preview.currentTime=Math.min(time,Math.max(0,preview.duration-.1));}
    cinemaRef.current=null;setCinema(null);refreshGeometry();
    const slug=new URLSearchParams(location.search).get('project');
    const nextProject=projects.findIndex(p=>p.slug===slug);
    if(nextProject>=0)requestTick(()=>openCinemaRef.current(nextProject,false));
    requestTick(()=>document.querySelector<HTMLButtonElement>('.title-slot[aria-hidden="false"] .view-project-button')?.focus({preventScroll:true}));
  };


  useEffect(() => { setLoading(true); }, []);

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
      inert={!!cinema}
      data-expanded={expanded}
      data-cinema={cinema ? (cinema.closing ? "closing" : "open") : "closed"}
      data-view="continuous"
      onClick={(event) => { if (expanded && !(event.target as Element).closest("button,a,.video-card,.software-position,.project-metadata,dialog")) collapse(); }}
    >
      <WavyBackground dragRef={dragRef} reducedMotion={reducedMotion} paused={loading || expanded || !!cinema} />
      <canvas ref={canvasRef} className="particle-canvas" aria-hidden="true" />
      <GlassHeader engine={engine} playing={playing} onAudio={toggle} light={isLightMode} onTheme={toggleTheme} onStory={()=>{collapse();window.dispatchEvent(new Event("portfolio:story"));}}/>
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
        onExpand={() => { if (playing) toggle(); setExpanded(true); }}
      />
      <ProjectMetadata
        onView={()=>openCinema()}
        dragRef={dragRef}
        index={index}
        engine={engine}
        reducedMotion={reducedMotion}
        onBurst={burst}
      />
      </div>
      <StoryNavigation engine={engine}/>
      <StoryStage engine={engine}/>
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
      {loading && <LoadingScreen onComplete={loaded} />}
      <RibbonCursor dragRef={dragRef} reducedMotion={reducedMotion} layerKey="continuous" />
    </main>
    {cinema && <CinemaPlayer session={cinema} reducedMotion={reducedMotion} onClose={()=>closeCinema()} onDone={finishCinema}/>}
    </ThemeContext.Provider>
  );
}
