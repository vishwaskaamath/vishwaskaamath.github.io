import { execFileSync, spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import ffmpeg from "ffmpeg-static";

// Run from this project. Original media is never modified.
const source = path.resolve(process.argv[2] || "../Videos");
const destination = path.resolve("public/media");
fs.mkdirSync(destination, { recursive: true });
const files = [
  ["Iphone SaaS.mp4", "pocket", 2],
  ["Cyberpunk 2077 (name it proffesionally).mp4", "nightcity", 9],
  ["Dolce&Gabbana.mp4", "dolce", 6],
  ["The Art That Is Music.mp4", "music", 8],
  ["In Moe.mp4", "inmoe", 5],
];

const run = (args) =>
  new Promise((resolve, reject) => {
    const child = spawn(ffmpeg, args, {
      windowsHide: true,
      stdio: ["ignore", "ignore", "pipe"],
    });
    let error = "";
    child.stderr.on("data", (data) => (error += data.toString()));
    child.on("error", reject);
    child.on("exit", (code) =>
      code === 0 ? resolve() : reject(new Error(error.slice(-2000))),
    );
  });

for (const [filename, id, time] of files) {
  const input = path.join(source, filename);
  const probe = spawn(ffmpeg, ["-hide_banner", "-i", input], {
    windowsHide: true,
    stdio: ["ignore", "ignore", "pipe"],
  });
  let metadata = "";
  for await (const data of probe.stderr) metadata += data.toString();
  console.log(
    id,
    metadata
      .split("\n")
      .filter((line) => /Duration:|Video:/.test(line))
      .join(" ")
      .trim(),
  );
  execFileSync(
    ffmpeg,
    [
      "-hide_banner",
      "-loglevel",
      "error",
      "-y",
      "-ss",
      String(time),
      "-i",
      input,
      "-frames:v",
      "1",
      "-vf",
      "scale=960:-2",
      "-q:v",
      "3",
      path.join(destination, `${id}.jpg`),
    ],
    { windowsHide: true },
  );
}

// Sequential encoding keeps resource usage bounded while the development server runs.
for (const [filename, id] of files) {
  console.log(`Preparing ${id}…`);
  await run([
    "-hide_banner",
    "-loglevel",
    "error",
    "-y",
    "-i",
    path.join(source, filename),
    "-vf",
    "scale=960:960:force_original_aspect_ratio=decrease:force_divisible_by=2,fps=24",
    "-c:v",
    "libx264",
    "-threads",
    "2",
    "-preset",
    "veryfast",
    "-crf",
    "25",
    "-maxrate",
    "1800k",
    "-bufsize",
    "3600k",
    "-pix_fmt",
    "yuv420p",
    "-c:a",
    "aac",
    "-b:a",
    "96k",
    "-movflags",
    "+faststart",
    path.join(destination, `${id}.mp4`),
  ]);
  const size = fs.statSync(path.join(destination, `${id}.mp4`)).size;
  console.log(`${id}: ${(size / 1024 / 1024).toFixed(2)} MB`);
  if (size > 24 * 1024 * 1024)
    throw new Error(`${id} exceeds the static asset limit; lower its bitrate.`);
}
console.log("All five portfolio films are ready.");
