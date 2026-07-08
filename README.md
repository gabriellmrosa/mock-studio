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

- compose multiple devices in one scene with independent transforms and uploaded screens
- switch between themes, semantic part colors and model-specific placeholders
- export PNGs at `1080p`, `1440p` or `4K` — transparent, or with the canvas background and floor grid
- hide the entire interface for clean, full-canvas captures
- manage layers with selection, duplication and inspector-driven editing
- support `pt-BR` and `en-US` UI modes

## Features

- multi-object composition with `smartphone`, `smartphone2`, `smartphone3`, `smartwatch`, `notebook` and `tablet`
- layer duplication that preserves transform, image and inspector settings
- per-object image upload with model-specific placeholders
- per-object transform controls for position, rotation and scale
- device themes plus manual color customization by semantic part
- PNG export in two modes from the `Export` menu: transparent, or with the canvas background color and floor grid baked in
- export resolution menu with `1920x1080`, `2560x1440` and `3840x2160` presets
- supersampled (SSAA) rendering for sharper, screenshot-grade exports
- export feedback chip while the PNG is being prepared
- distraction-free `Hide UI` mode with a toggle you can drag to any canvas corner
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

| Model | GLB file | modelScale | baseRotation | modelSpawnOffset | Recommended upload | Notes |
|---|---|---|---|---|---|---|
| smartphone | apple_iphone_14_pro_orange.glb | [122.9, 122.9, 122.9] | [0, 90.5°, 0] | [0, 0, 0] | 1290x2748 | default model, notch removed (clean full screen) |
| smartphone2 | apple_iphone_14_pro_orange.glb | [122.9, 122.9, 122.9] | [0, 90.5°, 0] | [0, 0, 0] | 1290x2748 | same GLB, keeps the notch |
| smartphone3 | smartphone.glb | [1, 1, 1] | [0, 0, 0] | [0, 0, 0] | 1290x2755 | generic phone |
| smartwatch | smartwatch.glb | [19.44, 19.44, 19.44] | [0, -π/2, 0] | [130, 40, 270] | 1290x1452 | |
| notebook | notebook.glb | [2311, 2311, 2311] | [0, π, 0] | [120, 100, 0] | 2755x1684 | |
| tablet | — (procedural) | [1, 1, 1] | [0, π, 0] | [0, 0, 0] | 1668x2388 | fully code-drawn, no GLB asset |

The `smartphone` (default) and `smartphone2` share the same iPhone GLB. `smartphone` hides the notched screen mesh and covers the molded notch with a generated clean rounded-rectangle screen plane pushed slightly in front; `smartphone2` keeps the original notch.

The `tablet` has no GLB: its body is an extruded rounded rectangle with beveled edges, and the bezel and screen are generated rounded planes in front of it — the same clean-screen technique used by the smartphones. Toggling off the device body leaves just the floating screen.

## Project Structure

- [app/page.tsx](app/page.tsx): main editor state, object list and selection
- [app/components/MockupCanvas/](app/components/MockupCanvas/): 3D canvas, camera, export and render flow
- [app/components/LayersPanel/](app/components/LayersPanel/): layers list and global preferences
- [app/components/InspectorPanel/](app/components/InspectorPanel/): controls for the selected object
- [app/models/device-models.ts](app/models/device-models.ts): device catalog and model metadata
- [app/lib/scene-objects.ts](app/lib/scene-objects.ts): object creation, reset and model switching
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
- define a model-specific placeholder and final themes

## Technical Notes

- placeholders are model-specific and no longer tied to locale
- new layers spawn after the rightmost object on the default plane, even when models differ
- duplicated layers also reuse the anti-overlap spawn logic on the same plane
- the `Export` menu has a background mode selector (transparent vs. canvas background) above the `1920x1080`, `2560x1440` and `3840x2160` resolution presets, all active; the chosen mode is remembered via `localStorage`
- exporting with the canvas background also bakes in the floor grid; transparent exports omit both for a clean cutout
- PNG export renders offscreen at 2x internally (SSAA) and downscales, for sharp edges without visible canvas distortion during capture
- side panels overlay the canvas (`position: absolute`) so the 3D scene spans the full viewport behind them and never resizes or re-fits the camera when panels toggle
- `Hide UI` hides every panel and floating control except the canvas; its toggle can be dragged and snaps to the nearest corner, remembered via `localStorage`
- changing the model of an existing layer preserves its current transform
- floating menus and list rows use stronger hover contrast in dark mode
- the infinite grid now stays visible longer during zoom-out before fading
- `Credits` in the UI contains attribution for the third-party 3D assets used by the project

## Learned Lessons

- do not couple placeholders to language; placeholder choice belongs to the model definition
- floating menus should reuse the shared flyout infrastructure to keep portal, outside-click and contrast behavior consistent
- when adding layers, initial transform values must prevent visual overlap across the whole default plane or the editor can look broken even when state changed correctly
- automatic anti-overlap logic should apply only when creating a new layer, not when editing an existing one
- dark mode hover states for flyouts need stronger local contrast than the base panel token alone

## Asset Scripts

- [scripts/extract-orange-iphone.mjs](scripts/extract-orange-iphone.mjs): isolates the cropped iPhone node used by the app from the source GLB
- [scripts/extract-iphone-textures.mjs](scripts/extract-iphone-textures.mjs): exports selected textures from the original GLB into `tmp/`
- [scripts/generate-tablet-placeholder.mjs](scripts/generate-tablet-placeholder.mjs): generates `public/placeholder-1668x2388.png` with a dependency-free PNG encoder (reusable for future placeholders)

These scripts are development utilities for asset preparation and are not part of the normal app runtime.

## License

Code in this repository is licensed under `GNU AGPL-3.0-only`. See [LICENSE](LICENSE).

Project identity, branding and third-party assets may have separate attribution or usage requirements. Check the in-app `Credits` modal and asset source licenses before redistributing assets.
