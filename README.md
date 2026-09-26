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
- manage objects with selection, duplication and inspector-driven editing
- save a composition as a local template and rebuild it later, camera framing included
- animate an object between poses with keyframes, previewed in the editor
- support `pt-BR` and `en-US` UI modes

## Features

- multi-object composition with `smartphone`, `smartphone2`, `smartphone3`, `smartwatch`, `notebook` and `tablet`
- object duplication that preserves transform, image and inspector settings
- per-object image upload with model-specific placeholders generated at runtime
- per-model options like the device body toggle, the notebook keyboard and the tablet screen bezel
- per-object transform controls for position, rotation and scale
- device themes plus manual color customization by semantic part
- PNG export in two modes from the `Export` menu: transparent, or with the canvas background color and floor grid baked in
- export resolution menu with `1920x1080`, `2560x1440` and `3840x2160` presets
- supersampled (SSAA) rendering for sharper, screenshot-grade exports
- export feedback chip while the PNG is being prepared
- scene templates stored in `localStorage`: composition, background color and camera pose, saved from the `Templates` section or as a checkbox in the `Export` menu
- template management with inline rename, delete and `Restore framing`, which returns the camera to the pose saved with that template without touching the objects
- per-object motion: the `Transform` section splits into `Static` and `Motion` tabs, with up to four keyframes, per-segment duration and easing, reordering and in-editor playback
- framing actions split by scope: `Fit scene` in the toolbar, `Frame object` in each object's menu
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

- [app/page.tsx](app/page.tsx): main editor state, object list and selection
- [app/components/MockupCanvas/](app/components/MockupCanvas/): 3D canvas, camera, export and render flow
- [app/components/LayersPanel/](app/components/LayersPanel/): objects list (renders the left "Objects" panel) and global preferences
- [app/components/InspectorPanel/](app/components/InspectorPanel/): controls for the selected object
- [app/models/device-models.ts](app/models/device-models.ts): device catalog and model metadata
- [app/lib/scene-objects.ts](app/lib/scene-objects.ts): object creation, reset and model switching
- [app/lib/scene-templates.ts](app/lib/scene-templates.ts): template capture, rebuild and `localStorage` persistence
- [app/lib/scene-motion.ts](app/lib/scene-motion.ts): keyframes, easing curves and transform sampling over time
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

- screen placeholders are generated at runtime on a canvas (checker pattern + recommended size in the UI body font), one per model — there are no static placeholder PNGs to maintain
- placeholder text size is a fraction of the image height so it reads at a consistent visual size across models; `smartwatch` and `notebook` use a larger fraction because their screen is a smaller part of the framed device
- new objects spawn after the rightmost object on the default plane, even when models differ
- duplicated objects also reuse the anti-overlap spawn logic on the same plane
- the `Export` menu has a background mode selector (transparent vs. canvas background) above the `1920x1080`, `2560x1440` and `3840x2160` resolution presets, all active; the chosen mode is remembered via `localStorage`
- exporting with the canvas background also bakes in the floor grid; transparent exports omit both for a clean cutout
- PNG export renders offscreen at 2x internally (SSAA) and downscales, for sharp edges without visible canvas distortion during capture
- side panels overlay the canvas (`position: absolute`) so the 3D scene spans the full viewport behind them and never resizes or re-fits the camera when panels toggle
- `Hide UI` hides every panel and floating control except the canvas; its toggle can be dragged and snaps to the nearest corner, remembered via `localStorage`
- changing the model of an existing object preserves its current transform
- Inspector rotation values are plain degrees (1 unit = 1°); rotation Z supports full turns from `-360` to `360`, pivoting around the model's visual center
- floating menus and list rows use stronger hover contrast in dark mode
- the infinite grid now stays visible longer during zoom-out before fading
- templates store composition, background and camera pose but never the uploaded images: `imageUrl` is the original file as a base64 data URL, so two or three uploads would blow past the ~5MB `localStorage` quota — without images a whole template weighs about 660 bytes, and applying one restores every screen to its placeholder
- applying a template is object-first and camera-last: the canvas takes a `pendingCameraPose` and uses it instead of the auto-fit, keeping the scene under a blocking overlay until every object has resolved
- `Fit scene` and `Frame object` inflate the measured bounding box by 9% per side, because `fitToBox` hugs the content while the initial auto-fit breathes through `<Bounds margin={1.18}>`
- the collapsible `Templates` section animates the height of a clipping container whose inner content is absolutely positioned, so the body keeps its natural layout instead of reflowing mid-transition; both heights are measured with a `ResizeObserver` rather than hardcoded
- `Static` and `Motion` are fully independent: the object's transform is the static pose and only `Static` writes to it, while each keyframe carries its own transform and only `Motion` writes to those; the first keyframe is born as a copy of the static pose and then lives its own life
- a keyframe preview is a display override passed to the canvas, the same shape as the template camera pose, so looking at a keyframe never mutates the object
- playback writes straight to the 3D group through `useFrame` instead of going through React state, which would re-render the tree 60 times per second, and it reuses the same position resolution as the static render so the preview cannot drift from the resting view
- easing uses power-of-two curves rather than the CSS cubic-beziers: indistinguishable in motion and no bezier solving per frame
- motion is capped at four keyframes per object, and the camera is never animated — it stays a viewing tool, which keeps the auto-fit, `Fit scene` and template poses free of precedence rules
- range and number inputs carry an `aria-label` and show a `:focus-visible` ring, so keyboard focus is visible without drawing an outline on mouse clicks
- `Credits` in the UI contains attribution for the third-party 3D assets used by the project

## Learned Lessons

- do not couple placeholders to language; placeholder choice belongs to the model definition
- floating menus should reuse the shared flyout infrastructure to keep portal, outside-click and contrast behavior consistent
- when adding objects, initial transform values must prevent visual overlap across the whole default plane or the editor can look broken even when state changed correctly
- automatic anti-overlap logic should apply only when creating a new layer, not when editing an existing one
- dark mode hover states for flyouts need stronger local contrast than the base panel token alone
- an effect that schedules a `requestAnimationFrame` and cancels it on cleanup is silently disabled by any dependency whose identity changes every render — an unmemoized callback prop was enough to stop the camera auto-fit from ever running, with nothing in the console
- `camera-controls` resolves the promise from `setLookAt` only when the next transition starts, not when the current one settles, so `saveState()` in a `.then()` never runs; store the framing you want to return to instead of relying on `reset()`
- React portals bubble events through the component tree, not the DOM tree, so menu items rendered in a portal still fire the `onClick` of the card that owns the menu
- aliasing two concepts to "save state" backfires: treating the first keyframe as a live alias for the static pose meant reordering keyframes rewrote the object's resting transform — giving each keyframe its own copy removed a whole class of coupling and shrank the reorder logic to an array swap
- reading pixels back from the WebGL canvas returns a stale frame without `preserveDrawingBuffer`; validate any measurement instrument against a change you know happened before trusting it

## Asset Scripts

- [scripts/extract-orange-iphone.mjs](scripts/extract-orange-iphone.mjs): isolates the cropped iPhone node used by the app from the source GLB
- [scripts/extract-iphone-textures.mjs](scripts/extract-iphone-textures.mjs): exports selected textures from the original GLB into `tmp/`

These scripts are development utilities for asset preparation and are not part of the normal app runtime.

## License

Code in this repository is licensed under `GNU AGPL-3.0-only`. See [LICENSE](LICENSE).

Project identity, branding and third-party assets may have separate attribution or usage requirements. Check the in-app `Credits` modal and asset source licenses before redistributing assets.
