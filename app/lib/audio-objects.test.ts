import {
  applyAudioFile,
  clampAudioFades,
  createSceneAudio,
  getAudioClipDuration,
  getAudioGain,
  getAudioTime,
  normalizeAudioSettings,
  trimAudioClip,
} from "./audio-objects";
import type { SceneAudio } from "./scene-objects";

const SONG: SceneAudio = {
  ...createSceneAudio({ durationMs: 10_000, name: "song.mp3", url: "blob:song" }),
};

describe("music clip time", () => {
  it("plays from the trimmed start, wherever the clip sits in the scene", () => {
    // Cortado 3 s no começo e posto em 2 s da cena: em 2 s toca o segundo 3.
    const audio = { ...SONG, startMs: 2_000, trimStartMs: 3_000 };

    expect(getAudioTime(audio, 2_000)).toBe(3_000);
    expect(getAudioTime(audio, 4_500)).toBe(5_500);
  });

  it("is silent outside the clip", () => {
    const audio = { ...SONG, startMs: 1_000, trimEndMs: 4_000 };

    expect(getAudioTime(audio, 999)).toBeNull();
    expect(getAudioClipDuration(audio)).toBe(6_000);
    expect(getAudioTime(audio, 7_001)).toBeNull();
  });
});

describe("trimAudioClip", () => {
  it("trims the start without moving the rest of the music", () => {
    expect(trimAudioClip(SONG, "start", 2_500)).toEqual({
      startMs: 2_500,
      trimStartMs: 2_500,
    });
  });

  it("never stretches the end past the file", () => {
    // O vídeo congelaria o último quadro; a música para no fim do arquivo.
    expect(trimAudioClip(SONG, "end", 5_000)).toEqual({ trimEndMs: 0 });
    expect(trimAudioClip({ ...SONG, trimEndMs: 2_000 }, "end", 500)).toEqual({
      trimEndMs: 1_500,
    });
  });
});

describe("getAudioGain", () => {
  it("is the clip volume, rising in the fade in and falling in the fade out", () => {
    const audio = { ...SONG, fadeInMs: 2_000, fadeOutMs: 4_000, volume: 0.8 };

    expect(getAudioGain(audio, 0)).toBe(0);
    expect(getAudioGain(audio, 1_000)).toBeCloseTo(0.4);
    expect(getAudioGain(audio, 5_000)).toBeCloseTo(0.8);
    expect(getAudioGain(audio, 8_000)).toBeCloseTo(0.4);
    expect(getAudioGain(audio, 10_000)).toBe(0);
  });

  it("is zero outside the clip", () => {
    expect(getAudioGain({ ...SONG, startMs: 1_000 }, 500)).toBe(0);
  });
});

describe("clampAudioFades", () => {
  it("keeps each fade inside the clip", () => {
    const audio = clampAudioFades({
      ...SONG,
      fadeInMs: 20_000,
      fadeOutMs: -1,
      trimEndMs: 4_000,
    });

    expect(audio.fadeInMs).toBe(6_000);
    expect(audio.fadeOutMs).toBe(0);
  });
});

describe("applyAudioFile", () => {
  const arrived = { durationMs: 8_000, name: "other.mp3", url: "blob:other" };

  it("brings back what a template saved, shrinking trims for a shorter file", () => {
    const saved = {
      ...SONG,
      fadeInMs: 500,
      startMs: 1_000,
      trimEndMs: 3_000,
      trimStartMs: 6_000,
      volume: 0.5,
    };

    expect(applyAudioFile(arrived, saved, true)).toEqual({
      ...arrived,
      // Sobra o clipe mínimo (100 ms): o fade não passa dele.
      fadeInMs: 100,
      fadeOutMs: 0,
      startMs: 1_000,
      trimEndMs: 1_900,
      trimStartMs: 6_000,
      volume: 0.5,
    });
  });

  it("keeps place, volume and fades when replacing a file, but not its trims", () => {
    const current = { ...SONG, fadeOutMs: 1_000, startMs: 2_000, trimStartMs: 3_000, volume: 0.3 };

    expect(applyAudioFile(arrived, current, false)).toMatchObject({
      fadeOutMs: 1_000,
      startMs: 2_000,
      trimEndMs: 0,
      trimStartMs: 0,
      url: "blob:other",
      volume: 0.3,
    });
  });

  it("starts a new music whole, at zero, at full volume", () => {
    expect(applyAudioFile(arrived, null, false)).toEqual(createSceneAudio(arrived));
  });
});

describe("normalizeAudioSettings", () => {
  it("drops what has no name and clamps the numbers", () => {
    expect(normalizeAudioSettings({ volume: 1 })).toBeNull();
    expect(
      normalizeAudioSettings({ name: " a.mp3 ", startMs: -5, volume: 3 }),
    ).toMatchObject({ name: "a.mp3", startMs: 0, volume: 1 });
  });
});
