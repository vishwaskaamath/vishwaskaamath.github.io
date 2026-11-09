import fs from "node:fs";
import path from "node:path";
import { spawn, execFileSync } from "node:child_process";
import ffmpeg from "ffmpeg-static";
const files = [
  ["Iphone SaaS.mp4", "pocket"],
  ["Cyberpunk 2077 (name it proffesionally).mp4", "nightcity"],
  ["Dolce&Gabbana.mp4", "dolce"],
  ["The Art That Is Music.mp4", "music"],
  ["In Moe.mp4", "inmoe"],
];
for (const [name, id] of files) {
  if (process.argv[2] && process.argv[2] !== id) continue;
  const input = path.resolve("../Videos", name),
    output = path.resolve("public/media", `${id}-full.mp4`);
  let metadata = "";
  try {
    execFileSync(ffmpeg, ["-hide_banner", "-i", input], {
      windowsHide: true,
      stdio: ["ignore", "ignore", "pipe"],
    });
  } catch (e) {
    metadata = e.stderr.toString();
  }
  const m = metadata.match(/Duration: (\d+):(\d+):([\d.]+)/);
  if (!m) throw Error("No duration");
  const dimensions = metadata.match(/Video:.*?\b(\d{3,5})x(\d{3,5})\b/);
  if (!dimensions) throw Error("No native dimensions");
  const nativeWidth = +dimensions[1],
    nativeHeight = +dimensions[2],
    portrait = nativeWidth < nativeHeight;
  const boundWidth = Math.min(nativeWidth, portrait ? 1080 : 1920),
    boundHeight = Math.min(nativeHeight, portrait ? 1920 : 1080);
  const seconds = +m[1] * 3600 + +m[2] * 60 + +m[3],
    rate = Math.min(9000, Math.floor((20 * 1024 * 8) / seconds) - 160);
  console.log(`Encoding ${id} full film, ${seconds}s, ${rate}kbps cap`);
  await new Promise((resolve, reject) => {
    const p = spawn(
      ffmpeg,
      [
        "-y",
        "-loglevel",
        "error",
        "-i",
        input,
        "-vf",
        `scale=${boundWidth}:${boundHeight}:force_original_aspect_ratio=decrease:force_divisible_by=2`,
        "-c:v",
        "libx264",
        "-threads",
        "2",
        "-preset",
        "veryfast",
        "-crf",
        "18",
        "-maxrate",
        `${rate}k`,
        "-bufsize",
        `${rate * 2}k`,
        "-pix_fmt",
        "yuv420p",
        "-c:a",
        "aac",
        "-b:a",
        "128k",
        "-movflags",
        "+faststart",
        output,
      ],
      { windowsHide: true, stdio: ["ignore", "ignore", "pipe"] },
    );
    let error = "";
    p.stderr.on("data", (d) => (error += d));
    p.on("error", reject);
    p.on("exit", (code) => (code ? reject(Error(error)) : resolve()));
  });
  if (fs.statSync(output).size > 24 * 1024 * 1024)
    throw Error("Asset exceeds 24MB");
  console.log(`${id} ready`);
  const manifestPath = "src/data/assetManifest.json",
    manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  const entry = manifest.find((asset) => asset.url === `/media/${id}-full.mp4`);
  if (entry) entry.bytes = fs.statSync(output).size;
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
}
