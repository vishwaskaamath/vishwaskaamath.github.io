/**
 * Résumé content. The /resume page (ResumePage.tsx) and the printable PDF
 * (scripts/build-resume-pdf.mjs → public/resume.pdf) both read this file, so
 * edit it here and rebuild the PDF to keep them in sync.
 *
 * Scope: video editing, motion design, UI/UX design, art direction and the
 * business background. No software-engineering work.
 */

/** "Now" on the timeline (decimal year): November 2026. */
export const NOW = 2026 + 10 / 12;

export type Clip = {
  id: string;
  /** NLE-style track: video tracks above, audio-style tracks below. */
  track: "V3" | "V2" | "V1" | "A1" | "A2";
  trackLabel: string;
  /** Decimal years on the timeline. */
  start: number;
  end: number;
  /** Shown as written (the dates people read). */
  dates: string;
  place: string;
  title: string;
  org: string;
  bullets: string[];
  tone: "orange" | "cream" | "obsidian" | "ink" | "outline";
  /** A link back into the portfolio's Work wheel. */
  action?: string;
  tag?: string;
  /** Education clip extras. */
  score?: string;
};

export const resume = {
  name: "VISHWAS KAMATH",
  first: "VISHWAS",
  last: "KAMATH",
  role: "Video editor, motion designer & UI/UX designer",
  summary:
    "I'm a video editor, motion designer and UI/UX designer based in Bengaluru. I cut commercials, brand reels and short-form content, build 2D and 3D motion from scratch, and design interfaces in Figma. I like being part of a project early, from the first moodboard and storyboard through the edit in Premiere Pro, the compositing in After Effects and Blender, and the final layouts.",
  slate: [
    ["ROLL", "VIDEO EDITING"],
    ["SCENE", "MOTION DESIGN"],
    ["TAKE", "UI / UX & ART DIRECTION"],
  ],
  location: "Bengaluru, India",
  availability: "Open to freelance, agency & studio roles (remote or on-site)",
  email: "vishwaskamath117@gmail.com",
  links: {
    linkedin: "https://www.linkedin.com/in/vishwas-kamath-717016369/",
    instagram: "https://www.instagram.com/sydorm_/",
  },
  pdf: "/resume.pdf",
  /** "Running time" counters. */
  stats: [
    {
      value: 5,
      suffix: "+",
      unit: "YRS",
      label: "Editing, motion & visual craft since 2021",
    },
    {
      value: 3,
      suffix: "",
      unit: "CRAFTS",
      label: "Post-production, motion & UI/UX design",
    },
    {
      value: 8,
      suffix: "",
      unit: "TOOLS",
      label: "One pipeline across 2D, 3D & interface",
    },
    { value: 8.45, suffix: "", unit: "SGPA", label: "BBA at PES University" },
  ],
  clips: [
    {
      id: "art",
      track: "V3",
      trackLabel: "ART DIRECTION",
      start: 2023,
      end: 2026 + 9 / 12,
      dates: "2023 to 2026",
      place: "Studio & academic projects",
      title: "Art Direction, Brand Identity & Commercial Concepting",
      org: "Visual systems, storyboarding & marketing strategy",
      bullets: [
        "Shape the visual direction for campaigns, product concepts and YouTube and social channels: moodboards, type systems and key art.",
        "Use what I've learned in business studies to find a clear selling point and a strong hook before the creative work starts.",
      ],
      tone: "obsidian",
    },
    {
      id: "uiux",
      track: "V2",
      trackLabel: "UI / UX",
      start: 2024,
      end: NOW,
      dates: "2024 to present",
      place: "Freelance & collaborations",
      title: "UI/UX & Interactive Visual Designer",
      org: "Digital products, portfolios & campaign interfaces",
      bullets: [
        "Design web interfaces, clickable prototypes and component systems in Figma, paying close attention to grids, type and hierarchy.",
        "Bring motion thinking into UX: easing, hover details and scroll-led storytelling that make an interface feel good to use.",
        "Work alongside brand and performance-marketing briefs so the visual identity, landing pages and video assets tell one consistent story.",
      ],
      tone: "cream",
      action: "See the interactive work",
    },
    {
      id: "edit",
      track: "V1",
      trackLabel: "EDIT & MOTION",
      start: 2021,
      end: NOW,
      dates: "2021 to present",
      place: "Remote & Bengaluru",
      title: "Freelance Video Editor & Motion Graphics Designer",
      org: "Independent post-production & motion work",
      bullets: [
        "Edit short-form content, commercial cuts and brand showreels, timing every cut to the music so the story keeps moving.",
        "Build 2D and 3D motion graphics, kinetic type and transitions from scratch in After Effects and Blender, without leaning on templates.",
        "Handle the whole post process: multi-cam assembly, sound design and SFX, colour grading in DaVinci Resolve, and exports ready for each platform.",
      ],
      tone: "orange",
      action: "Watch the reels",
    },
    {
      id: "bba",
      track: "A1",
      trackLabel: "STUDY",
      start: 2025 + 7 / 12,
      end: NOW,
      dates: "2025 to present",
      place: "Bengaluru, India",
      title: "Bachelor of Business Administration (BBA)",
      org: "PES University",
      bullets: [
        "Focus on business strategy, performance marketing and operations.",
        "It's why I like to understand the audience and the goal before I open a timeline.",
      ],
      tone: "ink",
      score: "SGPA 8.45",
    },
    {
      id: "vara",
      track: "A2",
      trackLabel: "COMMUNITY",
      start: 2026 + 5 / 12,
      end: 2026 + 6 / 12,
      dates: "June 2026",
      place: "Bengaluru, India",
      title: "Community Engagement & Educational Media Intern",
      org: "VARA Foundation (university social service internship)",
      bullets: [
        "Ran community engagement activities, hands-on learning workshops and recreational sessions for children across Bengaluru.",
        "Planned activity schedules, made visual learning materials and kept the project documentation for the certified internship.",
      ],
      tone: "outline",
      tag: "Certified · VARA Foundation",
    },
  ] satisfies Clip[] as Clip[],
  /** Skills as project bins. Software ids match SoftwareEmblem. */
  bins: [
    {
      title: "VIDEO EDITING",
      items: [
        "Commercial & brand cuts",
        "Short-form content",
        "Showreels",
        "Rhythm & pacing",
        "Audio stem & SFX sync",
        "Colour grading",
        "Narrative assembly",
      ],
    },
    {
      title: "MOTION DESIGN",
      items: [
        "2D / 3D motion graphics",
        "Kinetic typography",
        "Custom bezier easing",
        "Compositing & VFX",
        "3D modelling & lighting",
        "Logo & title animation",
      ],
    },
    {
      title: "UI / UX & ART DIRECTION",
      items: [
        "UI / UX layout design",
        "Interactive prototyping",
        "Design systems",
        "Wireframes & user flows",
        "Visual identity",
        "Moodboards & storyboards",
      ],
    },
  ],
  software: [
    ["pr", "Premiere Pro"],
    ["ae", "After Effects"],
    ["figma", "Figma"],
    ["blender", "Blender"],
    ["ps", "Photoshop"],
    ["davinci", "DaVinci Resolve"],
    ["ai", "Illustrator"],
    ["handbrake", "HandBrake"],
  ] as [string, string][],
  /** End credits: one item per line, like a film's credit roll. */
  credits: [
    ["EDUCATION", ["PES University", "BBA, 2025 to present"]],
    ["FOCUS", ["Business strategy", "Performance marketing", "Operations"]],
    ["SGPA", ["8.45"]],
    [
      "LANGUAGES",
      ["English (fluent)", "Hindi (proficient)"],
    ],
    ["BASED IN", ["Bengaluru, India", "Open to remote & on-site"]],
    ["AVAILABLE FOR", ["Freelance, agency & studio roles"]],
  ] as [string, string[]][],
};

export type Resume = typeof resume;
