import {
  DEFAULT_VIDEO_EXPORT_SETTINGS,
  estimateRemainingMs,
  getVideoExportFilename,
  getVideoExportFormat,
  getVideoExportSize,
  getVideoFrameTimes,
} from "./video-export";

describe("video export", () => {
  it("uses WebM for transparent video and MP4 otherwise", () => {
    expect(
      getVideoExportFormat({ ...DEFAULT_VIDEO_EXPORT_SETTINGS, background: false }),
    ).toBe("webm");
    expect(getVideoExportFormat(DEFAULT_VIDEO_EXPORT_SETTINGS)).toBe("mp4");
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
        { background: false, fps: 30, scale: 1 },
        "2026-09-30_10-00-00",
      ),
    ).toBe("mock-photo-648x412-30fps-2026-09-30_10-00-00.webm");
  });

  it("estimates the time left from the pace so far, once there is a pace", () => {
    // 100 quadros em 10 s: 0,1 s por quadro, faltam 900.
    expect(estimateRemainingMs(10_000, 100, 1000)).toBe(90_000);
    // Cedo demais para dizer.
    expect(estimateRemainingMs(10_000, 5, 1000)).toBeNull();
    expect(estimateRemainingMs(800, 20, 1000)).toBeNull();
    // Todos os quadros prontos: só falta fechar o arquivo.
    expect(estimateRemainingMs(10_000, 1000, 1000)).toBeNull();
  });
});
