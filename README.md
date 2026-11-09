# Vishwas Kamath — motion portfolio

A single-page motion portfolio built with Next.js (App Router, static export),
React 19, TypeScript and Tailwind CSS 4. All animation is hand-written canvas,
SVG and WebGL; there is no animation library.

## Run locally

```bash
npm install
npm run dev        # development server at http://127.0.0.1:3000
```

To check the production build locally (this is what Vercel will serve):

```bash
npm run preview    # builds into out/ and serves it at http://localhost:3000
```

| Script                 | What it does                                |
| ---------------------- | ------------------------------------------- |
| `npm run dev`          | Development server with hot reload          |
| `npm run build`        | Static export into `out/`                   |
| `npm run serve`        | Serve an existing `out/` build on port 3000 |
| `npm run preview`      | `build` + `serve`                           |
| `npm run typecheck`    | TypeScript check                            |
| `npm run format`       | Format `src/` and `scripts/` with Prettier  |
| `npm run format:check` | Report files that are not formatted         |

`next start` does not work with static exports; use `npm run serve` instead.

## Deploying to Vercel

The site is a static export (`output: "export"` in `next.config.ts`), so Vercel
needs no extra configuration: import the repository, keep the **Next.js**
framework preset and the default build command. Vercel serves the generated
`out/` folder.

## Site structure

1. **Loading screen** — `LoadingScreen.tsx`. Waits for fonts, every poster image
   and the first project's preview clip (under 1 MB), then reveals the page.
2. **Work view** — three synchronised columns driven by one scroll engine:
   - `ProjectWheels.tsx`: curved column of CRT-framed video previews and the
     software tiles column. Click the centre preview to enlarge it with sound.
   - `ProjectMetadata.tsx`: title, role, year, and a **View project** button
     (or **Visit website** when the project has a `website`).
   - Input: wheel, touch drag, arrow keys, or click a neighbouring preview
     (`useProjectWheel.ts`, `lib/scrollPhysics.ts`).
   - Layout: the title sits on the viewport centre and the active video and
     tile sit `--hero-gap` from it (`.work-scene` variables in `globals.css`).
     Arc shape is set by `ARC_STEP` (curvature), `ARC_REACH` (neighbour
     spacing) and `ARC_FOLLOW` (rotation along the rim) in `ProjectWheels.tsx`.
   - Hover physics: on desktop, videos and tiles tilt towards the cursor on
     damped springs, lift, and catch a highlight; flicking the reel makes them
     sway and settle (`lib/tiltPhysics.ts`, tested by
     `scripts/test-tilt-physics.mjs`).
3. **Cinema player** — `CinemaPlayer.tsx`. Opens the full-length film
   (`*-full.mp4`) with play/pause, seek, mute and Esc to close. The URL becomes
   `?project=<slug>` so the browser back button closes it.
4. **About & Contact view** — opened with the bottom button; transition in
   `StoryNavigation.tsx`. Sections: `StoryStage.tsx` (intro),
   `AboutManifesto.tsx` (scroll-revealed bio and drawn path),
   `KineticChapters.tsx` (disciplines, workflow dock, contact). Scrolling up
   past the top returns to the reel.
5. **Always on screen** — `GlassHeader.tsx`: music button, scroll percentage,
   light/dark toggle.
6. **Vinyl music player** — the header button morphs into a working turntable
   with a playlist (`VinylPlayer.tsx`, `Turntable.tsx`, styles in
   `app/vinyl.css`). `hooks/useVinylPlayer.ts` ties the audio to the deck:
   playback speed and pitch follow the platter (spin-up glide, pitch-down when
   stopped), surface crackle and the needle-drop thump play only while the
   stylus is in the groove, and changing songs lifts the arm, swaps the record
   and drops the needle on the new one. Geometry and motor/arm physics live in
   `lib/turntable.ts` (tested by `scripts/test-turntable.mjs`). The record
   stops while a project film is playing.
7. **Cream chapters** — `CreamField.tsx` (styles in `app/cream.css`) draws animated ink-line backdrops:
   flowing engraved lines behind "This is my thing" and sound-wave rings
   behind "Let's talk". Both react to the cursor and scroll speed and pause
   off screen.
8. **Effects** — `WavyBackground.tsx` + `lib/waveRenderer.ts` (WebGL contour
   background with a Canvas 2D fallback), `RibbonCursor.tsx` (light-trail
   cursor), `useParticles.ts` (particle bursts), `WarpedText.tsx` and
   `LiquidSurface.tsx` (cursor-proximity distortion), `VideoBezel.tsx` /
   `CinemaBezel.tsx` (CRT frames). Reduced-motion users get static versions.

## Where to edit content

- **Projects:** `src/data/projects.ts` → `projects`. Each entry has the title
  lines, role, year, tools, preview/poster/full-film paths, background
  `accentPalette`, description and optional `website`. Order here is reel
  order; every preview and poster is loaded before the intro opens.
- **Tools:** `toolCatalog` in the same file is the only place tool names, brand
  colours and skill tags live. `workflowTools` sets which tools appear in the
  About page dock and in what order.
- **Songs:** `src/data/playlist.ts`. The five entries are placeholders that
  all point at `/media/unrequited.mp3`; put real files in
  `public/media/music/` and update each `title`, `artist`, `src` and record
  `label` colour.
- **Contact details:** `profile` in the same file; social links are in
  `KineticChapters.tsx`.
- **About copy:** `StoryStage.tsx` (intro) and `AboutManifesto.tsx` (bio).
- **Fonts:** `src/app/fonts/` — Tanker (titles, `--font-tanker`), Pally (body,
  `--font-pally`), Bebas Neue (transition lettering).

## Media

Web copies live in `public/media/`: `<id>.mp4` (short preview, ≤960px),
`<id>-full.mp4` (cinema film), `<id>.jpg` (poster). Originals stay in
`../Videos` and are never modified or deployed.

| Project           | id          | Original file                               |
| ----------------- | ----------- | ------------------------------------------- |
| SaaS in Motion    | `pocket`    | Iphone SaaS.mp4                             |
| Cyberpunk 2077    | `nightcity` | Cyberpunk 2077 (name it proffesionally).mp4 |
| Spartan Protocol  | `dolce`     | Dolce&Gabbana.mp4                           |
| Art that is Music | `music`     | The Art That Is Music.mp4                   |
| Urban Rhythm      | `inmoe`     | In Moe.mp4                                  |
| Artists in Motion | `artists`   | Artists.mp4                                 |
| Iconic            | `iconic`    | IconicFinal.mp4                             |
| Oscar Piastri     | `oscar`     | OCSAR.mp4                                   |
| Induction         | `induction` | 2026-10-30 17-36-39.mp4                     |

The loading screen (`lib/assetPreloader.ts`) waits for what the first screen
shows: each wheel preview until it has a first frame, every poster, the
software logos (`src/data/brandAssets.ts`) and the fonts. Every asset has a 3 s
timeout, so one slow file can never hold the intro. Full films and the music
track stream when played.
All MP4s must be encoded with `-movflags +faststart` so they can start playing
before they finish downloading.

To regenerate media, install the FFmpeg binary once with
`node node_modules/ffmpeg-static/install.js`, then:

```bash
node scripts/prepare-media.mjs "../Videos"     # previews + posters, first five projects
node scripts/prepare-full-media.mjs            # full films, first five projects
node scripts/prepare-added-media.mjs           # all files for the last four projects
```

`src/data/assetManifest.json` records each file's size; the media scripts
update it automatically.

## Tests

Logic tests run in plain Node without a browser, e.g.
`node scripts/test-asset-preloader.mjs`. `test-continuous-scroll`,
`test-master-ticker` and `test-scroll-physics` predate the current spring-based
scroll engine and currently fail; they need rewriting against it.

## Design credit

Spatial wheel composition inspired by https://carterogunsola.com/. All source,
tiles and interface details are original to this portfolio and use only the
supplied media.
