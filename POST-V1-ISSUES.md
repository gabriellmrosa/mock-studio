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
- a separate dialog was tried first and felt like too much for a choice that fits in the menu the user already opened (later revisited: see #25)
- [x] `Save as template` became a checkbox, checked by default and remembered, and applies to image and video exports alike
- [x] frames are rendered one at a time, not recorded: each frame poses the scene at its instant, seeks every screen video to the exact frame and renders with the PNG's supersampling — a slow machine takes longer but drops nothing, and the tab can stay in the background (R3F's `advance()` drives the frame, not `requestAnimationFrame`)
- [x] encoding uses WebCodecs through `mediabunny` (MPL-2.0), loaded only on the first video export; Chrome's native encoder has no alpha, so `mediabunny` encodes the transparency as a second VP9 stream, which Chrome, Edge and Firefox play back as a transparent WebM
- [x] the video ends exactly on the final pose (the last frame is the scene's last instant), with progress and cancel shown while it renders (see #26); the scene is blocked meanwhile, and the file uses the scene as it was when the export started, so editing in the panels can't change it halfway
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
- [x] the four checkboxes (device body, keyboard, screen bezel, matte finish) became switches (matte finish later removed, #33)
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

## 25. Export as a dialog — done

- [x] `Export` opens a dialog in the middle of the screen, behind a dimmed, blurred backdrop, like the final export step of desktop creative apps: choose everything first, then export what was chosen, as it was chosen — the floating menu exported the moment a size was clicked
- [x] every choice is a select, with a label column: `Format` (Motion only: image or video, opening on video), then for an image `Size` (Full HD, QHD, 4K badges) and `Background`, for a video `Background` (MP4 or transparent WebM), `Frame rate` and `Resolution`, plus the one-line video summary
- [x] the footer holds `Save as template` on the left, `Cancel` and the single primary `Export` on the right; `Export` takes the focus, so `Enter` exports, and it is disabled while the video can't be exported (nothing animated, or the browser can't encode it)
- [x] the video destinations (social, website, highest quality) are gone: with every setting in view they only repeated it; a video now starts with background, 60 fps, 1×
- [x] a shared `Dialog` component — backdrop, title, free content, footer with `Cancel` before the actions — with `Escape` and outside clicks cancelling, `Tab` kept inside and focus returned on close; `AlertDialog` is now a `Dialog` with `role="alertdialog"`. An `Escape` already handled by an open select closes only the list
- [x] in Safari, a transparent video shows a `Callout` (a new quiet notice primitive): Safari doesn't show transparent video yet, so it suggests Chrome, Edge or Firefox; export isn't blocked. Detected by user agent (`isSafari`), since the problem is the engine that will play the file, not a feature to test
- a destination folder picker was considered and dropped: only Chrome and Edge can open a native "Save as", the other browsers always use their downloads folder
- the button stays `Export`, not `Download`: the dialog sets format, size and transparency first, as in editing tools
- the next step, a project link for Safari users, is #27

## 26. Video export progress as a dialog — done

- [x] the progress moved from a small notice over the canvas to the shared `Dialog`, behind the backdrop: the panels stayed exposed before, though editing anything mid-export would change the file
- [x] a progress bar (`--surface-subtle` track, `--button-active-bg` fill), `Frame 220 of 1,040` and the percentage, the time left (`About 2 minutes left`, in steps of 5 s under a minute) and a hint: another tab can be used meanwhile, and the file lands in the downloads folder
- [x] the estimate (`estimateRemainingMs`) comes from the pace so far, measured in the progress callback; it waits for 10 frames and 1.5 s, since the first frames include loading the encoder and the first video seeks, and reads `Finishing the file…` once every frame is done
- [x] `Dialog` gained `dismissible={false}`: `Escape` and outside clicks do nothing, so only `Cancel` stops minutes of work; cancelling still downloads nothing and shows no error
- the bar has no width transition: the page is busy rendering frames, so an animated width fell far behind the number (41% with an almost empty bar); progress already arrives every frame
- the photo export keeps its short canvas notice: it takes a moment, not minutes

## 27. Project link — done

- [x] `Copy project link` in the Safari note of the `Export` dialog: Safari doesn't show transparent video yet, and templates live in each browser's `localStorage`, so the way to export it elsewhere is to carry the scene to another browser
- [x] the link holds the scene as a template — objects, poses, keyframes and curves, camera, background, video size — as JSON, deflate-compressed and base64url-encoded after `#scene=`; the hash never reaches a server, so the scene doesn't leave the computer; a two-keyframe scene makes a 756-character link
- [x] the link format has its own version (`v: 1`), separate from the template schema, and is validated and normalized like a stored template; a cut or corrupted link shows an error instead of opening half a scene
- [x] opening it saves the scene to that browser's templates (`Project from link`), switches to its mode and applies it, then clears the hash so a reload doesn't open it again; the message reminds that screen images and videos must be uploaded again, since they don't travel in the link
- [x] Safari only allows clipboard writes during the click, and building the link is asynchronous: `copyPendingText` hands the clipboard a `ClipboardItem` whose content is a promise, reserving the write in the click; the button confirms in place, since a toast would sit behind the dialog's backdrop
- the template name and message are read after the link is decoded: read on the first render, they came out in the default language instead of the saved one
- checked in the app's browser simulating Safari's user agent; the clipboard path still needs one click in a real Safari

## 28. Keyframes cut at the timeline edges — fixed

- a keyframe at 0 s (or at the very end of the axis) showed only half its diamond: the timeline's horizontal scroller, needed for zoom, clips at its edges, and a scroller can't clip on one axis only, so removing the `overflow` wasn't an option
- fix: the scroller has `padding-inline: var(--space-3)`, room for half a diamond plus its selected outline, and the axis starts after it; clicks, drags and the playhead already measured the lanes themselves
- the zoom math (`useTimelineZoom`) now works on the axis box — where it starts and how wide it is — instead of the whole scroller: the anchor, the follow-the-playhead scroll and the ruler spacing would otherwise drift by the padding
- checked in the browser: the first keyframe sits 5 px inside the edge, two zoom-in clicks keep the playhead on the same pixel, and scrolled to the end there's room after the axis

## 29. Microsoft Clarity, with consent — done

- [x] Clarity (`@microsoft/clarity`, MIT) for heatmaps and session recordings, next to Vercel Web Analytics; the project ID is public by nature and lives in code (`app/lib/analytics.ts`), so nothing needs configuring on Vercel
- [x] consent first: a small card on the first visit (bottom left, over the objects panel footer, on the floating surface) with Accept and Decline. Clarity is lazy-loaded only after Accept, so before a choice there's no script, cookie or request, and declining never downloads it; the choice is remembered in `localStorage`. Clarity is told measuring only, no ads (`consentV2` with `ad_Storage: denied`)
- [x] only the production deployment asks and records (`NEXT_PUBLIC_VERCEL_ENV`, set by Vercel on each deploy); `localhost` and previews stay out of the data
- [x] privacy: every text is masked in recordings (`data-clarity-mask` on `<body>`, covering portaled menus and dialogs) since object, template and file names are the user's; the 3D canvas isn't captured; screen videos only exist as local `blob:` URLs
- [x] the project link promise holds: Clarity records the page URL, so the `#scene=` is taken out of it before Clarity starts — `clearSceneLinkFromUrl` removes it on the first look and keeps it for the page, whoever runs first, and `consumeSceneLinkFromUrl` hands it to the page once
- checked in the browser with a temporary server set to production: the card shows, nothing from Clarity loads before a choice, Decline hides it and survives a reload; Accept was covered by tests only, to keep `localhost` sessions out of the real project
- left out: a way to change the choice later (an entry in the preferences menu would cover LGPD's revocation), and the pre-existing `npm audit` warnings, none of them from Clarity

## 30. Camera safety lock — done

- the camera could fly off: zoom had no limits (each `Zoom out` click multiplies the distance), pan and zoom-to-cursor dragged the orbit target away from the objects, and past 100× the fitting distance everything vanished at once, cut by the camera's far plane, while still in frame
- [x] limits relative to the scene, so they hold for one phone or five devices: the ruler is the distance at which the whole scene fits on screen; zoom goes out to 8× it (the scene at about 1/8 of its fitted size) and in to 1/20 of it (close detail without passing through a device)
- [x] the orbit target stays near the objects, with a margin that follows the zoom: far away it reaches the scene's size, so panning is free; close up it shrinks to half of what the camera sees, so part of the scene always stays in frame. Half, not more: in `Static` the canvas runs under the side panels, and 0.8 left the device behind the Inspector
- [x] near and far planes cover the whole lock, so nothing is clipped inside it
- [x] limits are recomputed on every fit, at the start of every gesture and before every navigation button, from the objects' box — cheap, and it follows objects that moved; during a gesture only the margin is updated, with the box from its start
- [x] a template camera saved too far away is brought within the limit
- checked in the browser: 60 `Zoom out` clicks stop with the phone at about 1/9 of the height, 80 `Zoom in` clicks stop at its screen, the wheel toward an empty corner stays on the phone, and 150 `Pan left` clicks stop with it still in view; checked in `Static` with one device

## 31. Export button icon follows the mode — done

- [x] in `Motion` the toolbar's `Export` button shows a camcorder (`Video`, the icon already used by the screen's `Video` tab) instead of the photo camera: the icon now says what comes out by default, matching the dialog that opens on `Video` there; `Static` keeps the camera

## 32. Segmented control: solid track, pill shape, sliding indicator — done

- [x] the track used `--surface-subtle`, text color at 6% opacity, so it had no color of its own and the selected option barely stood out from it (1.21:1 in dark); it now uses a new `--segmented-track` token, solid and a step darker than the panel, "recessed": `--black-000` in dark (selected 1.55:1, unselected text 6.78:1) and `--surface-active` in light (1.29:1, 4.97:1) — `--black-800` would recess more in light but drop the unselected text to 4.25:1, below AA
- [x] track and selected option are pills (`--radius-full`), the same shape as the canvas's `Static | Motion` toggle, so exclusive choices look alike across the app
- [x] the selected background is one indicator behind the tabs that slides to the chosen one (240 ms, the same curve as the hide-UI toggle's flight), instead of jumping between tabs; its position comes from `--segmented-count` and `--segmented-index`, since the tabs share one width — no measuring; reduced motion switches instantly
- the alignment rails share the look but are action buttons, with no selection and no indicator
- if the side panel gets darker later, `--segmented-track` has to follow, or the track and panel converge (`--black-000` is the darkest step of the scale)

## 33. "Matte finish" removed — done

- measured by toggling it with the camera still and diffing the canvas pixels (the instrument checked first against a color change, 101k pixels): 0 pixels changed on Smartphone, Smartphone 2, Notebook and Tablet, even in red; about 6k on Smartphone 3 (buttons and cameras) and 148k on the watch, a slightly stronger edge highlight
- cause: the switch traded a Lambert material for a Phong one, and Phong's shine needs a direct light — the scene is lit only by the studio environment, so both rendered the same; the watch uses a physical material whose roughness does react to the environment
- [x] removed instead of made to work everywhere: every device keeps the matte look it already had by default, so nothing changes on screen; the field left the scene object and templates, and templates saved with it still open (the field is ignored, with a test)
- making it real would mean moving every device to physical materials and re-tuning each model's colors — a bigger change than the option was worth

## 34. The Static | Motion toggle slides too — done

- [x] the canvas's mode toggle was its own markup with a background that jumped between tabs; it is now a `SegmentedTabs` with a canvas look (floating surface, border and shadow, the selected option in the primary action color), so it gets the same sliding indicator and the arrow, Home and End keys
- [x] `SegmentedTabs` takes a `className` for such looks, and the track padding the indicator counts on is a variable (`--segmented-padding`: 2px in panels, 3px on the canvas)
- [x] the indicator needs equal tabs, so on the canvas both take the width of the widest (`Static` got slightly wider than its label); the toggle now has an accessible name, `Scene mode`

## 35. Switching modes without a cut — done

- switching `Static` ↔ `Motion` showed a hard cut: for a few frames the canvas had its new shape but the old drawing — stretched, then the camera jumping to the other mode's framing. Nothing was loading: both modes share the canvas and the already loaded objects
- a loading curtain and a fade-in of the objects were tried first and dropped: the user wanted the final canvas on the very first frame, with no visible loading at all
- [x] in a layout effect, after the DOM takes the new shape and before the browser paints, the canvas is resized, the 3D scene is made to apply the destination objects (R3F's `flushSync` — the scene has its own update queue), the camera goes to the destination pose (the mode's parked pose, or the same auto-fit the following effect would apply) and one frame is rendered; when the auto-fit runs, the camera is already where it would put it
- checked frame by frame against the settled frame, both directions and with the device in a different place in each mode: no frame after the click differs from the final one (the instrument checked against the frame before the click, about 1k blocks apart)
- [x] found on the way, a camera-lock bug from #30: the orbit margin was measured by the visible height only, so on a wide screen an object aligned to the edge — still in view — pulled the camera toward it on the next gesture or mode switch. It is now measured per axis, by the visible width horizontally and the height vertically, scaled by the visible area (between the panels in `Static`, the whole frame in `Motion`); `ORBIT_MARGIN_SHARE` went from 0.5 of the height to 0.7 of each
- objects that really are loading in the other mode (a template with another device, after a reload) still show the usual small loading notice

## 36. Screen position measured in the image's size — done

- the screen's X/Y position was a fraction of the overflow (how much the image passes the screen): ±100% touched the image edge to the screen edge. On an axis with no overflow it did nothing — a square image on the watch's taller screen couldn't move vertically, even at 400% — and below 100% zoom the direction flipped
- pixels were considered and dropped: the screen has no fixed pixel size (it changes with the camera and the export resolution), and pixels of the recommended screen size would mean a different effect on each device
- [x] the position is now a fraction of the image's on-screen size, zoom included: 50% moves it half its width or height, ±100% takes it fully off the screen and the gap shows the background color; positive is right and up at any zoom. The range went back to ±100% (briefly ±200% and ±400% under the old unit)
- framing lives with the screen file and isn't saved in templates or project links, so nothing saved needed migrating
- checked on the watch with a square image: `Y` at 30% lifts it and shows the background below

## 37. Floating panels can be dragged — done

- [x] the `SidePopover` (the screen's image and video options) is dragged by its top bar, like a window, anywhere on screen — over the side panels too — when it covers the part of the scene being adjusted; the close button still just closes
- [x] once dropped it stays there instead of following the item that opened it, always whole inside the window so its bar can be grabbed again, also when the window shrinks; reopened, it goes back beside the item
- the centered dialogs (`Export`, confirmations, progress) stay fixed: they are decisions behind a backdrop, not panels used next to the scene
- left out: moving it with the keyboard, and remembering the dropped position between openings

## 38. README refresh — done

- [x] rewritten after the best-rated open source READMEs (awesome-readme, Excalidraw, tldraw): hero image, one-line pitch, a link to the live editor, features grouped by task (Compose, Animate, Export, Keep and share) with the full list folded into a `<details>`, a quick start with a command table, how it works, privacy, contributing; the model catalog, project structure and model checklist kept
- [x] new hero image: a Retina screenshot of the editor, scaled to 2560 × 1380, with the rounded corners and the 1px border drawn into the PNG — GitHub strips `style` from README HTML, so CSS can't round it
- [x] `public/temp/` (local test images) left git: committed by mistake, it also shipped with the deploy, since everything in `public/` is served

## 39. Unreadable images no longer break the editor — done

- uploading a HEIC photo in Chrome took the whole app down ("This page couldn't load"): any file was read into a data URL and only failed inside the 3D canvas, where the texture loader threw with nothing to catch it
- [x] an image is accepted only after the browser decodes it, through an `<img>` like the texture loader (`probeImageFile`, next to the video's `probeVideoFile`); if it can't, nothing changes on screen and a note asks for PNG, JPEG or WebP, mentioning that HEIC opens only in Safari
- a fixed list of formats was considered and dropped: the extension and file type come from the system and prove nothing, `accept` is only a hint to the picker, and a list would refuse HEIC even in Safari, which shows it; decoding follows each browser, AVIF included
- left out: converting HEIC in the app (a ~1 MB library), and a safety net around the 3D screen — images only enter through the upload, which is now checked
- checked in Chrome: a HEIC shows the note and the editor keeps working, a PNG right after goes in normally; not checked in a real Safari

## 40. Duo, a foldable that opens and closes — done

- [x] a new device, `Duo`: a book-style foldable from a real model ("iPhone Duo 3D Model" by PikkmeStudios, CC BY 4.0, credited in `Credits`), like the other devices. A first version drawn in code was dropped for it: it worked, but the other devices are faithful models and this one should be too
- the source GLB has four copies of the phone in different poses. `scripts/extract-iphone-duo.mjs` keeps the flat, open one, gives it the app's axes, groups the two halves and the spine under one node, and drops the bendable inner screen with its bones and the lens glass's transmission (an extra render pass of the whole scene for a barely visible effect); 8.2 MB became 4.9 MB. The script has no dependencies — `@gltf-transform`, which the older scripts import, isn't installed
- [x] `Opening` in `Transform`, 180° to 0°. It is pose: `Static` keeps one, each `Motion` keyframe its own, and the phone opens or closes between keyframes, in the preview and in the exported video. Templates keep it, only for foldables; older templates and keyframes open as before
- [x] the base stays still and the cover closes over it, so the closed phone shows its outer screen instead of turning sideways; the model slides toward the hinge as it closes, to keep rotating and aligning around its visual center
- [x] two screens: `Inner screen` (image, or video in `Motion`) across both halves, and `Outer screen` (image) on the back of the cover, each with its own file, framing and options panel. The front camera's hole is drawn on the outer screen
- the inner screen is two flat halves, not the curved fold of the source file: the crease is a line. Driving the file's bones would bring the curve back, at the cost of a skinned mesh per phone
- [x] themes `Star White` (the file's colors) and `Night Sky`, plus custom colors for body, frame, frame highlights and logo
- [x] `Matte finish`, a switch only the Duo has, on by default so it enters the scene looking like the other devices; off, it shows the file's polished titanium frame and lens rings. It is the option removed in #33 coming back where it is real: there it changed nothing on most devices, whose materials ignore the scene's environment, while the Duo's are physical (the frame is 97% metal at 0.22 roughness). Matte clamps roughness up and metalness down, the watch shell's recipe; templates keep it for the Duo only, and it is not the old `matteColors` field, which stays ignored
- checked in the browser: open, half folded and closed, both screens with images, both themes, matte against polished, and the opening animated between two keyframes; not checked: the exported video file, and a template round trip in the UI (covered by tests)
- left for later: foldables from other brands, which would reuse the fold and the two screens

## 41. Empty states as rows: screen upload and device color — done

- the empty screen was a big dashed card and the device color an always-open grid of cards, while a screen with a file was already a compact row with a `⋮`. They now look like one family
- [x] a screen with no file is the same row as one with a file — icon, `Add image` / `Add video` and the `⋮` — and its panel holds the dashed upload card with the ideal size (or the video formats). The size was on the row at first, where the `⋮` goes; it moved into the panel to keep the `⋮` on every row. Applies to the image, the video and the Duo's outer screen
- [x] a row whose only action is opening a panel is clickable as a whole: the screen file row, the empty one and the color row (one component, `ScreenFileRow`). The `⋮` stays as the cue and the keyboard path. The objects list row keeps separate targets: it has the eye and the `⋮`
- [x] the device color is a row with the chosen color's swatch and name, already selected with the default; its `⋮` opens the existing `SidePopover` with the theme cards and the per-part `Custom` sub-tab. When a part was painted by hand the row reads `Custom` with the body color, since the theme name would no longer be true
- [x] the Duo went from two colors to eight: Star White and Night Sky first, then Black, Gray, Blue, Green, Red and Pink, the last six built from a body and a frame color with the polished highlights derived from the frame
- checked in the browser on the Duo: both empty rows, the color panel, a theme change, the `Custom` state after editing a part, and the whole-row click (open, click inside the panel, close, and the `⋮` opening once); not checked: an actual upload through the panel (the input and handler are the same as before; the tests cover them), the light UI theme, and the other devices' color rows
- open for refinement: the first upload now takes two clicks (row, then the upload area) — the alternative is the row opening the file picker directly, with the `⋮` showing the size; and whether `Custom` should open already expanded

## 42. Duo: screen corners from the model, and every part editable — done

- the black bezel and the inner screen didn't follow the frame's outline at the corners. The cause was ours, not the file's: the model's corners aren't circular arcs — they're flattened, with different extents along the width and the height — and the planes we draw over the frame used a quadratic curve with a smaller radius (bezel 0.05 and screen 0.04 against the file's ~0.058 and ~0.047, with the frame's own outer corner at ~0.065)
- [x] the profiles are now the model's own, measured on its meshes (the flat copy of its foldable screen: `screen` for the display, `black` for the bezel) and stored as short point tables in `Duo.tsx`, mirrored to each corner; the hinge side stays square. The outer screen was already right (a true 0.044 circle, checked) and keeps its arc
- [x] every material of the file is an editable part, so the whole phone can be repainted: `body` (back glass, camera plateau), `frame` (titanium side, hinge, buttons), `frameHighlight`, new `grooves` (the dark lines around the phone, an unlit material), `logo`, new `bezel` (the black ring of both screens, the front camera hole and the bezel planes we draw) and new `lens` (a tint over the camera image; its glow follows the color, or black would stay grey). Set to #000000 on all seven the phone is black everywhere
- the Duo's own theme colors fill any part a saved object lacks, so objects from before the new parts still open
- the color part labelled `Screen bezel` / `Moldura da tela` is now `Bezel` / `Moldura`: the longer one was cut off in the panel, and the key is shared with the Tablet, whose bezel switch keeps its own, longer text
- checked in the browser: the corner at 2×, the seven rows in the panel, all set to black, from the back; not checked: the polished finish with the new parts, and the light UI theme

## 43. Duo and watch: finish inside the appearance panel, plain highlights, icon, closed front — done

- [x] `Matte finish` moved from the device block into the appearance panel, next to the colors it affects, and the smartwatch has it too (`MODELS_WITH_FINISH`: Duo and watch). The watch shell was always matte; polished leaves its material as the file authored it. Templates keep it for those two models; the rest are unchanged
- [x] the Duo's `Highlights` (the polished lines of the frame) start in the frame's own color in every theme, instead of a lightened one; they stay editable on their own
- [x] a Duo icon in the device list: lucide has none (`fold-horizontal` is arrows, `columns-2` a layout) and Material Symbols' `devices_fold` is another family, with different stroke and corners. It is drawn in lucide's grid and stroke through `createLucideIcon` (`FoldableIcon`: a wide screen, the hinge, a camera dot), so it takes `size` and `strokeWidth` like the others
- the closed front looked wrong next to the model's own viewer on Sketchfab, and the cause was ours: the outer screen plane had its corners drawn with a quadratic curve, which looks like a round corner but is squarer (at the middle of the corner it sits at 0.25 of the radius from the sharp corner, a circle at 0.293). The black ring around the screen comes from the file with a constant thickness (0.0062 on the straight edges, 0.0058 at the corner); our plane, with the same 0.044 radius, stuck out over it at the corners, so the ring thinned there — measured on the user's own screenshot, 42 px on the straight edges and 16 px along the corner's diagonal, 38%. Same ratio frame rim to ring (1:1) as the file, so the straight edges were right
- [x] the one real difference was the front camera: ours was a round hole, bigger and closer to the corner. In the file it isn't geometry at all — the outer screen's sample wallpaper has a vertical pill painted on it — so it is now a pill of that proportion, smaller, placed by eye

- [x] the shape builder (`getRoundedShape`, now in `app/lib/duo-shapes.ts`) draws true circular arcs; with the test that pins the corner point of the arc. Checked in the browser with each part painted a different color: the ring is uniform around the corner
- not built: a floating calibration panel for the radius. The cause is fixed, so there is nothing left to tune by hand; if one is wanted later, `leva` is still a dependency (it drove the old notebook and tablet calibration, removed in `2906568` and `e6ac8cd`) and the corner constants are all at the top of `Duo.tsx`

## 44. Video on both of the Duo's screens — done

- the Duo's outer screen took only an image: video was a property of the object, one per object, and the canvas controller, the video export and the timeline all assumed that
- [x] the outer screen has its own source (`Image | Video`), video and framing, the same as the main one; `getActiveScreenVideos` lists one entry per screen, each under its own registry key (`getScreenVideoKey`), and the three consumers loop over it instead of reading one video. The main screen's key is still the object id
- [x] the Inspector's screen section is one component per screen (`ScreenControls`), used twice on the Duo: title, `Image | Video` (only in `Motion`) and the file row, each screen with its own choice — there is no longer one switch above both. Static shows no choice, since both screens are images there
- [x] the timeline gets one video track per screen, labelled by screen (`Inner screen`, `Outer screen`) on the Duo and `Video` elsewhere; each clip moves and trims on its own (`onChangeVideo` now takes the screen), and the scene's end is the last of all clips
- [x] the Duo's two screen groups are separated by `--space-4` above the second title (16px), against the 4px between a title and its controls and the ~8px inside a group — the space between groups has to exceed the space within them (proximity), or the controls of one screen read as the other's. The title is a `<span>`, so it is made a block for the margin to count, with `--space-1` below to keep the 4px it had
- [x] templates and links still don't carry videos, so nothing saved changes; objects from before the new fields are not a case (the Duo is unreleased)
- checked in the browser with a different test video on each screen: both load into their own element, two tracks appear, the closed phone plays the outer video and shows only the background after that clip ends (3.5 s of a 3 s clip) while the inner one keeps its own length; and the exported MP4 (1920 × 1080, 60 fps, 241 frames, 4.0 s) shows the same at 1.5 s and 3.5 s. Not checked: the two clips overlapping with the phone folding between keyframes, a transparent WebM, and HEVC recordings on the outer screen

## 45. Startup: only the first model preloads — done

- the app felt slower; measured before guessing, with the method of #21: React renders while idle are zero (Static, Motion, every device); a slider drag renders in proportion to the movement (2 per step with Strict Mode, the same for the Duo and the smartphone); the canvas holds 60 fps on every device and the Duo's idle cost is the notebook's (38 draw calls a frame against 45, ~7.7% of a core against ~8%), so the Duo didn't slow the editor down
- cause found elsewhere: every model component called `useGLTF.preload` at module level, and the catalog imports them all, so the page began downloading five files at once — the one on screen (4 MB) competing with 47 MB nobody asked for yet. Time until the scene is ready, cache off: 6.3 s at 20 Mbps and 2.8 s at 50 Mbps; with only the first model preloaded, 2.6 s and 1.5 s. It dates from the extra models, and the Duo's 4.9 MB made it worse
- [x] only the opening model (`apple_iphone_14_pro_orange`, loaded by its own component) is preloaded; the Duo, the watch, the notebook and Smartphone 3 are warmed by `warmUpModels` once the scene is settled — fetched one at a time when the browser is idle, filling the HTTP cache without decoding anything, since decoding 20 MB on a busy thread would stutter. Checked: the opening model finishes at 0.1 s, the others follow one by one from 0.9 s, and switching to each afterwards takes ~0.4 s with no console errors
- [x] the video controller returns before building its per-frame list when no screen chose video, which is the common case: it ran at 60 fps and allocated an array every frame
- not done, worth knowing: the Duo's GLB embeds a 2000 × 2000 PNG (3.5 MB) that only the lenses use, ~21 MB of GPU memory with mipmaps — halving it would be cheap but needs an image library in the preparation script, which is dependency-free by design; the preload of Smartphone 3 (22 MB) is the largest single file and a candidate for compression (Draco or meshopt, both already in `node_modules`) if the first visit to it feels slow

## 46. The device as a row — done

- [x] the device block was a `CustomSelect` with up to three switches under it, while the screen and the color were already rows with a `⋮`. It is now the same row: the model's icon and name, the whole row opening a floating panel (`ScreenFileRow` + `SidePopover`)
- [x] the panel holds the list of devices — a `radiogroup`, each model a `radio` marked by background and color — and below it the body switches: `Device body` for all, `Keyboard` on the notebook, `Screen bezel` on the tablet. It stays open after choosing a model, so devices can be compared in the scene, and the switches follow the chosen model
- [x] the screen bezel switch of the tablet is on the Duo too. The Duo has two bezels: the black ring around the outer screen, from the file (the `black` material), and the black plane we draw around each half of the inner screen. Both hide with the switch, leaving the titanium rim around the screen; both were already one color part, `Bezel`, so their color needed nothing new. The camera pill is not bezel and stays. Checked in the browser open and closed
- the Inspector's top section is now three rows of one family (device, screen, appearance), which also drops its use of `CustomSelect`
- checked in the browser: the row, the panel with seven devices, switching to the notebook (the panel stays open, the row reads Notebook, the `Keyboard` switch appears); not checked: keyboard navigation inside the list (it is plain buttons with `radio` roles, without arrow-key movement) and the light UI theme


## 47. The editor opens on smaller windows — done

- feedback from a user on a 1366 × 768 Linux desktop: "Desktop only" appeared, with a 1280 × 800 minimum. The limit is measured on the browser's usable area (`innerHeight`), not on the screen: tabs, address bar and the system panel take ~90–120 px, so a 1366 × 768 screen leaves ~650 px and could never reach 800
- [x] the limit is now 1200 × 520, set where the interface really stops being practical, found by turning the blocker off and looking at the editor at 1280 × 600, 1280 × 500, 1024 × 640, 900 × 640 and, in Motion, 1200 × 520 and 1200 × 600:
  - width: at 1024 the stage is 416 px wide and the floating toolbar (543 px) is cut off; at 1200 it fits whole, with ~590 px of stage between the panels
  - height: at 520 Motion still holds the frame (~220 px tall), the toolbar and the timeline together; the side panels scroll
- the limit lives in two places that have to move together: the media query in `globals.css` and `MIN_DESKTOP_WIDTH/HEIGHT` in `page.tsx` (only the notice's text). Checked in the browser: 1200 × 520 opens the editor, 1199 × 600 and 1300 × 519 show the notice, which now reads "1200 x 520 px"
- not checked: the Static panel with many objects at 520 px, the Export dialog at 520 px, Firefox and Safari
