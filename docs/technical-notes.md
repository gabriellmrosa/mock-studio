# Technical notes

How Mock Studio works under the hood, and what was learned building it: the
reasoning behind the code, for anyone changing it. The working rules derived
from these notes live in [AGENTS.md](../AGENTS.md); the history of each
decision is in [POST-V1-ISSUES.md](../POST-V1-ISSUES.md).

## Notes

- every model gets its screen texture from one hook, `useScreenTexture`, and the source never reaches the model's material directly: a compositing pass draws it into a render target shaped like the screen (8-bit sRGB, mipmapped), applying the cover crop, framing, background and HDR conversion in one place — images are recomposed only when something changes, videos every frame
- edge crop is a mask, not a re-fit: scale and position come from the whole file and the cropped bands show the background; recomputing the cover crop on what remained made cropping look like zooming
- HDR recordings come as HEVC 10-bit, BT.2020 and PQ with 100-nit SDR content inside; Chrome hands WebGL the raw PQ signal (white shows as ~50% gray), and its 2D canvas path converts with a 203-nit reference white (white still ~72%), so the conversion is ours, with white at 100 nits — detected through `VideoFrame.colorSpace`, and measured to match an SDR reference within one 8-bit step
- nested object fields (framing, video data) are updated from the current state (`updateSceneObject(id, object => patch)`): building them from the render-time `selectedObject` let two quick edits overwrite each other
- screen videos are kept as blob URLs, never base64, and like images they stay out of templates; an upload is accepted only after the browser decodes its first frame, because `canPlayType` is unreliable (Chrome on macOS answers "" for HEVC and plays it anyway)
- the video element lives in the document, invisible: a detached `<video>` presents no frames, since Chrome pauses video-only background media and the `VideoTexture` freezes
- video time belongs to a `ScreenVideoController` inside the canvas that, every frame, pins each video to the playhead (paused) or the scene clock (playing), seeking during playback only when it drifts past 0.12s; a clip exists only within its range on the timeline, like in a video editor: outside it the screen compositor draws only the background (an empty content area), and the scene duration includes the latest clip end; trimming changes which part of the file plays (`trimStartMs` / `trimEndMs`), never the file
- editor chrome is not selectable text (`user-select: none` on the shell and its portaled menus), with inputs, editable fields and error notes opted back in
- the Inspector has three option primitives in `EditorPrimitives`: `Switch` for true on/off options (`role="switch"` inside a `<label>`), `SegmentedTabs` for exclusive choices where one is always selected (`Image | Video` in `Motion`, and `Fit | Crop` in the screen panel) and `SubTabs` for optional groups that start closed and toggle open (`Custom` colors); a `Checkbox` covers an extra action that rides along with another (`Save as template` when exporting)
- floating panels — context menus, submenus, the model list, the timeline menus and the screen options popover — all sit on `--sidebar-bg`, the same surface as the side panels; a selected toggle or tab is marked by background and color only, never by a bolder label
- `SidePopover` is the floating settings panel: portaled, placed left of the Inspector and aligned to the item that opened it, following scroll and resize; it closes on Escape, an outside click or its close button, and returns focus to the trigger
- menu triggers (`⋮`) and close buttons are quiet icon buttons — no background on hover or while their menu is open (`context-menu-trigger-quiet`, `editor-icon-button-no-hover-bg`); the base `IconButton` keeps its hover background
- the loading notice has one fixed place, just below the `Static` / `Motion` toggle (`--canvas-notice-top`, derived from the toggle's size tokens), so it never covers the toggle and does not move when the UI is hidden
- contrast is measured, not eyeballed: secondary text (`--sidebar-muted`) keeps at least 5.1:1 on the lightest surface it sits on (`--surface-subtle`) in both themes, the switch's off track holds 3:1 (`--switch-track-off`, WCAG 1.4.11) and destructive actions use `--danger-fg` (5.1:1 dark, 6.2:1 light) — the old fixed `#f87171` failed AA in both themes
- SDR video is decoded from sRGB in the compositing shader: three never gives video textures a hardware sRGB format and decodes them in the material shader instead, so a custom pass that skips it shows the video washed out
- screen placeholders are generated at runtime on a canvas (checker pattern + recommended size in the UI body font), one per model — there are no static placeholder PNGs to maintain
- placeholder text size is a fraction of the image height so it reads at a consistent visual size across models; `smartwatch` and `notebook` use a larger fraction because their screen is a smaller part of the framed device
- new objects spawn after the rightmost object on the default plane, even when models differ
- duplicated objects also reuse the anti-overlap spawn logic on the same plane
- the `Export` dialog is built on the shared `Dialog` component (also behind the `AlertDialog` confirmations): every choice is a `CustomSelect`, and the background and size choices are remembered via `localStorage`
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
- `Static` and `Motion` are independent: the object's transform is the static pose and only `Static` writes to it, while each keyframe carries its own transform and only `Motion` writes to those; a keyframe is born with the pose shown at the playhead and then lives its own life
- each mode keeps its own scene and camera: leaving a mode parks both, and coming back restores the camera at once, through the same pending-pose path a template uses (minus the blocking overlay and the notice)
- each environment owns a scene; the inactive one is parked in `page.tsx` with its selection, background and unsaved-changes baseline. The first `Motion` scene reuses the static object ids on purpose, so switching never reloads models or re-fits the camera
- "unsaved" means the scene differs from what the current mode's template would store, compared through a snapshot that leaves out the camera and uploaded images
- in `Motion` the canvas shows the scene at the playhead instant — a display override, so looking at a keyframe never mutates the object
- playback writes straight to the 3D group through `useFrame` instead of going through React state, which would re-render the tree 60 times per second, and it reuses the same position resolution as the static render so the preview cannot drift from the resting view
- keyframes store an absolute `timeMs` rather than per-segment durations: dragging, inserting mid-segment and shifting a track are each a change to one number, and an object's start delay is simply its first keyframe's time; the scene duration is the latest keyframe and it drives playback
- in `Motion` the `<Canvas>` itself takes the video's aspect ratio, sized in CSS with container units (the largest box of that ratio between the panels, the mode toggle and the timeline), instead of a mask drawn over a full-stage canvas: the camera, the auto-fit and `Fit scene` then frame the final shot with no special cases; the wrapper stays the same element in both modes, since changing the structure would remount the canvas and reload every model
- a video side is kept even and within 64–3840 px, because H.264 at 4:2:0 rejects odd dimensions; a new size refits the scene, syncing the camera aspect from the container first, since the renderer only catches up on its next measure
- opacity fades a device as one layer: a translucent object draws a depth-only pass first (glass excluded, or it would hide the screen), works on its own copies of the materials because GLB clones share them, and transparent objects are ordered back to front per object through the groups' `renderOrder`
- video export renders frame by frame instead of recording: each frame poses the scene at its instant (the same function the preview uses), seeks every screen video to the exact frame and waits for `seeked`, then drives one R3F frame with `advance()` so the screen compositor redraws — no `requestAnimationFrame`, which freezes in a background tab — and renders with the PNG's supersampling; the editor's video controller stands down meanwhile and the scene returns to the playhead afterwards
- encoding goes through WebCodecs with `mediabunny`, imported dynamically so the app doesn't ship it until the first video export; Chrome's encoder rejects alpha, and `mediabunny` still writes transparent WebM by encoding the alpha as a second VP9 stream
- the easing presets use power-of-two curves, indistinguishable from the CSS ones in motion and cheap per frame; the `cubic-bezier` option solves the curve the way browsers do (Newton's method with a bisection fallback), with y free in `[-0.5, 1.5]` for overshoot
- there is no keyframe limit, a single keyframe simply holds its pose, and the camera is never animated — it stays a viewing tool, which keeps the auto-fit, `Fit scene` and template poses free of precedence rules
- templates stay on schema version 1: `mode` and `keyframes` are optional fields, so templates saved before them load as static, and an older cached copy of the app (PWA) still reads the list instead of discarding it and overwriting it on the next save
- `Space` is reserved for playback: it never activates buttons or list items in either mode (`Enter` does), so it cannot double as "click the focused ◆+"
- range and number inputs carry an `aria-label` and show a `:focus-visible` ring, so keyboard focus is visible without drawing an outline on mouse clicks
- `Credits` in the UI contains attribution for the third-party 3D assets used by the project

## Learned lessons

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
- a custom shader that samples a `VideoTexture` must decode sRGB itself — three's built-in materials do it behind a `DECODE_VIDEO_TEXTURE` define, so the gap only shows once video goes through your own pass; measure a known color end to end after any change to the texture pipeline
- Turbopack in dev can keep serving an old `globals.css` after an edit, even across restarts, and a new token then resolves to nothing; check the served `root-of-the-server` chunk and nudge the file with a second change
