<p align="center">
  <img src="./public/readme-header.png" alt="Mock Studio editor preview showing smartphone, notebook and smartwatch mockups in a 3D scene" />
</p>

<h1 align="center">Mock Studio</h1>

<p align="center">
  Open source editor for composing app screens inside interactive 3D device mockups.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16-111111?logo=next.js" alt="Next.js 16" />
  <img src="https://img.shields.io/badge/React-19-20232a?logo=react" alt="React 19" />
  <img src="https://img.shields.io/badge/Three.js-R3F-000000?logo=three.js" alt="Three.js and React Three Fiber" />
  <img src="https://img.shields.io/badge/TypeScript-5-3178c6?logo=typescript&logoColor=white" alt="TypeScript 5" />
  <img src="https://img.shields.io/badge/License-AGPL--3.0-5c4ee5" alt="AGPL 3.0" />
</p>

<p align="center">
  <a href="#features">Features</a> •
  <a href="#getting-started">Getting Started</a> •
  <a href="#model-catalog">Model Catalog</a> •
  <a href="#project-structure">Project Structure</a>
</p>

Built with `Next.js`, `React`, `Three.js` and `React Three Fiber` to compose marketing shots, product screens and device scenes with per-object controls, layered editing and PNG export with an optional canvas background.

## Highlights

- compose multiple devices in one scene with independent transforms and uploaded screens — images or screen recordings
- switch between themes, semantic part colors and model-specific placeholders
- export PNGs at `1080p`, `1440p` or `4K` — transparent, or with the canvas background and floor grid
- hide the entire interface for clean, full-canvas captures
- manage objects with selection, duplication and inspector-driven editing
- save a composition or an animation as a local template and rebuild it later, camera framing included
- animate an object between poses with keyframes, previewed in the editor
- support `pt-BR` and `en-US` UI modes

## Features

- multi-object composition with `smartphone`, `smartphone2`, `smartphone3`, `smartwatch`, `notebook` and `tablet`
- object duplication that preserves transform, image and inspector settings
- per-object screen content: an image or a video (MP4, MOV or WebM), switched from the `Image` / `Video` control in the `Screen` section, with model-specific placeholders generated at runtime
- screen videos exist only in `Motion`, where they follow the playhead and the recording is a clip on its own track under the object — drag it to set when it starts, drag its edges to trim the start or the end, and outside the clip the screen shows only its background; `Static` is a still image, so its `Screen` section goes straight to the image upload, with no `Image | Video` choice
- per-file screen framing: zoom (50–300%), X/Y position, a background color for whatever the content leaves uncovered, and edge cropping that masks borders recorded into the file — the background color is offered in both `Fit` and `Crop`, since cropped bands show it too
- once a file is uploaded, the `Screen` section shrinks to a single row — type icon, file name and a `⋮` menu — and the menu opens a floating panel beside the Inspector with `Replace`, the `Fit | Crop` options and `Remove`
- HDR screen recordings (HEVC with PQ or HLG, common from iPhone and Mac) are converted to SDR, so they show the same colors as the app they recorded
- per-model options like the device body toggle, the notebook keyboard and the tablet screen bezel, all as switches
- per-object transform controls for position, rotation and scale
- device themes plus manual color customization by semantic part
- an `Export` dialog in the middle of the screen, behind a dimmed backdrop: choose everything first — format, size, background — then export once; `Cancel`, `Escape` or a click outside closes it
- PNG export in two modes: transparent, or with the canvas background color and floor grid baked in
- image sizes `1920 × 1080`, `2560 × 1440` and `3840 × 2160`, remembered between exports
- supersampled (SSAA) rendering for sharper, screenshot-grade exports
- export feedback chip while the PNG is being prepared
- scene templates stored in `localStorage`: composition, background color and camera pose — plus every keyframe when saved in `Motion` — saved from the `Templates` section or along with an export (the `Save as template` checkbox in the `Export` dialog, checked by default)
- `Static` and `Motion` are separate environments: each keeps its own scene and its own template list, and the first visit to `Motion` starts from a copy of the static scene
- switching environments or opening a template with unsaved changes asks first, offering to save a template before leaving
- template management with inline rename, delete and `Restore framing`, which returns the camera to the pose saved with that template without touching the objects
- per-object motion: a `Static` / `Motion` switch on the canvas and a timeline with one track per visible object — create a keyframe at the playhead with the track's ◆+ button, drag keyframes in time or shift a whole track, right-click between two keyframes to pick the transition (presets or a `cubic-bezier` curve editor with overshoot), edit the selected keyframe's pose in the Inspector, and press `Space` to play
- framing actions split by scope: `Fit scene` in the toolbar, `Frame object` in each object's menu
- `Alignment` at the top of `Transform`: left, center or right and top, middle or bottom, one axis per click, with a small margin — against the video frame in `Motion`, against the part of the canvas visible between the panels in `Static`; the object keeps its distance to the camera
- tooltips on the canvas toolbar icons, shown on hover and keyboard focus
- `Reset` as a single icon, dimmed when there is nothing to reset
- timeline zoom: `−` / `+` in its header or a trackpad pinch inside it, anchored on the playhead or under the fingers, with a ruler that refines to tenths of a second
- a resizable timeline in `Motion`: drag its top edge (or use the arrow keys on it), double-click to reset; the height is remembered
- object opacity, part of the pose: set it in `Transform` and, in `Motion`, animate it per keyframe to fade an object in or out
- in `Motion` an animated object enters the scene at its first keyframe — drag its track forward and it isn't there before — and stays on its final pose after the last one
- a video size for `Motion` (1920 × 1080 by default), set from the timeline header with 16:9, 1:1, 4:5 and 9:16 presets or width and height in pixels, with an optional aspect-ratio lock; the canvas takes that shape, and `Motion` templates store it
- video export from `Motion`, where the `Export` dialog opens on `Video`: background (MP4 with it, transparent WebM without), frame rate (30 or 60 fps) and resolution (1× or 2×), with a one-line summary; while it renders, a centered progress dialog covers the whole editor with a bar, the current frame, an estimate of the time left and `Cancel`. In Safari, which doesn't show transparent video yet, choosing a transparent video shows a note suggesting Chrome, Edge or Firefox, with a `Copy project link` button
- project links: the whole scene — objects, poses, keyframes, camera, background and video size — travels compressed in the URL hash, never sent to a server; opening the link in another browser saves the scene to its templates and opens it in the right mode (screen images and videos aren't included and must be uploaded again)
- distraction-free `Hide UI` mode with a toggle you can drag to any canvas corner, animating between the toolbar and the corner it snaps to
- layered selection flow via list and direct interaction in the 3D scene
- `pt-BR` and `en-US` UI support
- dark and light themes

## Stack

- `Next.js 16`
- `React 19`
- `Three.js`
- `@react-three/fiber`
- `@react-three/drei`
- `Tailwind CSS 4`
- `Jest` + `Testing Library`
- `Vercel Web Analytics`

## Getting Started

```bash
npm install
npm run dev
```

Production build:

```bash
npm run build
```

Quality checks:

```bash
npx tsc --noEmit
npm run lint
npm test -- --runInBand
```

## Analytics

This project includes the minimal Vercel Web Analytics integration through `@vercel/analytics`.

To see traffic data in production:

1. Deploy the project to Vercel.
2. Enable `Web Analytics` in the Vercel dashboard.
3. Visit the Analytics tab for page views, visitors, referrers and geography data.

## Model Catalog

| Model | GLB file | modelScale | baseRotation | pivotOffset | Recommended upload | Notes |
|---|---|---|---|---|---|---|
| smartphone | apple_iphone_14_pro_orange.glb | [122.9, 122.9, 122.9] | [0, 90.5°, 0] | [-1.5, -2.5, 1.0] | 1290x2748 | default model, notch removed (clean full screen) |
| smartphone2 | apple_iphone_14_pro_orange.glb | [122.9, 122.9, 122.9] | [0, 90.5°, 0] | [-1.5, -2.5, 1.0] | 1290x2748 | same GLB, keeps the notch |
| smartphone3 | smartphone.glb | [1, 1, 1] | [0, 0, 0] | [125.09, -314.71, 180.11] | 1290x2755 | generic phone |
| smartwatch | smartwatch.glb | [19.44, 19.44, 19.44] | [0, -π/2, 0] | [-7.3, -14.48, 0.08] | 1290x1452 | |
| notebook | notebook.glb | [2311, 2311, 2311] | [0, π, 0] | [0, -0.0964, 0.0397] | 2755x1684 | |
| tablet | — (procedural) | [1, 1, 1] | [0, π, 0] | [0, 0, 0] | 1668x2388 | fully code-drawn, no GLB asset |

Every model's `pivotOffset` (GLTF units, applied inside the scaled group) centers its visible geometry on the group origin, so Inspector rotations pivot around the visual center and all models align with each other by construction — `modelSpawnOffset` is now `[0, 0, 0]` everywhere and reserved for intentional offsets.

The `smartphone` (default) and `smartphone2` share the same iPhone GLB. `smartphone` hides the notched screen mesh and covers the molded notch with a generated clean rounded-rectangle screen plane pushed slightly in front; `smartphone2` keeps the original notch.

The `tablet` has no GLB: its body is an extruded rounded rectangle with beveled edges, and the bezel and screen are generated rounded planes in front of it — the same clean-screen technique used by the smartphones. Toggling off the device body leaves just the floating screen, and a dedicated `Screen bezel` toggle removes the black frame around the screen.

## Project Structure

- [app/page.tsx](app/page.tsx): main editor state, object list and selection, and the per-mode scenes
- [app/components/MockupCanvas/](app/components/MockupCanvas/): 3D canvas, camera, export and render flow
- [app/components/LayersPanel/](app/components/LayersPanel/): objects list (renders the left "Objects" panel) and global preferences
- [app/components/InspectorPanel/](app/components/InspectorPanel/): controls for the selected object
- [app/components/MotionTimeline/](app/components/MotionTimeline/): motion timeline, keyframe tracks and the cubic-bezier curve editor
- [app/components/Dialog/](app/components/Dialog/): the centered dialog behind `Export`, the export progress and the `AlertDialog` confirmations
- [app/models/device-models.ts](app/models/device-models.ts): device catalog and model metadata
- [app/lib/scene-objects.ts](app/lib/scene-objects.ts): object creation, reset and model switching
- [app/lib/scene-templates.ts](app/lib/scene-templates.ts): template capture, rebuild and `localStorage` persistence
- [app/lib/scene-motion.ts](app/lib/scene-motion.ts): keyframes, easing curves and transform sampling over time
- [app/lib/screen-texture.ts](app/lib/screen-texture.ts): the shared screen texture hook, for images and videos, and the framing math (`getScreenLayout`)
- [app/lib/screen-compositor.ts](app/lib/screen-compositor.ts): the pass that draws the final screen — framing, background and HDR conversion
- [app/lib/hdr-video.ts](app/lib/hdr-video.ts): HDR detection and the PQ/HLG to SDR conversion
- [app/components/EditorPrimitives/](app/components/EditorPrimitives/): shared panel, button and collapsible-section primitives
- [app/lib/3d-tokens/](app/lib/3d-tokens/): per-model themes and color tokens
- [app/lib/i18n.ts](app/lib/i18n.ts): copy for `pt-BR` and `en-US`

## Adding a New 3D Model

Checklist:

- add the `.glb` file to `public/models/`
- create the React component in `app/components/`
- create its color tokens in `app/lib/3d-tokens/`
- add a new entry to `app/models/device-models.ts`
- update the `DeviceModelId` union
- map semantic parts with `debugPartColors` and `debugMode`
- list the customizable part keys in the model's `customizableColorKeys`, and add their display labels to `colorPartLabels` in `app/lib/i18n.ts` for both locales (labels live in i18n, not in the model definition)
- register the placeholder size in `MODEL_PLACEHOLDER_SIZES` (the image is generated at runtime) and define the final themes
- set `pivotOffset` to the negative of the visible bounding-box center (GLTF units) so the model is centered on its pivot — rotation then happens around the visual center and alignment with the other models is automatic

## Technical Notes

How it works under the hood, and the lessons learned building it, are in
[docs/technical-notes.md](docs/technical-notes.md). Working rules for
contributors and coding agents are in [AGENTS.md](AGENTS.md).

## Asset Scripts

- [scripts/extract-orange-iphone.mjs](scripts/extract-orange-iphone.mjs): isolates the cropped iPhone node used by the app from the source GLB
- [scripts/extract-iphone-textures.mjs](scripts/extract-iphone-textures.mjs): exports selected textures from the original GLB into `tmp/`

These scripts are development utilities for asset preparation and are not part of the normal app runtime.

## License

Code in this repository is licensed under `GNU AGPL-3.0-only`. See [LICENSE](LICENSE).

Project identity, branding and third-party assets may have separate attribution or usage requirements. Check the in-app `Credits` modal and asset source licenses before redistributing assets.
