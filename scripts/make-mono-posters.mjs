// Builds black-and-white copies of the project posters for the About film
// strip (public/media/mono/<name>.jpg). Baking the look into the files means
// the moving strip never runs a CSS filter. Run: node scripts/make-mono-posters.mjs
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const src = "public/media";
const out = "public/media/mono";
fs.mkdirSync(out, { recursive: true });
const posters = fs
  .readdirSync(src)
  .filter((f) => f.endsWith(".jpg") && !f.startsWith("ocean"));
for (const file of posters) {
  await sharp(path.join(src, file))
    .grayscale()
    // Punchy contrast, a touch darker: the old grayscale(1) contrast(1.5)
    // brightness(0.92) filter, baked in.
    .linear(1.5 * 0.92, 255 * 0.92 * (0.5 - 0.5 * 1.5))
    .jpeg({ quality: 82, mozjpeg: true })
    .toFile(path.join(out, file));
  console.log("mono", file);
}
