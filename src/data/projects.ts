export type Software = "ae" | "pr" | "figma" | "ps" | "jitter";
export type Project = {
  id: string;
  title: string[];
  shortTitle: string;
  role: string;
  year: string;
  software: Software;
  tools: string[];
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
    title: ["Pocket", "possibilities."],
    shortTitle: "Pocket possibilities",
    role: "MOTION GRAPHICS",
    year: "2026",
    software: "ae",
    tools: ["After Effects", "Premiere Pro"],
    video: "/media/pocket.mp4",
    poster: "/media/pocket.jpg",
    color: "#b7adff",
    kind: "PRODUCT MOTION",
    description:
      "A compact product story told through fluid transitions, crisp typography, and carefully timed movement. A motion study built around an iPhone SaaS experience.",
  },
  {
    id: "nightcity",
    title: ["After", "the neon."],
    shortTitle: "After the neon",
    role: "VIDEO EDITING",
    year: "2026",
    software: "pr",
    tools: ["Premiere Pro", "After Effects"],
    video: "/media/nightcity.mp4",
    poster: "/media/nightcity.jpg",
    color: "#d5ef72",
    kind: "CINEMATIC EDIT",
    description:
      "An atmospheric journey through the world of Cyberpunk 2077. Rhythm, contrast, and cinematic pacing turn game footage into a visual mood piece.",
  },
  {
    id: "dolce",
    title: ["Beyond", "the frame."],
    shortTitle: "Beyond the frame",
    role: "VIDEO EDITING",
    year: "2026",
    software: "ps",
    tools: ["Premiere Pro", "Photoshop"],
    video: "/media/dolce.mp4",
    poster: "/media/dolce.jpg",
    color: "#f6ad89",
    kind: "GAMING MONTAGE",
    description:
      "A high-energy gaming montage from the Dolce&Gabbana source edit. Layered compositions, colour, and tightly timed cuts turn gameplay imagery into a rhythmic visual sequence.",
  },
  {
    id: "music",
    title: ["Made", "of music."],
    shortTitle: "Made of music",
    role: "VIDEO EDITING",
    year: "2026",
    software: "pr",
    tools: ["Premiere Pro", "After Effects"],
    video: "/media/music.mp4",
    poster: "/media/music.jpg",
    color: "#8ebbd3",
    kind: "MUSIC & CULTURE",
    description:
      "The Art That Is Music — a visual appreciation of sound and the people behind it. An exploration of pace, emotion, and the moments between the beats.",
  },
  {
    id: "inmoe",
    title: ["A little", "more motion."],
    shortTitle: "A little more motion",
    role: "VIDEO EDITING",
    year: "2026",
    software: "ae",
    tools: ["After Effects", "Premiere Pro"],
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
