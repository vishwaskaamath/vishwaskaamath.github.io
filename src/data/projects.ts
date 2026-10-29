export type Software = "ae" | "pr" | "figma" | "ps" | "jitter";
export type Tool = { id: Software; short: string; label: string; color: string };
export const toolCatalog: Record<Software, Tool> = {
  ae: { id: 'ae', short: 'Ae', label: 'After Effects', color: '#d896ff' },
  pr: { id: 'pr', short: 'Pr', label: 'Premiere Pro', color: '#a389ff' },
  ps: { id: 'ps', short: 'Ps', label: 'Photoshop', color: '#53c6ff' },
  figma: { id: 'figma', short: 'Figma', label: 'Figma', color: '#70efcd' },
  jitter: { id: 'jitter', short: 'Jitter', label: 'Jitter', color: '#d3ef8a' },
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
  description: string;
  kind: string;
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
    software: "ae",
    tools: [toolCatalog.ae, toolCatalog.figma],
    video: "/media/pocket.mp4",
    poster: "/media/pocket.jpg",
    color: "#b7adff",
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
    software: "pr",
    tools: [toolCatalog.pr, toolCatalog.ae],
    video: "/media/nightcity.mp4",
    poster: "/media/nightcity.jpg",
    color: "#d5ef72",
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
    kind: "MOTION EXPERIMENT",
    description:
      "In Moe — an experiment in visual energy. Shapes, images, and timing come together in a playful study of how motion changes the way a story feels.",
  },
];

export const profile = {
  name: "Vishwas Kamath",
  initials: "vk",
  email: "vishwaskamath117@gmail.com",
  location: "Bangalore, India",
};
