// Prints a styled PDF (public/resume-generated.pdf) from the same content as the
// /resume page. NOTE: the downloadable public/resume.pdf is Vishwas's own file
// and is never written by this script.
// Content: src/data/resume.ts. Printed with Microsoft Edge (or Chrome) headless.
// Run: node scripts/build-resume-pdf.mjs
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import { resume } from "../src/data/resume.ts";

const root = process.cwd();
const font = (file) =>
  pathToFileURL(path.join(root, "src/app/fonts", file)).href;
const esc = (s) =>
  String(s).replace(
    /[&<>"]/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c],
  );

// Experience first (most relevant), education in its own block.
const order = ["edit", "uiux", "art", "vara"];
const jobs = order
  .map((id) => resume.clips.find((c) => c.id === id))
  .filter(Boolean);
const study = resume.clips.find((c) => c.id === "bba");

const job = (c) => `
  <section class="job">
    <div class="job-head">
      <h3>${esc(c.title)}</h3>
      <span class="when">${esc(c.dates)}</span>
    </div>
    <p class="org">${esc(c.org)} · ${esc(c.place)}</p>
    <ul>${c.bullets.map((b) => `<li>${esc(b)}</li>`).join("")}</ul>
  </section>`;

const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>Vishwas Kamath — Résumé</title>
<style>
@font-face { font-family: Bebas; src: url("${font("BebasNeue-Regular.ttf")}"); }
@font-face { font-family: Pally; src: url("${font("Pally-Regular.otf")}"); font-weight: 400; }
@font-face { font-family: Pally; src: url("${font("Pally-Medium.otf")}"); font-weight: 500; }
@font-face { font-family: Pally; src: url("${font("Pally-Bold.otf")}"); font-weight: 700; }
@page { size: A4; margin: 0; }
* { box-sizing: border-box; }
html, body { margin: 0; background: #f3efe6; color: #09090b; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
body { font: 400 9.4pt/1.5 Pally, sans-serif; }
.mono { font-family: Consolas, "SFMono-Regular", monospace; }
/* Slate stripe across the top, like the page's clapperboard. */
.stripe { height: 14px; background: repeating-linear-gradient(-58deg, #09090b 0 14px, #f3efe6 14px 28px, #ff4d1c 28px 42px, #f3efe6 42px 56px); }
.slate { display: grid; grid-template-columns: 1fr auto; gap: 18px; align-items: end; padding: 18px 36px 16px; background: #09090b; color: #f3efe6; }
.slate h1 { margin: 0; font: 400 44pt/0.86 Bebas, sans-serif; letter-spacing: .01em; }
.slate h1 span { color: transparent; -webkit-text-stroke: 1px #f3efe6; }
.slate .role { margin: 8px 0 0; font-weight: 700; font-size: 10pt; }
.slate .meta { text-align: right; font: 600 7pt/1.8 Consolas, monospace; letter-spacing: .12em; color: rgba(243,239,230,.7); }
.slate .meta b { color: #ff4d1c; font-weight: 700; }
.page { padding: 16px 36px 18px; }
.summary { margin: 0; color: rgba(9,9,11,.84); }
.stats { display: grid; grid-template-columns: repeat(4, 1fr); margin: 12px 0 14px; border-top: 1px solid rgba(9,9,11,.18); border-bottom: 1px solid rgba(9,9,11,.18); }
.stat { padding: 8px 10px; }
.stat + .stat { border-left: 1px solid rgba(9,9,11,.14); }
.stat b { display: block; font: 400 20pt/1 Bebas, sans-serif; }
.stat b em { font: normal 700 6.4pt Consolas, monospace; color: #ff4d1c; letter-spacing: .12em; margin-left: 4px; vertical-align: top; }
.stat span { font-size: 7.2pt; color: rgba(9,9,11,.65); line-height: 1.35; display: block; }
.cols::after { content: ""; display: block; clear: both; }
.side { float: left; width: 190px; }
.main { margin-left: 212px; }
h2 { margin: 0 0 7px; padding-bottom: 4px; border-bottom: 1px solid rgba(9,9,11,.18); font: 700 7.2pt/1.2 Consolas, monospace; letter-spacing: .16em; color: #ff4d1c; }
.side section + section, .main section.block + section.block { margin-top: 13px; }
.group { margin-bottom: 7px; }
.group h3 { margin: 0 0 3px; font: 700 6.4pt/1.2 Consolas, monospace; letter-spacing: .1em; }
.tags { display: flex; flex-wrap: wrap; gap: 3px; }
.tags span { padding: 2px 6px; border: 1px solid rgba(9,9,11,.22); border-radius: 4px; font-size: 6.9pt; font-weight: 500; }
.rows div { display: flex; justify-content: space-between; gap: 8px; padding: 3px 0; border-bottom: 1px solid rgba(9,9,11,.1); font-size: 7.8pt; }
.rows em { font: normal 600 6.6pt Consolas, monospace; color: rgba(9,9,11,.6); text-align: right; }
.job { padding: 7px 0 5px; break-inside: avoid; }
.job + .job { border-top: 1px solid rgba(9,9,11,.12); }
.job-head { display: flex; justify-content: space-between; gap: 10px; align-items: baseline; }
.job h3 { margin: 0; font-size: 10pt; line-height: 1.25; }
.when { flex: none; padding: 2px 8px; border-radius: 999px; background: #ff4d1c; color: #f3efe6; font: 700 6.4pt/1.4 Consolas, monospace; letter-spacing: .08em; text-transform: uppercase; }
.org { margin: 2px 0 4px; font-size: 7.8pt; font-weight: 500; color: rgba(9,9,11,.6); }
.job ul { margin: 0; padding-left: 13px; }
.job li { margin: 1px 0; font-size: 8.2pt; line-height: 1.4; }
.job li::marker { color: #ff4d1c; }
.edu b { display: block; font-size: 8.4pt; }
.edu p { margin: 2px 0; font-size: 7.8pt; }
.pill { display: inline-block; margin-top: 4px; padding: 2px 8px; border-radius: 999px; background: #ff4d1c; color: #f3efe6; font: 700 6.4pt/1.4 Consolas, monospace; letter-spacing: .08em; }
.foot { margin-top: 12px; padding-top: 8px; border-top: 1px solid rgba(9,9,11,.18); display: flex; flex-wrap: wrap; gap: 6px 16px; font: 600 7pt/1.4 Consolas, monospace; letter-spacing: .06em; }
.foot b { color: #ff4d1c; }
</style></head><body>
<div class="stripe"></div>
<header class="slate">
  <div>
    <h1>${esc(resume.first)} <span>${esc(resume.last)}</span></h1>
    <p class="role">${esc(resume.role)}</p>
  </div>
  <div class="meta">
    <div><b>RÉSUMÉ</b> · THE 2026 CUT</div>
    <div>${esc(resume.email.toUpperCase())}</div>
    <div>${esc(resume.location.toUpperCase())}</div>
  </div>
</header>
<div class="page">
  <p class="summary">${esc(resume.summary)}</p>
  <div class="stats">
    ${resume.stats
      .map(
        (s) =>
          `<div class="stat"><b>${s.value}${s.suffix}<em>${esc(s.unit)}</em></b><span>${esc(s.label)}</span></div>`,
      )
      .join("")}
  </div>
  <div class="cols">
    <aside class="side">
      <section><h2>THE KIT</h2>
        ${resume.bins
          .map(
            (g) =>
              `<div class="group"><h3>${esc(g.title)}</h3><div class="tags">${g.items.map((i) => `<span>${esc(i)}</span>`).join("")}</div></div>`,
          )
          .join("")}
        <div class="group"><h3>SOFTWARE</h3><div class="tags">${resume.software.map(([, l]) => `<span>${esc(l)}</span>`).join("")}</div></div>
      </section>
      <section class="edu"><h2>EDUCATION</h2>
        <b>${esc(study.title)}</b>
        <p>${esc(study.org)} · ${esc(study.place)}</p>
        <p>${esc(study.bullets[0])}</p>
        <span class="pill">${esc(study.dates.toUpperCase())}</span> <span class="pill">${esc(study.score)}</span>
      </section>
      <section class="rows"><h2>LANGUAGES</h2>
        <div>English <em>FLUENT</em></div>
        <div>Hindi <em>PROFICIENT</em></div>
      </section>
    </aside>
    <main class="main">
      <section class="block"><h2>EXPERIENCE</h2>${jobs.map(job).join("")}</section>
    </main>
  </div>
  <div class="foot">
    <span><b>AVAILABLE</b> ${esc(resume.availability)}</span>
    <span>LINKEDIN.COM/IN/VISHWAS-KAMATH-717016369</span>
    <span>INSTAGRAM @SYDORM_</span>
  </div>
</div>
</body></html>`;

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "resume-"));
const htmlPath = path.join(tmp, "resume.html");
fs.writeFileSync(htmlPath, html);
const out = path.join(root, "public", "resume-generated.pdf");
const browsers = [
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome",
];
const browser = browsers.find((b) => fs.existsSync(b));
if (!browser) throw new Error("No Edge or Chrome found to print the PDF.");
execFileSync(browser, [
  "--headless=new",
  "--disable-gpu",
  "--no-pdf-header-footer",
  "--allow-file-access-from-files",
  `--user-data-dir=${path.join(tmp, "profile")}`,
  `--print-to-pdf=${out}`,
  pathToFileURL(htmlPath).href,
]);
console.log("wrote", out, fs.statSync(out).size, "bytes");
