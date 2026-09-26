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

## 5. Harden initial 3D loading and camera-fit behavior — partially done

- [x] fix the auto-fit never running: the effect's `requestAnimationFrame` was cancelled on every render by an unmemoized callback in its dependency array, leaving the camera at its initial `z=5` and the scene looking extremely zoomed in
- [x] fix `Reset view` sending the camera inside the object, caused by relying on `camera-controls` `saveState()` inside a promise that never resolved
- [x] stop the camera from drifting when object positions change (drei `<Center>` was re-centering the whole scene group)
- review first-scene loading behavior in production
- confirm camera fit remains correct under slower asset loading
- add test coverage for delayed object resolution when feasible

## 6. Duplicate object names when adding objects quickly

- adding two objects in fast succession produces two objects named `Object 2`
- the spawn position uses a functional state updater, but the name is derived from a stale `sceneObjects.length`
- derive the name inside the same functional updater that appends the object

## 7. Give motion an output

- per-object keyframes ship without any way to export the result: the animation only exists inside the editor
- `canvas.captureStream()` + `MediaRecorder` is the browser-native path, available since January 2020
- format is the catch: Chrome and Firefox record WebM, Safari records MP4, and universal MP4 would need `ffmpeg.wasm` in the bundle
- the export is the larger half of the work — fixed frame rate, deterministic playback and coexisting with the offscreen SSAA render path

## 8. Templates do not capture motion

- applying a template rebuilds objects with an empty keyframe list
- including keyframes means bumping `TEMPLATE_SCHEMA_VERSION`, and the version check discards templates saved under the old schema
- decide on a migration before bumping, so saved templates survive

## 9. Timeline for coordinating motion across objects

- the goal is composing short videos of several objects moving to a final arrangement, which the per-object keyframe list cannot show: you have to open each object and overlay the timings mentally
- one track per object, not per property — a keyframe here is a whole pose, which avoids the per-property tracks that make After Effects heavy
- v1 scope: blocks per segment, markers at keyframes, a draggable playhead, dragging a track to set its delay and dragging a block edge to change duration
- dragging a keyframe marker is a paired adjustment of the two neighbouring segment durations, so segment durations stay the model and absolute keyframe times are not needed
- `motionDelayMs` already landed, which is the piece the timeline needs to have anything to coordinate
