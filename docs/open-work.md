# Open work

What is not in any commit because it was never merged, or was never fixed.
Everything that *was* done and decided lives in the commit messages: use
`git log` and `git blame` (`git log -S <text>` finds when a line appeared).
The old per-decision notes, up to item 47, are in the history:
`git show 7bd8536:POST-V1-ISSUES.md`.

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

## Duo fold blur: what is left

The screens blur and darken with the hinge angle (see `duo-fold-effect.ts`). Tuned
against eight screenshots of a real opening video and then a 20 s clip of it
(frames cut with ffmpeg), in Chrome only. The clip shows the image staying on the
panel and foreshortening with it, so it is not a flat image behind the halves; what
the panel does show is the dark entering from the free edge.

- The inner half that turns is a bit darker than the half that stays, so a thin
  vertical seam shows at the hinge; in the real phone the transition is softer
  and reaches a little into the still half.
- Only the opening was compared; closing is assumed to be the same thing in
  reverse.
- The outer screen comes back sharp and bright when the phone is fully open (so
  views from behind don't change); the real phone would have it off.
- The blur was checked on still images, not on a video playing on the screen,
  and its cost per frame was not measured.
- Not checked: Safari and Firefox.

## Import template: what is left

`Import template` (templates section → `Modal` with the explanation and a field to
paste the code) saves the pasted code (or a whole link) as a template of its own mode, without
opening it or switching modes. Checked in Chrome only, with a bad text and with a
real link.

- An imported template keeps the name that came in the link, so it can end up
  with the same name as one already in the list ("Template 1" twice); it is not
  renamed on import.
- A pasted code that a messaging app cut short fails with the same "incomplete or
  corrupted" message as any other bad code; there is no hint that it was cut.
- The pasted text is not read back from the real clipboard in the test, only
  typed into the field.


## Video export: the seek timeout — cause not confirmed

A user export of a 23 s scene (template "Modo Seguro": one HEVC screen recording,
810×1632, variable frame rate, plus image screens on two iPhones and the Duo) failed
once with `O vídeo da tela não respondeu ao seek.` — `seekVideo` in
`app/components/MockupCanvas/export-video.ts` gives each seek 5 s
(`SEEK_TIMEOUT_MS`) before failing the whole export. It was the first export of
the page session, right after importing the template and sending the files.

Tried, all exported fine (1381 frames, average seek about 20 ms):

- the page idle for 3 minutes before exporting (built-in browser);
- the same template with the same files, exported right after sending them, twice
  (the user's Chrome 157), and a simpler scene.

Measured: the **first** seek after sending the video took 2.4 s (the hardware HEVC
decoder starting); every other seek took about 20 ms. A busy machine could push
that first seek past 5 s.

Not tested yet: the tab **hidden** during the export. The export dialog says the
user can switch tabs, and Chrome suspends muted video in hidden tabs; neither the
built-in browser nor the extension can hide the tab, so this needs the user to
switch away by hand.

Fixed without knowing which cause it was: `seekVideo` (`app/lib/video-seek.ts`)
now tries 3 times with the page visible, and with the page hidden it waits for the
page to come back without spending an attempt. Still open: if the error shows up
again, find out whether the page was hidden at the time; and the error the user
sees is still the generic "Couldn't export the video."

## Music: what is left

The music works end to end: the `Music` object, its clip with waveform (move,
trim, fade ramps), volume and fades, mute, playback in sync with the scene, the
automatic half-second fade where the scene ends, templates and links (without
the file), undo, and the exported video (AAC in MP4, Opus in WebM, mixed by
time). Left:

- Not checked: real music files (only generated test tones), listening to it
  (checked by the element's time and volume, and by the RMS of the exported
  audio), Safari and Firefox (the "no sound" notice is only covered by a unit
  test: Chrome encodes both codecs), and the light theme (`--timeline-audio`
  has a single value).
- The automatic fade at the end of the scene is not drawn on the clip.
- Later, if missed: volume keyframes, loop, the sound of the screen videos.
