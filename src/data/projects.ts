export type Software =
  | "ae"
  | "pr"
  | "ps"
  | "ai"
  | "figma"
  | "jitter"
  | "davinci"
  | "blender"
  | "handbrake"
  | "nextjs";
export type Tool = {
  id: Software;
  label: string;
  /** Brand colour: reel tile glow, workflow dock highlight and About background. */
  color: string;
  /** Three short skill tags shown in the About page workflow dock. */
  skills: [string, string, string];
};

// Single source of truth for every tool shown on the site.
export const toolCatalog: Record<Software, Tool> = {
  pr: {
    id: "pr",
    label: "Premiere Pro",
    color: "#9999FF",
    skills: ["NARRATIVE CUTS", "RHYTHM", "AUDIO MIX"],
  },
  ae: {
    id: "ae",
    label: "After Effects",
    color: "#9999FF",
    skills: ["KINETIC TYPOGRAPHY", "2D/3D COMPOSITING", "MOTION SYSTEMS"],
  },
  ps: {
    id: "ps",
    label: "Photoshop",
    color: "#31A8FF",
    skills: ["COMPOSITES", "RETOUCH", "ARTWORK"],
  },
  figma: {
    id: "figma",
    label: "Figma",
    color: "#ff7964",
    skills: ["SYSTEMS", "PROTOTYPES", "INTERACTION"],
  },
  blender: {
    id: "blender",
    label: "Blender",
    color: "#f97316",
    skills: ["3D MODELING", "HARD-SURFACE ASSETS", "LIGHTING & SHADING"],
  },
  davinci: {
    id: "davinci",
    label: "DaVinci Resolve",
    color: "#79d8c1",
    skills: ["COLOUR", "GRADE", "FINISH"],
  },
  handbrake: {
    id: "handbrake",
    label: "HandBrake",
    color: "#c4d780",
    skills: ["ENCODE", "COMPRESS", "DELIVER"],
  },
  ai: {
    id: "ai",
    label: "Illustrator",
    color: "#FF9A00",
    skills: ["VECTORS", "IDENTITY", "ASSETS"],
  },
  nextjs: {
    id: "nextjs",
    label: "Next.js",
    color: "#ededed",
    skills: ["REACT", "INTERACTION", "DEPLOY"],
  },
  jitter: {
    id: "jitter",
    label: "Jitter",
    color: "#d3ef8a",
    skills: ["MOTION DESIGN", "UI ANIMATION", "EXPORT"],
  },
};

/** Tools in the About page workflow dock, in display order. */
export const workflowTools: Software[] = [
  "pr",
  "ae",
  "ps",
  "figma",
  "blender",
  "davinci",
  "handbrake",
  "ai",
];

export type Project = {
  id: string;
  slug: string;
  title: string[];
  shortTitle: string;
  role: string;
  year: string;
  tools: Tool[];
  video: string;
  poster: string;
  accentPalette: [string, string, string];
  description: string;
  kind: string;
  website?: string;
};

// Titles, categories and years are editable portfolio presentation metadata.
// Footage comes from the supplied Videos folder; no client relationship is implied.
export const projects: Project[] = [
  {
    id: "pocket",
    slug: "saas-in-motion",
    title: ["SaaS", "in Motion"],
    shortTitle: "SaaS in Motion",
    role: "MOTION GRAPHICS",
    year: "2026",
    tools: [toolCatalog.ai, toolCatalog.ae],
    video: "/media/pocket.mp4",
    poster: "/media/pocket.jpg",
    accentPalette: ["#8B5CF6", "#10B981", "#00B8C9"],
    kind: "PRODUCT MOTION",
    description:
      "A compact product story told through fluid transitions, crisp typography, and carefully timed movement. A motion study built around an iPhone SaaS experience.",
  },
  {
    id: "nightcity",
    slug: "cyberpunk-2077",
    title: ["Cyberpunk", "2077"],
    shortTitle: "Cyberpunk 2077",
    role: "VIDEO EDITING",
    year: "2026",
    tools: [toolCatalog.davinci],
    video: "/media/nightcity.mp4",
    poster: "/media/nightcity.jpg",
    accentPalette: ["#00F0FF", "#713BFF", "#0A718C"],
    kind: "CINEMATIC EDIT",
    description:
      "An atmospheric journey through the world of Cyberpunk 2077. Rhythm, contrast, and cinematic pacing turn game footage into a visual mood piece.",
  },
  {
    id: "dolce",
    slug: "spartan-protocol",
    title: ["Spartan", "Protocol"],
    shortTitle: "Spartan Protocol",
    role: "VIDEO EDITING",
    year: "2026",
    tools: [toolCatalog.pr, toolCatalog.ae],
    video: "/media/dolce.mp4",
    poster: "/media/dolce.jpg",
    accentPalette: ["#FF3B1D", "#F59E0B", "#A61938"],
    kind: "GAMING MONTAGE",
    description:
      "A high-energy gaming montage from the Dolce&Gabbana source edit. Layered compositions, colour, and tightly timed cuts turn gameplay imagery into a rhythmic visual sequence.",
  },
  {
    id: "music",
    slug: "art-that-is-music",
    title: ["Art that", "is Music"],
    shortTitle: "Art that is Music",
    role: "VIDEO EDITING",
    year: "2026",
    tools: [toolCatalog.ae, toolCatalog.pr, toolCatalog.ps],
    video: "/media/music.mp4",
    poster: "/media/music.jpg",
    accentPalette: ["#EC4899", "#FF6B22", "#8048CF"],
    kind: "MUSIC & CULTURE",
    description:
      "The Art That Is Music — a visual appreciation of sound and the people behind it. An exploration of pace, emotion, and the moments between the beats.",
  },
  {
    id: "inmoe",
    slug: "urban-rhythm",
    title: ["Urban", "Rhythm"],
    shortTitle: "Urban Rhythm",
    role: "VIDEO EDITING",
    year: "2026",
    tools: [toolCatalog.ps, toolCatalog.pr],
    video: "/media/inmoe.mp4",
    poster: "/media/inmoe.jpg",
    accentPalette: ["#F59E0B", "#E85827", "#7544C8"],
    kind: "MOTION EXPERIMENT",
    description:
      "In Moe — an experiment in visual energy. Shapes, images, and timing come together in a playful study of how motion changes the way a story feels.",
  },
  {
    id: "artists",
    slug: "artists",
    title: ["Artists", "in Motion"],
    shortTitle: "Artists in Motion",
    role: "VIDEO EDITING",
    year: "2025",
    video: "/media/artists.mp4",
    poster: "/media/artists.jpg",
    accentPalette: ["#10B981", "#32A8A0", "#987B24"],
    kind: "MUSIC EDIT",
    description:
      "A rhythm-led artist montage with layered imagery and expressive cuts.",
    tools: [toolCatalog.pr, toolCatalog.ae],
  },
  {
    id: "iconic",
    slug: "iconic",
    title: ["Iconic"],
    shortTitle: "Iconic",
    role: "VIDEO EDITING",
    year: "2026",
    video: "/media/iconic.mp4",
    poster: "/media/iconic.jpg",
    accentPalette: ["#A855F7", "#3B82F6", "#D95635"],
    kind: "GAMING EDIT",
    description: "A cinematic tribute to an iconic weapon in gaming.",
    tools: [toolCatalog.ps, toolCatalog.pr],
  },
  {
    id: "oscar",
    slug: "oscar-piastri",
    title: ["Oscar", "Piastri"],
    shortTitle: "Oscar Piastri",
    role: "VIDEO EDITING",
    year: "2025",
    video: "/media/oscar.mp4",
    poster: "/media/oscar.jpg",
    accentPalette: ["#FF870F", "#DF4128", "#9760C9"],
    kind: "MOTORSPORT EDIT",
    description: "A fast-paced motorsport edit built around Oscar Piastri.",
    tools: [toolCatalog.davinci],
  },
  {
    id: "induction",
    slug: "induction",
    title: ["Induction"],
    shortTitle: "Induction",
    role: "WEB DESIGN",
    year: "2026",
    video: "/media/induction.mp4",
    poster: "/media/induction.jpg",
    accentPalette: ["#10B981", "#30C7CF", "#6173FF"],
    kind: "INTERACTIVE WEBSITE",
    description:
      "An interactive website redesign for Induction, with animated visual storytelling and data-driven sections.",
    website: "https://induction-redesign.vercel.app/",
    tools: [toolCatalog.figma, toolCatalog.nextjs],
  },
];

export const profile = {
  name: "Vishwas Kamath",
  initials: "vk",
  email: "vishwaskamath117@gmail.com",
  location: "Bangalore, India",
};
