export type Software = "ae" | "pr" | "figma" | "ps" | "jitter" | "davinci" | "ai";
export type Tool = { id: Software; short: string; label: string; color: string };
export const toolCatalog: Record<Software, Tool> = {
  ae: { id: 'ae', short: 'Ae', label: 'After Effects', color: '#D291FF' },
  pr: { id: 'pr', short: 'Pr', label: 'Premiere Pro', color: '#9999FF' },
  ps: { id: 'ps', short: 'Ps', label: 'Photoshop', color: '#31A8FF' },
  figma: { id: 'figma', short: 'Figma', label: 'Figma', color: '#70efcd' },
  jitter: { id: 'jitter', short: 'Jitter', label: 'Jitter', color: '#d3ef8a' },
  davinci: { id: 'davinci', short: 'Da', label: 'DaVinci Resolve', color: '#10B981' },
  ai: { id: 'ai', short: 'Ai', label: 'Illustrator', color: '#FF9A00' },
};
export type Project = {
  id: string;
  slug: string;
  title: string[];
  shortTitle: string;
  role: string;
  year: string;
  software: Software;
  tools: Tool[];
  video: string;
  poster: string;
  color: string;
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
    software: "ai",
    tools: [toolCatalog.ai, toolCatalog.ae],
    video: "/media/pocket.mp4",
    poster: "/media/pocket.jpg",
    color: "#b7adff",
    accentPalette: ['#8B5CF6', '#10B981', '#00B8C9'],
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
    software: "davinci",
    tools: [toolCatalog.davinci],
    video: "/media/nightcity.mp4",
    poster: "/media/nightcity.jpg",
    color: "#d5ef72",
    accentPalette: ['#00F0FF', '#713BFF', '#0A718C'],
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
    software: "pr",
    tools: [toolCatalog.pr, toolCatalog.ae],
    video: "/media/dolce.mp4",
    poster: "/media/dolce.jpg",
    color: "#f6ad89",
    accentPalette: ['#FF3B1D', '#F59E0B', '#A61938'],
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
    software: "pr",
    tools: [toolCatalog.pr, toolCatalog.ae, toolCatalog.ps],
    video: "/media/music.mp4",
    poster: "/media/music.jpg",
    color: "#8ebbd3",
    accentPalette: ['#EC4899', '#FF6B22', '#8048CF'],
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
    software: "ps",
    tools: [toolCatalog.ps, toolCatalog.pr],
    video: "/media/inmoe.mp4",
    poster: "/media/inmoe.jpg",
    color: "#e7a8ca",
    accentPalette: ['#F59E0B', '#E85827', '#7544C8'],
    kind: "MOTION EXPERIMENT",
    description:
      "In Moe — an experiment in visual energy. Shapes, images, and timing come together in a playful study of how motion changes the way a story feels.",
  },
  {
    "id": "artists",
    "slug": "artists",
    "title": [
        "Artists",
        "in Motion"
    ],
    "shortTitle": "Artists in Motion",
    "role": "VIDEO EDITING",
    "year": "2026",
    "software": "pr",
    "video": "/media/artists.mp4",
    "poster": "/media/artists.jpg",
    "color": "#b7adff",
    accentPalette: ['#10B981', '#32A8A0', '#987B24'],
    "kind": "MUSIC EDIT",
    "description": "A rhythm-led artist montage with layered imagery and expressive cuts.",
    tools: [toolCatalog.pr, toolCatalog.ae]
  },
  {
    "id": "iconic",
    "slug": "iconic",
    "title": [
        "Iconic"
    ],
    "shortTitle": "Iconic",
    "role": "VIDEO EDITING",
    "year": "2026",
    "software": "pr",
    "video": "/media/iconic.mp4",
    "poster": "/media/iconic.jpg",
    "color": "#b7adff",
    accentPalette: ['#A855F7', '#3B82F6', '#D95635'],
    "kind": "GAMING EDIT",
    "description": "A cinematic tribute to an iconic weapon in gaming.",
    tools: [toolCatalog.pr, toolCatalog.ae]
  },
  {
    "id": "oscar",
    "slug": "oscar-piastri",
    "title": [
        "Oscar",
        "Piastri"
    ],
    "shortTitle": "Oscar Piastri",
    "role": "VIDEO EDITING",
    "year": "2026",
    "software": "davinci",
    "video": "/media/oscar.mp4",
    "poster": "/media/oscar.jpg",
    "color": "#b7adff",
    accentPalette: ['#FF870F', '#DF4128', '#9760C9'],
    "kind": "MOTORSPORT EDIT",
    "description": "A fast-paced motorsport edit built around Oscar Piastri.",
    tools: [toolCatalog.davinci]
  },
  {
    "id": "induction",
    "slug": "induction",
    "title": [
        "Induction"
    ],
    "shortTitle": "Induction",
    "role": "WEB DESIGN",
    "year": "2026",
    "software": "figma",
    "video": "/media/induction.mp4",
    "poster": "/media/induction.jpg",
    "color": "#b7adff",
    accentPalette: ['#10B981', '#30C7CF', '#6173FF'],
    "kind": "INTERACTIVE WEBSITE",
    "description": "An interactive website redesign for Induction, with animated visual storytelling and data-driven sections.",
    "website": "https://induction-redesign.vercel.app/",
    tools: [toolCatalog.figma]
  },
];

export const profile = {
  name: "Vishwas Kamath",
  initials: "vk",
  email: "vishwaskamath117@gmail.com",
  location: "Bangalore, India",
};
