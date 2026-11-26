import {
  applyPendingVideo,
  fromTemplateScreen,
  getMissingScreenFileName,
  normalizeTemplateScreen,
  toTemplateScreen,
  withoutPending,
  type ScreenState,
} from "./screen-memory";
import { DEFAULT_SCREEN_FIT, type ScreenVideo } from "./scene-objects";

const FIT = { ...DEFAULT_SCREEN_FIT, cropTop: 0.1, panX: 0.2, zoom: 1.5 };

const VIDEO: ScreenVideo = {
  durationMs: 10_000,
  fit: { ...FIT, background: "#000000" },
  name: "gravacao.mov",
  startMs: 1_500,
  trimEndMs: 2_000,
  trimStartMs: 1_000,
  url: "blob:video",
};

function state(patch: Partial<ScreenState> = {}): ScreenState {
  return {
    imageFit: { ...DEFAULT_SCREEN_FIT },
    imageName: null,
    pending: null,
    source: "image",
    video: null,
    ...patch,
  };
}

describe("toTemplateScreen", () => {
  it("remembers nothing for a screen that never got a file", () => {
    expect(toTemplateScreen(state())).toBeUndefined();
  });

  it("keeps the image name and its framing, never the file", () => {
    expect(toTemplateScreen(state({ imageFit: FIT, imageName: "home.png" }))).toEqual({
      image: { fit: FIT, name: "home.png" },
      source: "image",
    });
  });

  it("keeps the video settings and timing without its url", () => {
    const screen = toTemplateScreen(state({ source: "video", video: VIDEO }));

    expect(screen?.source).toBe("video");
    expect(screen?.video).toMatchObject({ name: "gravacao.mov", startMs: 1_500, trimStartMs: 1_000 });
    expect(screen?.video).not.toHaveProperty("url");
  });

  it("keeps what is still waiting for its file when saved again", () => {
    const pending = { imageName: "home.png", video: null };

    expect(toTemplateScreen(state({ imageFit: FIT, pending }))?.image).toEqual({
      fit: FIT,
      name: "home.png",
    });
  });
});

describe("fromTemplateScreen", () => {
  it("brings back the source, the image framing and what to ask for", () => {
    const restored = fromTemplateScreen(
      toTemplateScreen(state({ imageFit: FIT, imageName: "home.png", source: "video", video: VIDEO })),
    );

    expect(restored.source).toBe("video");
    expect(restored.imageFit).toEqual(FIT);
    expect(restored.pending?.imageName).toBe("home.png");
    expect(restored.pending?.video?.name).toBe("gravacao.mov");
  });

  it("is a plain screen for templates from before", () => {
    expect(fromTemplateScreen(undefined)).toEqual({
      imageFit: DEFAULT_SCREEN_FIT,
      pending: null,
      source: "image",
    });
  });
});

describe("normalizeTemplateScreen", () => {
  it("brings numbers back inside the limits of the controls", () => {
    const screen = normalizeTemplateScreen({
      image: { fit: { cropTop: 9, zoom: 99, background: "red" }, name: " home.png " },
      source: "video",
    });

    expect(screen?.image?.name).toBe("home.png");
    expect(screen?.image?.fit.zoom).toBe(3);
    expect(screen?.image?.fit.cropTop).toBe(1);
    expect(screen?.image?.fit.background).toBe(DEFAULT_SCREEN_FIT.background);
  });

  it("drops what makes no sense", () => {
    expect(normalizeTemplateScreen("nope")).toBeUndefined();
    expect(normalizeTemplateScreen({ image: { name: 3 }, source: "x" })).toEqual({
      source: "image",
    });
  });
});

describe("applyPendingVideo", () => {
  const arrived: ScreenVideo = {
    ...VIDEO,
    fit: { ...DEFAULT_SCREEN_FIT },
    name: "outra.mov",
    startMs: 0,
    trimEndMs: 0,
    trimStartMs: 0,
    url: "blob:new",
  };

  it("gives the new file the saved framing and timing, whatever its name", () => {
    expect(applyPendingVideo(arrived, VIDEO)).toMatchObject({
      fit: VIDEO.fit,
      name: "outra.mov",
      startMs: 1_500,
      trimEndMs: 2_000,
      trimStartMs: 1_000,
      url: "blob:new",
    });
  });

  it("shrinks the saved trims to fit a shorter file", () => {
    const short = applyPendingVideo({ ...arrived, durationMs: 1_500 }, VIDEO);

    expect(short.durationMs - short.trimStartMs - short.trimEndMs).toBeGreaterThanOrEqual(100);
  });

  it("leaves a video with nothing pending as it is", () => {
    expect(applyPendingVideo(arrived, null)).toBe(arrived);
  });
});

describe("what the screen asks for", () => {
  const pending = { imageName: "home.png", video: { ...VIDEO } };

  it("asks for the file of the source it shows", () => {
    expect(getMissingScreenFileName("image", pending)).toBe("home.png");
    expect(getMissingScreenFileName("video", pending)).toBe("gravacao.mov");
    expect(getMissingScreenFileName("image", null)).toBeNull();
  });

  it("forgets each part once it arrives, and everything when nothing is left", () => {
    const withVideo = withoutPending(pending, "image");

    expect(withVideo).toEqual({ imageName: null, video: pending.video });
    expect(withoutPending(withVideo, "video")).toBeNull();
  });
});
