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

## 7. Give motion an output — done

- per-object keyframes shipped without any way to export the result: the animation only existed inside the editor
- [x] in `Motion` the `Export` menu has two tabs, `Image` and `Video`; the video tab lists three destinations — social and presentations (MP4 with background, 60 fps), website with no background (transparent WebM, 30 fps) and highest quality (MP4, 60 fps, 2×) —, `Customize` exposes background, frame rate and resolution (changing any of them clears the destination), and a one-line summary sits above `Export video`
- a separate dialog was tried first and felt like too much for a choice that fits in the menu the user already opened
- [x] `Save as template` became a checkbox, checked by default and remembered, and applies to image and video exports alike
- [x] frames are rendered one at a time, not recorded: each frame poses the scene at its instant, seeks every screen video to the exact frame and renders with the PNG's supersampling — a slow machine takes longer but drops nothing, and the tab can stay in the background (R3F's `advance()` drives the frame, not `requestAnimationFrame`)
- [x] encoding uses WebCodecs through `mediabunny` (MPL-2.0), loaded only on the first video export; Chrome's native encoder has no alpha, so `mediabunny` encodes the transparency as a second VP9 stream, which Chrome, Edge and Firefox play back as a transparent WebM
- [x] the video ends exactly on the final pose (the last frame is the scene's last instant), with progress and cancel in the canvas notice; the canvas is blocked meanwhile, and the file uses the scene as it was when the export started, so editing in the panels can't change it halfway
- measured: 4 s at 1080p60 in about 16 s, 1.4 MB; the result was checked with `ffprobe` (frame count, frame rate, alpha) and frame by frame against a counter video on the screen
- `MediaRecorder` was ruled out: real-time capture drops frames under load and its quality is limited
- Safari doesn't show WebM transparency yet (announced for Safari 27); its own format, HEVC with alpha, can't be encoded in Chrome — a site targeting Safari needs a still fallback for now
- the frame readback goes through the CPU (about 30 ms at 1080p with 2× supersampling); a GPU downscale would roughly halve the time per frame if exports ever feel slow
## 8. Templates do not capture motion — done

- [x] templates carry a `mode`; `Motion` templates store every keyframe (time, pose, easing and cubic-bezier curve), `Static` ones store none
- [x] each mode lists only its own templates, and each mode keeps its own scene
- [x] no schema bump: `mode` and `keyframes` are optional, so templates saved before them load as `Static` and an older cached app keeps reading the list
- [x] keyframe ids are not stored and are regenerated on every apply, since timeline selection looks them up scene-wide
- [x] switching modes or opening a template with unsaved changes asks first (`AlertDialog`)
- [x] each mode keeps its own camera too: leaving a mode parks the camera with the scene, and coming back restores it at once, with no fly-over and no "template applied" notice — before, a `Motion` scene opened from a template came back from `Static` with the static camera, framed for another aspect ratio

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
- [x] video is `Motion` only: `Static` is a still image, so its `Screen` section has no `Image | Video` choice (the `Frame` option that picked the video frame for the PNG went with it); `Motion` ties the video to the playhead, and the recording is a clip on its own timeline track (its timing lives only in the timeline, not in the Inspector)
- [x] HDR recordings (PQ/HLG) are converted to SDR in a compositing pass
- [x] per-file framing: zoom 50–300%, position, background color and edge crop (a mask for borders recorded into the file); the background color sits in both `Fit` and `Crop`, bound to one value, and resetting the crop leaves it alone
- verify HDR in Safari: if it already tone-maps HDR video for WebGL, our conversion would apply twice
- verify on a regular browser whether starting playback stalls for a moment: in the in-app test browser the first ~0.2–1s of `requestAnimationFrame` stalls on play, with images as well as videos, so it is not caused by the video work
- HTML on screens stays out of scope until the HTML-in-Canvas API leaves Chrome's origin trial
- [x] SDR video showed washed-out colors after the compositing pass landed (#1D4ED8 rendered as #5F94ED): three decodes video sRGB in its material shaders, so the compositor now does it too — measured within 4 units of the source color

## 11. Inspector option patterns — done

- [x] option primitives in `EditorPrimitives`: `Switch` (on/off), `SegmentedTabs` (exclusive choice, always one selected) and `SubTabs` (optional groups that start closed)
- [x] the four checkboxes (device body, keyboard, screen bezel, matte finish) became switches
- [x] after an upload the screen shows one row — icon, name, `⋮` — and its options live in a floating `SidePopover` beside the Inspector: `Replace`, `Fit | Crop`, `Remove`
- [x] `Custom` colors became a sub-tab under the always-visible theme grid; the `customColorsEnabled` flag, which only toggled the panel, left the object and the templates
- [x] the recommended image size moved into the upload card
- [x] the loading notice got a fixed place below the mode toggle
- [x] contrast pass: `--sidebar-muted` (light) darkened to keep 5.1:1 on `--surface-subtle`; new tokens `--surface-subtle`, `--switch-track-off` and `--danger-fg`, the last replacing a fixed red that failed AA
- run a full contrast sweep of the interface: this pass covered the new surfaces only
- `Transform` (position, rotation, scale) could adopt `SegmentedTabs` if the section grows
- [x] a `Checkbox` primitive joined them, for an extra action that rides along with another (`Save as template` when exporting) — not an on/off state of the object, which stays a `Switch`
- [x] floating panels (context menus and their submenus, the `CustomSelect` list, the timeline menus) share the Properties panel background, `--sidebar-bg`, like the screen options popover already did; hovers inside them mix with the same color, and the backdrop blur went away, since it does nothing over an opaque background
- [x] a selected toggle or tab no longer turns bold (segmented tabs, the `Static | Motion` switch, the export options): background and color mark the selection, and the label keeps its weight, so it doesn't shift width

## 12. Built-in templates — parked

A first set of templates shipped with the app (five `Static`, five `Motion`) was built and then set aside: for now the app ships none. The work is kept, unmerged, in commit `77cf33b` on the local branch `default-templates` (`git cherry-pick 77cf33b` brings it back). How it was done, for bringing it back or writing new ones:

- **Where they live:** in code (`app/lib/default-templates.ts`), never in `localStorage` — so they reach every user, can't be deleted, and aren't overwritten by `persistTemplates`. `page.tsx` keeps them out of `templates` (the persisted list) and looks templates up in both lists when applying or restoring the framing.
- **Shape:** plain `SceneTemplate`s with fixed ids (`default-<name>`), `createdAt: 0`, `camera: null` (auto-fit, which works at any window size) and no images (screens fall back to the placeholder). Names come from `copy.defaultTemplateNames`, keyed by id, so they follow the interface language.
- **Composing:** write poses in Inspector units and convert once. Position is what the panel shows (world = value × 140, Z × 420); `rotationY` is stored with +180 (the panel shows 0 for a device facing front); stay within the Inspector ranges (rotation X/Y ±45, Z ±360, scale 0.1–3) so every value can be reproduced by hand. Colors come from `DEVICE_MODELS[model].themes[theme]`, never hand-picked.
- **Proportions:** the models don't share a real-world scale — at scale 1 a phone is as tall as the notebook screen. In multi-device scenes the phone looked right at ~0.65–0.8 and the watch at ~0.7. Footprint widths in position units: phone ≈ 1.75, tablet ≈ 2.56, notebook ≈ 5.15, watch ≈ 1.14.
- **Motion framing:** auto-fit frames whatever pose is on screen. Applied at 0 ms, an entry from the side framed the start and the object left the frame at the end. The fix was opening `Motion` templates with the playhead at the end (`getSceneMotionDuration`): the final composition gets framed, an entry may start off-frame, and play restarts from 0 on its own.
- **UI:** a read-only "Built-in" group above "My templates" in the templates dock (apply only; no rename or delete), both groups sharing one scroll area so the dock doesn't double in height.
- **Tests:** five per mode, unique ids, theme colors match the models, keyframes only in `Motion`, sorted and within the Inspector ranges, and every template applies like a saved one.
- **Verify in the browser** after composing: numbers alone got the proportions and gaps wrong three times.
- Found along the way: in `Motion`, auto-fit ignored the timeline's height, so a single device ended up partly behind it — fixed by the video size (item 13), which fits the canvas above the timeline.

## 13. Video size in Motion — done

- [x] `Motion` has a video size, 1920 × 1080 by default, set from a button in the timeline header: 16:9, 1:1, 4:5 and 9:16 presets, or width and height in pixels (the ratio follows the numbers), with an aspect-ratio lock that is off by default
- [x] the canvas takes that shape between the panels, the mode toggle and the timeline, so what is composed is what the video will show — which also stops a single device from ending up behind the timeline
- [x] sides stay even and within 64–3840 px, ready for a video encoder
- [x] `Motion` templates store the size (an optional field, no schema bump), and changing it counts as an unsaved change
- `Static` has no size on purpose: a PNG is easy to crop afterwards, in Figma or any editor
- `Export` in `Motion` still produces the same PNG presets as before; the size is groundwork for the video export in item 7

## 14. Object opacity — done

- [x] objects have an opacity (0–100% in the Inspector, under `Transform` after scale, like After Effects' layer transform), and it is part of the pose: in `Motion` each keyframe carries its own, so an object fades in, out or pops in like position and scale animate
- [x] before its first keyframe an object holds that keyframe's pose — opacity included —, which is also After Effects' rule: keyframes animate values, they don't decide whether a layer exists; for an object that enters at 1 s, its first keyframe gets 0%
- [x] the fade reads as one layer, not an x-ray: translucent objects draw a depth-only pass first, so only their front surface shows; glass, translucent by nature, stays out of that pass so it doesn't hide the screen behind it
- [x] translucent objects get their own copies of the materials (clones of the same GLB share them, so fading one phone would fade its twins), kept in sync with the originals every frame and dropped back at 100%; at 0% the object is hidden, so it can't cover what is behind it
- [x] transparent objects are drawn back to front per object, so a translucent device in front doesn't hide another one behind it
- [x] templates store opacity; templates and keyframes saved before it open at 100%
- [x] the preview applies opacity together with the pose, in the same frame; applied a frame later, an object that should enter invisible flashed for one frame at the start of every play
- [x] fixed along the way: the video export counted hidden objects when placing devices, unlike the canvas, so a hidden object listed first shifted the others in the file
- [x] later (item 19): an animated object exists only from its first keyframe on, like a layer from its in point

## 15. Resizable timeline — done

- [x] a handle on the timeline's top edge changes its height, like a video editor's panel: drag it, or focus it and use the arrow keys; double-click (or `Home`) goes back to the default
- [x] from the default height (`--motion-timeline-height`, the smallest that fits the header and a track) up to half the window, so the canvas never disappears; the choice is remembered in the browser
- [x] the height lives in one token: the stage overrides it, and the timeline, the floating toolbar above it and the video frame all follow — the frame shrinks without changing its aspect ratio, so the camera needs no refit

## 16. Center in the canvas — done (replaced by #22)

- [x] `Center` sits next to `Reset` in the `Transform` header and moves the selected object to the middle of the view — the middle of the exported image or video —, keeping its distance to the camera, so it doesn't grow or shrink
- [x] "the middle" is the camera's axis, not the world origin: with the view panned or orbited, zeroing the position would leave the object off-center; the offset is measured from the object's bounding box and converted back into the position fields
- [x] in `Motion` it writes to the selected keyframe's pose, like every other `Transform` field, and it shows whenever those fields do (`Reset` stays `Static`-only)

## 17. Trim screen videos on the timeline — done

- [x] the clip's edges are trim handles: dragging the left edge cuts the start of the video and keeps the rest in place (the clip starts later by the same amount), dragging the right edge cuts the end; the middle still moves the whole clip
- [x] a clip exists only within its range, like in a video editor: before and after it the screen shows only its background color — before, it held the first and last frames, so moving a clip forward left the video frozen on screen where the clip no longer was
- [x] the file is never changed: the video keeps `trimStartMs` and `trimEndMs`, and a clip can't shrink below 100 ms nor start before zero
- [x] the same rules apply to the export, frame by frame

## 18. Video export ignored animated opacity with a screen video — fixed

- with a recording on a screen, objects meant to be hidden (opacity 0) showed up in the exported video, at the opacity of the instant parked on the timeline
- cause: each frame waits for the screen videos to seek; meanwhile React re-renders the canvas (the progress changes every frame), and React Three Fiber compares object props by reference, so the `userData={{ opacity }}` object was re-applied on every render with the parked instant's value, over the frame's own
- fix: the frame's pose is applied after the seeks, with nothing awaited between it and the render, and opacity is passed as a number (`userData-opacity`), which only re-applies when it actually changes
- checked both ways on the same scene: the old code exported the hidden object fully visible from frame 0; the fix exports 0% → 50% → 100% as animated

## 19. Objects exist from their first keyframe — done

- [x] same rule as a video clip: an animated object is out of the scene before its first keyframe, so dragging a track forward leaves the time behind it empty instead of showing the object frozen on its first pose
- [x] after the last keyframe it stays on its final pose — in a mockup the final composition is where the animation lands, and an object with a single keyframe would otherwise exist for one instant only
- [x] objects without keyframes are always there, as before
- [x] display only (`sampleDisplayedMotion`): editing still samples the held first pose, so a keyframe added before the first one is born visible, not at 0%
- an out point (an object leaving the scene before the end) would need its own handle on the track; an opacity keyframe at 0% covers it meanwhile

## 20. Timeline zoom — done

- [x] `−` / `+` in the timeline header, anchored on the playhead (it stays put on screen while the rest opens or closes around it), from the whole scene (1×) up to 40×
- [x] trackpad pinch inside the timeline, anchored under the fingers: Chrome and Edge deliver it as `wheel` with `ctrlKey`, Safari as `gesture*` events; both are caught only inside the timeline, so pinching elsewhere still zooms the page, and plain scrolling is untouched
- [x] the lanes become `zoom` times wider than the visible window, inside a horizontal scroller: keyframes, segments, clips and playhead are positioned in % of the axis, so they scale with no change to the time math
- [x] the ruler picks the finest step that keeps 80 px between marks — whole seconds without zoom, half and tenth seconds when zoomed
- [x] during playback the timeline scrolls to keep the playhead in view
- checked in the browser: three `+` clicks reach 3.4× with the playhead on the same pixel; a pinch over 1.6 s reaches 7.5× with that mark on the same pixel; the follow-the-playhead scroll was not exercised there, since playback needs a visible browser pane

## 21. Idle render loop in the canvas — fixed

- the editor felt sluggish: measured with temporary counters, the canvas (`MockupCanvas` and its `SceneBridge`) re-rendered about 740 times a second while nothing happened (1,474 renders in 2 s in `Motion`, 602 in `Static`)
- cause: callbacks handed to effects inside the scene were new functions on every render — registering the photo and video exporters, reporting that an object finished loading — so those effects re-ran on every render; each run set state in the canvas, which rendered again. The "object loaded" path also replaced the loading list with `filter`, which always returns a new array, so React saw a change even when nothing changed
- the loading-state part dates back to March (`2906568`); the video export registration added one more trigger, and the editor's growing per-render work made the loop noticeable
- fix: the callbacks are stable (`useCallback`, they only touch setters and refs), list updates return the same array when nothing changes, and the page's camera callback is stable too
- after: zero renders while idle in both modes; dragging the playhead renders in proportion to the movement (4–8 renders for a full drag)

## 22. Alignment in Transform — done

- [x] an `Alignment` group at the top of the `Transform` list replaces the `Center` button: two rails side by side, left · center · right and top · middle · bottom, one axis per button, so aligning left keeps the height already set; centering both ways is center + middle
- [x] the reference is what the person frames: the video frame in `Motion`; in `Static` the canvas runs under the panels and the floating toolbar, so the area is the part left visible between them (`.canvas-align-area`, an invisible element laid out in CSS with the same tokens as the `Motion` frame, measured on click); with the UI hidden, the whole canvas
- [x] a margin of 5% of the area's shorter side (`ALIGNMENT_MARGIN`), the same on both axes, so the device's edge and shadow don't touch the border
- [x] the edge is the object's projected silhouette (its vertices on screen), not its 3D box, which is much larger on a rotated device; the object moves parallel to the screen, keeping its distance to the camera, and a few correction steps absorb the perspective
- [x] in `Motion` it writes to the selected keyframe's pose, and shows whenever the position fields do
- an object larger than the area overflows the opposite side: alignment moves, it doesn't resize

## 23. Tooltips on the canvas toolbar — done

- [x] a `Tooltip` primitive with the look of the social icons' balloon on gabriellamas-site: inverted colors (`--button-active-bg` / `--button-active-fg`), `--radius-sm`, a small pointer, fading up into place
- [x] pure CSS, no state: it lives inside the button (`editor-tooltip-trigger`), so buttons keep their own positioning — the draggable corner toggle included —, shows on hover and `:focus-visible` after 300 ms so the toolbar doesn't flicker as the mouse passes, hides at once, on click and while dragging
- [x] `aria-hidden`, since it repeats the button's `aria-label`; the buttons dropped `title`, which would show a second, native tooltip
- [x] opens downward when the hide-UI toggle sits in a top corner; `Export` has a text label and no tooltip
- panels scroll and would clip the balloon, so icons inside them keep `title` for now; using it there needs a portal

## 24. Reset as an icon — done

- [x] `ResetButton` primitive: the rotate icon alone, no label or border, in `normal` (section headers) and `small` (sub-tab panels) sizes — `Transform` and the screen `Fit` / `Crop` panels now share it
- [x] dimmed while there is nothing to reset: in `Transform` when the object is already in the default pose (`isDefaultObjectTransform`: position, rotation, scale and opacity)
