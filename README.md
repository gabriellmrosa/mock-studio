# Mock Studio

Open source editor for composing app screens inside 3D device mockups with `Next.js`, `React`, `Three.js` and `React Three Fiber`.

## Features

- multi-object composition with `smartphone`, `smartphone2`, `smartwatch` and `notebook`
- layer duplication that preserves transform, image and inspector settings
- per-object image upload with model-specific placeholders
- per-object transform controls for position, rotation and scale
- device themes plus manual color customization by semantic part
- transparent PNG export from the canvas
- export feedback chip while the PNG is being prepared
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

| Model | GLB file | modelScale | baseRotation | modelSpawnOffset | Recommended upload |
|---|---|---|---|---|---|
| smartphone | smartphone.glb | [1, 1, 1] | [0, 0, 0] | [0, 0, 0] | 1290x2755 |
| smartphone2 | apple_iphone_14_pro_orange.glb | [122.9, 122.9, 122.9] | [0, 90.5°, 0] | [0, 0, 0] | 1290x2748 |
| smartwatch | smartwatch.glb | [19.44, 19.44, 19.44] | [0, -π/2, 0] | [130, 40, 270] | 1290x1452 |
| notebook | notebook.glb | [2311, 2311, 2311] | [0, π, 0] | [120, 100, 0] | 2755x1684 |

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
- same-model objects spawn side by side to avoid invisible overlap when adding layers
- duplicated layers also reuse the anti-overlap spawn logic on the same plane
- export uses a floating resolution menu, with `1920x1080` active and higher presets marked as `Em breve`
- PNG export now renders offscreen, avoiding visible canvas distortion during capture
- changing the model of an existing layer preserves its current transform
- floating menus and list rows use stronger hover contrast in dark mode
- the infinite grid now stays visible longer during zoom-out before fading
- `Credits` in the UI contains attribution for the third-party 3D assets used by the project

## Learned Lessons

- do not couple placeholders to language; placeholder choice belongs to the model definition
- floating menus should reuse the shared flyout infrastructure to keep portal, outside-click and contrast behavior consistent
- when adding repeated models, initial transform values must prevent visual overlap or the editor can look broken even when state changed correctly
- automatic anti-overlap logic should apply only when creating a new layer, not when editing an existing one
- dark mode hover states for flyouts need stronger local contrast than the base panel token alone

## Asset Scripts

- [scripts/extract-orange-iphone.mjs](scripts/extract-orange-iphone.mjs): isolates the cropped iPhone node used by the app from the source GLB
- [scripts/extract-iphone-textures.mjs](scripts/extract-iphone-textures.mjs): exports selected textures from the original GLB into `tmp/`

These scripts are development utilities for asset preparation and are not part of the normal app runtime.

## License

Code in this repository is licensed under `GNU AGPL-3.0-only`. See [LICENSE](LICENSE).

Project identity, branding and third-party assets may have separate attribution or usage requirements. Check the in-app `Credits` modal and asset source licenses before redistributing assets.
