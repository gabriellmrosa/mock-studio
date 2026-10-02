import { fireEvent, render, screen } from "@testing-library/react";
import MotionTimeline from "./MotionTimeline";
import { APP_COPY } from "../../lib/i18n";
import { DEFAULT_MOTION_FRAME, type MotionFrame } from "../../lib/motion-frame";
import {
  DEFAULT_SCREEN_FIT,
  createSceneObject,
  type SceneObject,
} from "../../lib/scene-objects";

const copy = APP_COPY["en-US"];

// O jsdom não tem PointerEvent: sem isto o evento perde o `button` e a
// timeline, que só arrasta com o botão principal, ignora o gesto.
beforeAll(() => {
  if (!("PointerEvent" in window)) {
    Object.defineProperty(window, "PointerEvent", { value: MouseEvent });
  }
});

function withVideo(object: SceneObject): SceneObject {
  return {
    ...object,
    screenSource: "video",
    screenVideo: {
      durationMs: 4000,
      fit: { ...DEFAULT_SCREEN_FIT },
      name: "recording.mov",
      startMs: 1000,
      trimEndMs: 0,
      trimStartMs: 0,
      url: "blob:x",
    },
  };
}

function renderTimeline(
  objects: SceneObject[],
  frame: MotionFrame = DEFAULT_MOTION_FRAME,
) {
  const handlers = {
    onChangeFrame: jest.fn(),
    onChangeKeyframes: jest.fn(),
    onChangeVideo: jest.fn(),
    onRemoveKeyframe: jest.fn(),
    onScrub: jest.fn(),
    onSelectKeyframe: jest.fn(),
    onSelectObject: jest.fn(),
    onToggleKeyframeAtPlayhead: jest.fn(),
    onTogglePlayback: jest.fn(),
  };

  const { container } = render(
    <MotionTimeline
      copy={copy}
      frame={frame}
      isPlaying={false}
      locale="en-US"
      objects={objects}
      playbackStartedAt={null}
      playheadMs={0}
      sceneDurationMs={5000}
      selectedKeyframeId=""
      selectedObjectId=""
      {...handlers}
    />,
  );

  return { container, handlers };
}

describe("MotionTimeline", () => {
  it("gives the screen video its own track, like a clip in a video editor", () => {
    const { container } = renderTimeline([
      withVideo(createSceneObject({ id: "a", name: "Phone" })),
      createSceneObject({ id: "b", name: "Tablet" }),
    ]);

    // Duas trilhas de objeto + uma de vídeo, só para quem tem vídeo.
    expect(container.querySelectorAll(".motion-timeline-lane")).toHaveLength(3);
    expect(
      container.querySelectorAll(".motion-timeline-lane-video"),
    ).toHaveLength(1);
    expect(screen.getByText("Video")).toBeInTheDocument();
    expect(screen.getByText("recording.mov")).toBeInTheDocument();
  });

  it("places the clip at the video start on the scene axis", () => {
    const { container } = renderTimeline([
      withVideo(createSceneObject({ id: "a", name: "Phone" })),
    ]);
    const clip = container.querySelector<HTMLElement>(".motion-timeline-clip");

    // Eixo de 6s (5s de cena + 1s de folga): começa em 1s e dura 4s.
    expect(clip?.style.left).toBe(`${(1000 / 6000) * 100}%`);
    expect(clip?.style.width).toBe(`${(4000 / 6000) * 100}%`);
  });

  it("selects the object when its clip is grabbed", () => {
    const { container, handlers } = renderTimeline([
      withVideo(createSceneObject({ id: "a", name: "Phone" })),
    ]);
    const clip = container.querySelector(".motion-timeline-clip") as HTMLElement;

    // jsdom não implementa pointer capture.
    clip.setPointerCapture = jest.fn();
    fireEvent.pointerDown(clip, { button: 0, clientX: 10, pointerId: 1 });

    expect(handlers.onSelectObject).toHaveBeenCalledWith("a");
  });

  it("draws only the trimmed part of the clip", () => {
    const object = withVideo(createSceneObject({ id: "a", name: "Phone" }));
    const { container } = renderTimeline([
      {
        ...object,
        screenVideo: { ...object.screenVideo!, trimEndMs: 1000, trimStartMs: 500 },
      },
    ]);
    const clip = container.querySelector<HTMLElement>(".motion-timeline-clip");

    // 4 s de arquivo menos 1,5 s de cortes: 2,5 s no eixo de 6 s.
    expect(clip?.style.width).toBe(`${(2500 / 6000) * 100}%`);
  });

  it("trims the start from the clip's left edge", () => {
    const { container, handlers } = renderTimeline([
      withVideo(createSceneObject({ id: "a", name: "Phone" })),
    ]);
    const lanes = container.querySelector(".motion-timeline-lanes") as HTMLElement;
    const handle = container.querySelector(
      ".motion-timeline-clip-trim.is-start",
    ) as HTMLElement;

    // 600 px de eixo para 6 s: 100 px = 1 s.
    lanes.getBoundingClientRect = () => ({ left: 0, width: 600 }) as DOMRect;
    handle.setPointerCapture = jest.fn();
    fireEvent.pointerDown(handle, { button: 0, clientX: 100, pointerId: 1 });
    fireEvent.pointerMove(handle, { clientX: 150, pointerId: 1 });

    expect(handlers.onChangeVideo).toHaveBeenLastCalledWith("a", {
      startMs: 1500,
      trimStartMs: 500,
    });
  });

  it("hides the video track while the screen shows the image", () => {
    const { container } = renderTimeline([
      {
        ...withVideo(createSceneObject({ id: "a", name: "Phone" })),
        screenSource: "image",
      },
    ]);

    expect(container.querySelector(".motion-timeline-lane-video")).toBeNull();
  });

  describe("zoom", () => {
    const lanesWidth = (container: HTMLElement) =>
      container.querySelector<HTMLElement>(".motion-timeline-lanes")?.style.width;

    it("starts with the whole scene in view, so there is nothing to zoom out", () => {
      const { container } = renderTimeline([createSceneObject({ id: "a", name: "Phone" })]);

      expect(lanesWidth(container)).toBe("100%");
      expect(screen.getByRole("button", { name: /Zoom out/ })).toBeDisabled();
    });

    it("widens the lanes from the zoom buttons", () => {
      const { container } = renderTimeline([createSceneObject({ id: "a", name: "Phone" })]);

      fireEvent.click(screen.getByRole("button", { name: /Zoom in/ }));
      expect(lanesWidth(container)).toBe("150%");

      fireEvent.click(screen.getByRole("button", { name: /Zoom out/ }));
      expect(lanesWidth(container)).toBe("100%");
    });

    it("zooms on a trackpad pinch, which arrives as a ctrl+wheel", () => {
      const { container } = renderTimeline([createSceneObject({ id: "a", name: "Phone" })]);
      const viewport = container.querySelector(".motion-timeline-viewport") as HTMLElement;

      fireEvent.wheel(viewport, { ctrlKey: true, deltaY: -100 });

      expect(parseFloat(lanesWidth(container) ?? "0")).toBeGreaterThan(100);
    });

    it("leaves plain scrolling alone", () => {
      const { container } = renderTimeline([createSceneObject({ id: "a", name: "Phone" })]);
      const viewport = container.querySelector(".motion-timeline-viewport") as HTMLElement;

      fireEvent.wheel(viewport, { deltaY: -100 });

      expect(lanesWidth(container)).toBe("100%");
    });
  });

  describe("video size", () => {
    const openSize = () =>
      fireEvent.click(screen.getByRole("button", { name: "Video size: 1920 × 1080" }));

    it("shows the current size in the header and opens its panel", () => {
      renderTimeline([]);
      openSize();

      const panel = screen.getByRole("dialog", { name: "Video size" });

      expect(panel).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /16:9/ })).toHaveAttribute(
        "aria-pressed",
        "true",
      );
      expect(screen.getByText("Aspect ratio 16:9")).toBeInTheDocument();
    });

    it("applies a preset", () => {
      const { handlers } = renderTimeline([]);
      openSize();

      fireEvent.click(screen.getByRole("button", { name: /1:1/ }));

      expect(handlers.onChangeFrame).toHaveBeenCalledWith({
        height: 1080,
        width: 1080,
      });
    });

    it("sets a side in pixels on Enter, leaving the other alone by default", () => {
      const { handlers } = renderTimeline([]);
      openSize();

      const width = screen.getByLabelText("Width");
      fireEvent.change(width, { target: { value: "648" } });
      // Nada é aplicado enquanto se digita...
      expect(handlers.onChangeFrame).not.toHaveBeenCalled();
      fireEvent.keyDown(width, { key: "Enter" });

      // ...e no Enter a proporção passa a ser a das medidas digitadas.
      expect(handlers.onChangeFrame).toHaveBeenCalledWith({
        height: 1080,
        width: 648,
      });
    });

    it("keeps the aspect ratio when locked", () => {
      const { handlers } = renderTimeline([]);
      openSize();

      fireEvent.click(screen.getByRole("button", { name: "Keep aspect ratio" }));
      const width = screen.getByLabelText("Width");
      fireEvent.change(width, { target: { value: "960" } });
      fireEvent.blur(width);

      expect(handlers.onChangeFrame).toHaveBeenCalledWith({
        height: 540,
        width: 960,
      });
    });

    it("describes a custom size by its ratio", () => {
      renderTimeline([], { height: 412, width: 648 });
      fireEvent.click(screen.getByRole("button", { name: "Video size: 648 × 412" }));

      expect(screen.getByText("Aspect ratio 1.57:1")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /16:9/ })).toHaveAttribute(
        "aria-pressed",
        "false",
      );
    });
  });
});
