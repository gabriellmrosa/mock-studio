import { fireEvent, render, screen } from "@testing-library/react";
import MotionTimeline from "./MotionTimeline";
import { APP_COPY } from "../../lib/i18n";
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
      frameMs: 0,
      name: "recording.mov",
      startMs: 1000,
      url: "blob:x",
    },
  };
}

function renderTimeline(objects: SceneObject[]) {
  const handlers = {
    onChangeKeyframes: jest.fn(),
    onChangeVideoStart: jest.fn(),
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
      isPlaying={false}
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

  it("hides the video track while the screen shows the image", () => {
    const { container } = renderTimeline([
      {
        ...withVideo(createSceneObject({ id: "a", name: "Phone" })),
        screenSource: "image",
      },
    ]);

    expect(container.querySelector(".motion-timeline-lane-video")).toBeNull();
  });
});
