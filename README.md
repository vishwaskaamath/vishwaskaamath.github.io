# Vishwas Kamath — motion portfolio

A single-viewport portfolio built with Next.js App Router, React, TypeScript,
Tailwind CSS 4, GSAP, and a custom HTML5 Canvas particle system.

## Run locally

```bash
npm install
npm run dev
```

Open http://127.0.0.1:3000. For deployment, `npm run build` creates a static site
in `out/`, suitable for any static host. `npm run typecheck` checks TypeScript.
`next start` is not used with static exports; serve `out/` with your static host.

## Where to edit

- `src/data/projects.ts`: five projects, display titles, role, year, descriptions,
  software, media paths, and contact information.
- `src/components/ProjectWheels.tsx`: synchronized curved preview and software
  wheels, GSAP transforms, playback lifecycle, and click-to-enlarge behavior.
- `src/components/ProjectMetadata.tsx`: staggered character slot transitions.
- `src/hooks/useProjectWheel.ts`: wheel gesture threshold, input cooldown,
  wrapping indices, arrow keys, and touch swipes.
- `src/hooks/useParticles.ts`: capped particle pool, pointer trail, title bursts,
  and expanding stippled rings. Canvas respects device pixel ratio and pauses
  when the page is hidden.
- `src/hooks/useAmbientAudio.ts`: original synthesized ambient pad. Sound starts
  only after a user gesture; both audio controls share the same state.
- `src/components/Overlay.tsx`: native accessible dialogs for films, About, Lab,
  Studio, and Contact. Escape closes them and focus returns to the trigger.
- `src/app/globals.css`: layout, materials, CRT-inspired shading, and responsive
  styling. No WebGL dependency is needed for the 3D software tiles.
- `src/app/fonts/Tanker-Regular.otf`: installed Tanker font, self-hosted through
  `next/font/local` for the project titles. Its CSS variable is `--font-tanker`.

## Controls

Scroll, use arrow keys, swipe on touch, click a neighboring thumbnail, or use
the project dots. The center preview expands on click. Project previews loop
automatically without playback controls, status badges, or category labels.
Background clicks produce expanding particle rings. Visitors who prefer reduced
motion get immediate transitions, no particle effects, and initially paused
previews.

## Media and editable sample metadata

The five films are web copies of the supplied files:

| Portfolio title      | Original source                             |
| -------------------- | ------------------------------------------- |
| Pocket possibilities | Iphone SaaS.mp4                             |
| After the neon       | Cyberpunk 2077 (name it proffesionally).mp4 |
| Beyond the frame     | Dolce&Gabbana.mp4                           |
| Made of music        | The Art That Is Music.mp4                   |
| A little more motion | In Moe.mp4                                  |

Display titles and the requested 2026 year are editable presentation metadata.
Software lists reflect the portfolio review. No client affiliation
is claimed. The original Videos folder is not modified or deployed. Only
optimized copies and the supplied résumé are included in `public/`.

To regenerate web copies and still posters, install the optional FFmpeg binary
with `node node_modules/ffmpeg-static/install.js`, then run:

```bash
node scripts/prepare-media.mjs "../Videos"
```

The preparation script validates each film against the static host's per-file
size limit. It is not part of the production build; prepared files are included.

## Design

Inspired by the spatial wheel composition at https://carterogunsola.com/.
All application source, software tiles, and interface details are implemented
for this portfolio. The work uses the supplied media, not the reference site's
project assets.
