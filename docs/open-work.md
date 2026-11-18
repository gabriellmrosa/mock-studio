# Open work

What is not in any commit because it was never merged, or was never fixed.
Everything that *was* done and decided lives in the commit messages: use
`git log` and `git blame` (`git log -S <text>` finds when a line appeared).
The old per-decision notes, up to item 47, are in the history:
`git show 7bd8536:POST-V1-ISSUES.md`.

## Duplicate object names

- adding two objects in fast succession produces two objects named `Object 2`
- the spawn position uses a functional state updater, but the name is derived from a stale `sceneObjects.length`
- derive the name inside the same functional updater that appends the object
- also seen: `Object ${sceneObjects.length + 1}` repeats a name after an object is deleted, not only when adding fast (`app/page.tsx`)

## Built-in templates (parked)

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

## Camera: what is left

The camera row, its fields and its keyframes work (Photo and Video, preview, play,
export, templates and links). Known gaps:

- No presets of one click (spin 360°, push in, reveal) and no "follow an object":
  the target is a point, not an object.
- No roll, depth of field or motion blur.
- Distance and target stay inside the limits of the scene (`applyCameraLimits`),
  so a keyframe too far or too wide is clamped, with no warning.
- The Photo mode keeps the gesture limits of the angles (about ±48° horizontal and
  ±32° vertical); only a camera with keyframes lifts them, and the free look in
  Video mode lifts them with it.
- Seen in the browser: the fields in Photo, two keyframes in Video, a video export
  that orbits the device, and a template that brings the keyframes back. Not
  checked: the play of the preview over a long scene, orbiting by hand and then
  capturing a keyframe, an idle render count with an animated camera, Safari and
  Firefox.

## Image objects: what is left

PNG, SVG, GIF, stickers and animated stickers work (create, send the file, move,
animate, templates, links, PNG and video export). Known gaps:

- The scene length does not come from an animation: an animated image with no
  keyframes plays in Video mode but a keyframe is what gives the scene its
  duration (the length of the animation is only known once it has loaded).
- An animated sticker or GIF in Photo mode shows one frame (the fullest of the
  Lottie, the first of the GIF), with no way to choose which.
- GIF: at most 300 frames, each kept in memory at up to 512 px; it needs
  `ImageDecoder` (Chrome, Edge, recent Safari and Firefox). Without it the file
  opens as a still image.
- Animated stickers are the 46 of ~880 Noto Animated that were picked; the ones
  with Lottie effects or expressions are not supported by the light player.
- The SVG is drawn once at the maximum texture size (2048) and not drawn again
  when zoomed in, so a very large enlargement of a vector blurs.
- An uploaded file is not saved anywhere: opening a template or a link brings
  back the white empty circle, and the file has to be sent again (a sticker does
  come back, it belongs to the app).
- The sticker grid has ~320 of the ~1,600 Fluent Emoji (no skin tones, no
  religious symbols, weapons or alcohol).
- The animation was seen in a video export and in the editor, but its cost per
  frame (with the outline redrawn every frame) was not measured, nor several
  animated stickers at once.
- Not checked: Safari and Firefox, an SVG with no `viewBox`, `width` or `height`,
  selecting an image by double-clicking it on the canvas.

## Text in the scene: what is left

Text objects work (create, edit, move, animate, templates, links, PNG and video
export). Known gaps:

- Latin alphabet only. Other letters (Cyrillic, Greek, Latin Extended, CJK,
  emoji) show as "?" because the fonts shipped are the latin subset and the app
  never asks a CDN for a fallback. More coverage means more font files in
  `public/fonts/` (and their entries in `text-fonts.ts`).
- No inline editing on the canvas: the text is edited in the Inspector.
- No outline, shadow or curve (troika supports all three), no letter-by-letter
  animation, and no attaching a text to a device so it follows it.
- Only color and letter spacing animate per keyframe. Size, weight, width and
  font would jump instead of gliding (and re-wrap the lines); weight only glides
  with a variable font.
- The exported video with a text animating color and letter spacing was checked
  with ffprobe and frames (MP4, 2.1 s, 124 frames at 60 fps): white and tight at
  the start, blended halfway, red and spaced at the end.
- Browsers: checked in Chrome only.
