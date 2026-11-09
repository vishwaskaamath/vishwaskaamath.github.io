export type Track = {
  id: string;
  title: string;
  artist: string;
  /** Audio file in public/, e.g. "/media/music/track-01.mp3". */
  src: string;
  /** Where the song starts playing, in seconds (default 0). */
  start?: number;
  /** Record label colour. */
  label: string;
  /** Shown in the Record Box analyzer header. */
  bpm: number;
  key: string;
};

// Play order: the first track (202) is on the platter when the site loads.
// bpm and key are display values for the analyzer header.
export const playlist: Track[] = [
  {
    id: "202",
    title: "202",
    artist: "Clear Coast",
    src: "/media/music/202.mp3",
    start: 38,
    label: "#8b7cf6",
    bpm: 84,
    key: "D MIN",
  },
  {
    id: "url-lofi",
    title: "URL (Lofi)",
    artist: "Webinar",
    src: "/media/music/url-lofi.mp3",
    label: "#ff4d1c",
    bpm: 122,
    key: "F# MIN",
  },
  {
    id: "unrequited",
    title: "Unrequited",
    artist: "Midrift",
    src: "/media/unrequited.mp3",
    label: "#f2c14e",
    bpm: 96,
    key: "A MIN",
  },
  {
    id: "all-i-did-was-dream-of-you",
    title: "All I Did Was Dream of You",
    artist: "Beabadoobee",
    src: "/media/music/all-i-did-was-dream-of-you.mp3",
    start: 55,
    label: "#5ec2b7",
    bpm: 128,
    key: "C MAJ",
  },
  {
    id: "crocodile",
    title: "Crocodile",
    artist: "Goth Babe",
    src: "/media/music/crocodile.mp3",
    start: 13,
    label: "#e85d9a",
    bpm: 140,
    key: "E♭ MAJ",
  },
];
