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

## 8. Templates do not capture motion — done

- [x] templates carry a `mode`; `Motion` templates store every keyframe (time, pose, easing and cubic-bezier curve), `Static` ones store none
- [x] each mode lists only its own templates, and each mode keeps its own scene
- [x] no schema bump: `mode` and `keyframes` are optional, so templates saved before them load as `Static` and an older cached app keeps reading the list
- [x] keyframe ids are not stored and are regenerated on every apply, since timeline selection looks them up scene-wide
- [x] switching modes or opening a template with unsaved changes asks first (`AlertDialog`)

## 9. Timeline for coordinating motion across objects — done

- the goal is composing short videos of several objects moving to a final arrangement, which the per-object keyframe list could not show: you had to open each object and overlay the timings mentally
- one track per object, not per property — a keyframe here is a whole pose, which avoids the per-property tracks that make After Effects heavy
- [x] the `Static` / `Motion` switch moved from the Inspector to the canvas, and the timeline docks at the bottom of the canvas in `Motion`
- [x] every visible object gets a track, animated or not, so a single-object scene opens with its track ready
- [x] keyframes are created on the timeline (the track's ◆+ button, at the playhead) instead of in the Inspector; the Inspector only edits the pose of the selected keyframe
- [x] keyframes store an absolute `timeMs` instead of per-segment durations plus a per-object `motionDelayMs`: dragging a marker, inserting mid-segment and shifting a track each become a change to one number, and the start delay is simply the first keyframe's time
- [x] drag a marker to retime or reorder it, drag a segment to shift the whole track, right-click a segment to pick its transition, `Delete` or right-click to remove a marker
- [x] no keyframe limit, and a single keyframe is valid (the object holds that pose)
- [x] playback starts from the playhead, the playhead follows it, and `Space` toggles it in `Motion`
- [x] transitions include a `cubic-bezier` curve editor, with overshoot

## 10. Screen recordings on device screens — done

- [x] one `useScreenTexture` hook replaces the texture code duplicated across the six models
- [x] the `Screen` section switches between `Image` and `Video`, each keeping its own file; the disabled "Video MP4 · coming soon" device option is gone
- [x] uploads accept MP4, MOV and WebM, validated by decoding the first frame
- [x] `Static` holds a chosen frame, which is what the PNG export captures; `Motion` ties the video to the playhead, and the recording is a clip on its own timeline track (its timing lives only in the timeline, not in the Inspector)
- [x] HDR recordings (PQ/HLG) are converted to SDR in a compositing pass
- [x] per-file framing: zoom 50–300%, position, background color and edge crop (a mask for borders recorded into the file)
- verify HDR in Safari: if it already tone-maps HDR video for WebGL, our conversion would apply twice
- verify on a regular browser whether starting playback stalls for a moment: in the in-app test browser the first ~0.2–1s of `requestAnimationFrame` stalls on play, with images as well as videos, so it is not caused by the video work
- HTML on screens stays out of scope until the HTML-in-Canvas API leaves Chrome's origin trial
- [x] SDR video showed washed-out colors after the compositing pass landed (#1D4ED8 rendered as #5F94ED): three decodes video sRGB in its material shaders, so the compositor now does it too — measured within 4 units of the source color

## 11. Inspector option patterns — done

- [x] option primitives in `EditorPrimitives`: `Switch` (on/off), `SegmentedTabs` (exclusive choice, always one selected) and `SubTabs` (optional groups that start closed)
- [x] the four checkboxes (device body, keyboard, screen bezel, matte finish) became switches
- [x] after an upload the screen shows one row — icon, name, `⋮` — and its options live in a floating `SidePopover` beside the Inspector: `Replace`, `Frame | Fit | Crop`, `Remove`
- [x] `Custom` colors became a sub-tab under the always-visible theme grid; the `customColorsEnabled` flag, which only toggled the panel, left the object and the templates
- [x] the recommended image size moved into the upload card
- [x] the loading notice got a fixed place below the mode toggle
- [x] contrast pass: `--sidebar-muted` (light) darkened to keep 5.1:1 on `--surface-subtle`; new tokens `--surface-subtle`, `--switch-track-off` and `--danger-fg`, the last replacing a fixed red that failed AA
- run a full contrast sweep of the interface: this pass covered the new surfaces only
- `Transform` (position, rotation, scale) could adopt `SegmentedTabs` if the section grows
