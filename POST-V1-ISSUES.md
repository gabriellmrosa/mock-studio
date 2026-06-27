# Post-v1 Issues

## 1. Enable and validate Vercel Web Analytics

- confirm Web Analytics is enabled in Vercel
- validate page views, visitors and referrers after production traffic
- document any required setup notes if the workflow changes

## 2. Add README visuals for the public repository

- add at least one screenshot or short GIF to the README
- show the editor canvas, layers panel and inspector
- improve first impression for GitHub visitors

## 3. Ship higher-resolution PNG export presets — done (v1.1.0)

- [x] enable `2560x1440` export
- [x] enable `3840x2160` export
- [x] keep `1920x1080` as the default fast path
- [x] supersampled (SSAA) rendering for sharper output at every preset

## 4. Document asset and branding usage boundaries

- clarify how `AGPL-3.0` applies to the source code
- clarify whether branding, project name and third-party assets have separate restrictions
- add a short policy section to docs if needed

## 5. Harden initial 3D loading and camera-fit behavior

- review first-scene loading behavior in production
- confirm camera fit remains correct under slower asset loading
- add test coverage for delayed object resolution when feasible
