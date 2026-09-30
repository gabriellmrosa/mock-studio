import {
  findVideoExportPreset,
  getVideoExportFilename,
  getVideoExportFormat,
  getVideoExportPreset,
  getVideoExportSize,
  getVideoFrameTimes,
} from "./video-export";

describe("video export", () => {
  it("maps each preset to its settings and back", () => {
    for (const id of ["social", "web", "master"] as const) {
      expect(findVideoExportPreset(getVideoExportPreset(id))).toBe(id);
    }

    expect(
      findVideoExportPreset({ background: false, fps: 60, scale: 2 }),
    ).toBeNull();
  });

  it("uses WebM for transparent video and MP4 otherwise", () => {
    expect(getVideoExportFormat(getVideoExportPreset("web"))).toBe("webm");
    expect(getVideoExportFormat(getVideoExportPreset("social"))).toBe("mp4");
  });

  it("scales the frame, capping the longest side at 4K", () => {
    expect(getVideoExportSize({ height: 412, width: 648 }, 2)).toEqual({
      height: 824,
      width: 1296,
    });
    // 1920 × 1080 em 2× passaria de 4K: vira 3840 × 2160.
    expect(getVideoExportSize({ height: 1080, width: 1920 }, 2)).toEqual({
      height: 2160,
      width: 3840,
    });
    expect(getVideoExportSize({ height: 1920, width: 1080 }, 2)).toEqual({
      height: 3840,
      width: 2160,
    });
  });

  it("samples every frame and ends exactly on the last pose", () => {
    const times = getVideoFrameTimes(1000, 30);

    expect(times).toHaveLength(31);
    expect(times[0]).toBe(0);
    expect(times[1]).toBeCloseTo(33.333);
    expect(times.at(-1)).toBe(1000);
    // Duração que não fecha um quadro: ganha um último, no fim da cena.
    expect(getVideoFrameTimes(1010, 30)).toHaveLength(32);
    expect(getVideoFrameTimes(1010, 30).at(-1)).toBe(1010);
    expect(getVideoFrameTimes(0, 60)).toEqual([0]);
  });

  it("names the file by size, frame rate and format", () => {
    expect(
      getVideoExportFilename(
        { height: 412, width: 648 },
        getVideoExportPreset("web"),
        "2026-09-30_10-00-00",
      ),
    ).toBe("mock-photo-648x412-30fps-2026-09-30_10-00-00.webm");
  });
});
