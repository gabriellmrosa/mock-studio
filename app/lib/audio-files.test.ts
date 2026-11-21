import { computeWaveformPeaks, getAudioPlayback } from "./audio-files";
import { createAudioObject, createSceneAudio } from "./audio-objects";
import type { AudioObject, SceneAudio } from "./scene-objects";

describe("computeWaveformPeaks", () => {
  it("keeps the loudest sample of each slice, across channels", () => {
    const left = new Float32Array([0.1, -0.5, 0.2, 0.05]);
    const right = new Float32Array([0.3, 0.1, -0.9, 0]);

    // 4 amostras por segundo, 2 picos por segundo: fatias de 2 amostras.
    expect(Array.from(computeWaveformPeaks([left, right], 4, 2))).toEqual([
      0.5,
      expect.closeTo(0.9),
    ]);
  });

  it("returns nothing for an empty file", () => {
    expect(computeWaveformPeaks([new Float32Array(0)], 44_100)).toHaveLength(0);
  });
});

describe("getAudioPlayback", () => {
  const object = createAudioObject({
    audio: createSceneAudio({ durationMs: 5_000, name: "a.mp3", url: "blob:a" }),
    name: "Music",
  }) as AudioObject & { audio: SceneAudio };

  it("plays from the file time of the scene instant", () => {
    expect(
      getAudioPlayback(
        { ...object, audio: { ...object.audio, startMs: 1_000, trimStartMs: 2_000 } },
        1_500,
      ),
    ).toEqual({ gain: 1, timeS: 2.5 });
  });

  it("stays silent when muted or outside the clip", () => {
    expect(getAudioPlayback({ ...object, isVisible: false }, 1_000)).toBeNull();
    expect(getAudioPlayback(object, 6_000)).toBeNull();
  });
});
