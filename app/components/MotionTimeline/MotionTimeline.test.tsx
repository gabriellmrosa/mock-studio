import { fireEvent, render, screen } from "@testing-library/react";
import MotionTimeline from "./MotionTimeline";
import { APP_COPY } from "../../lib/i18n";
import { DEFAULT_MOTION_FRAME, type MotionFrame } from "../../lib/motion-frame";
import {
  DEFAULT_SCREEN_FIT,
  createSceneObject,
  type DeviceObject,
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

function withVideo(object: DeviceObject): DeviceObject {
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

    expect(handlers.onChangeVideo).toHaveBeenLastCalledWith("a", "main", {
      startMs: 1500,
      trimStartMs: 500,
    });
  });

  describe("snapping", () => {
    // Clipe de 1 s a 4.637 s (duração fora da grade de 50 ms) e um keyframe a 4.6 s.
    function clipAndKeyframe() {
      const phone = withVideo(createSceneObject({ id: "a", name: "Phone" }));
      const tablet = createSceneObject({ id: "b", name: "Tablet" });

      return [
        { ...phone, screenVideo: { ...phone.screenVideo!, durationMs: 3637 } },
        {
          ...tablet,
          keyframes: [
            {
              easing: "linear" as const,
              id: "k",
              timeMs: 4600,
              transform: {
                opacity: 1,
                positionX: 0,
                positionY: 0,
                positionZ: 0,
                rotationX: 0,
                rotationY: 0,
                rotationZ: 0,
                scale: 1,
              },
            },
          ],
        },
      ];
    }

    function dragEndEdge(clientX: number, altKey = false) {
      const { container, handlers } = renderTimeline(clipAndKeyframe());
      const lanes = container.querySelector(".motion-timeline-lanes") as HTMLElement;
      const handle = container.querySelector(
        ".motion-timeline-clip-trim.is-end",
      ) as HTMLElement;

      // 600 px para 6 s: 1 px = 10 ms, e o ímã pega 8 px = 80 ms.
      lanes.getBoundingClientRect = () => ({ left: 0, width: 600 }) as DOMRect;
      handle.setPointerCapture = jest.fn();
      fireEvent.pointerDown(handle, { button: 0, clientX: 464, pointerId: 1 });
      fireEvent.pointerMove(handle, { altKey, clientX, pointerId: 1 });

      return { container, handlers };
    }

    it("lands the end of a clip exactly on a nearby keyframe and shows the guide", () => {
      const { container, handlers } = dragEndEdge(460);

      // Fim em 4.637 → 4.600: 37 ms a mais de corte no fim.
      expect(handlers.onChangeVideo).toHaveBeenLastCalledWith("a", "main", {
        holdEndMs: 0,
        trimEndMs: 37,
      });
      expect(container.querySelector(".motion-timeline-snap-guide")).not.toBeNull();
    });

    it("stops at the real end of the file before holding its last frame", () => {
      // O arquivo de 3.637 s acaba em 4.637 s na cena; arrastar 3 px além
      // gruda no fim do arquivo, sem congelar nada.
      const { handlers } = dragEndEdge(467);

      expect(handlers.onChangeVideo).toHaveBeenLastCalledWith("a", "main", {
        holdEndMs: 0,
        trimEndMs: 0,
      });
    });

    it("holds the last frame when dragged well past the end, and marks it", () => {
      const { handlers } = dragEndEdge(564, true);

      expect(handlers.onChangeVideo).toHaveBeenLastCalledWith("a", "main", {
        holdEndMs: 1000,
        trimEndMs: 0,
      });

      const [object] = clipAndKeyframe();
      const held = {
        ...object,
        screenVideo: { ...object.screenVideo!, holdEndMs: 1000 },
      };

      renderTimeline([held]);

      expect(screen.getByTestId("clip-hold")).toHaveTextContent("Frozen");
    });

    it("lets go with Alt held, back to the usual step", () => {
      const { container, handlers } = dragEndEdge(460, true);

      expect(handlers.onChangeVideo).toHaveBeenLastCalledWith("a", "main", {
        holdEndMs: 0,
        trimEndMs: 50,
      });
      expect(container.querySelector(".motion-timeline-snap-guide")).toBeNull();
    });
  });

  describe("a foldable with a video on each screen", () => {
    const duoWithTwoVideos = () => {
      const duo = withVideo(
        createSceneObject({ id: "d", modelId: "duo", name: "Duo" }),
      );

      return {
        ...duo,
        outerScreenSource: "video" as const,
        outerScreenVideo: {
          ...duo.screenVideo!,
          name: "cover.mov",
          startMs: 2000,
        },
      };
    };

    it("gives each screen its own track, named after the screen", () => {
      const { container } = renderTimeline([duoWithTwoVideos()]);

      expect(
        container.querySelectorAll(".motion-timeline-lane-video"),
      ).toHaveLength(2);
      expect(screen.getByText("recording.mov")).toBeInTheDocument();
      expect(screen.getByText("cover.mov")).toBeInTheDocument();
      // O rótulo diz a tela, já que "Vídeo" duas vezes não diria nada.
      expect(screen.getByText("Inner screen")).toBeInTheDocument();
      expect(screen.getByText("Outer screen")).toBeInTheDocument();
    });

    it("moves one clip without touching the other", () => {
      const { container, handlers } = renderTimeline([duoWithTwoVideos()]);
      const [, outerClip] = container.querySelectorAll<HTMLElement>(
        ".motion-timeline-clip",
      );
      const lanes = container.querySelector(".motion-timeline-lanes") as HTMLElement;

      lanes.getBoundingClientRect = () => ({ left: 0, width: 600 }) as DOMRect;
      outerClip.setPointerCapture = jest.fn();
      fireEvent.pointerDown(outerClip, { button: 0, clientX: 300, pointerId: 1 });
      fireEvent.pointerMove(outerClip, { clientX: 400, pointerId: 1 });

      // 100 px = 1 s: a de fora sai de 2 s para 3 s, e só ela.
      expect(handlers.onChangeVideo).toHaveBeenLastCalledWith("d", "outer", {
        startMs: 3000,
      });
    });

    it("shows a single track for a device with one screen, labelled Video", () => {
      renderTimeline([
        withVideo(createSceneObject({ id: "a", name: "Phone" })),
      ]);

      expect(screen.getByText("Video")).toBeInTheDocument();
      expect(screen.queryByText("Inner screen")).toBeNull();
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

  describe("the keyframe menu", () => {
    function withKeyframes(): DeviceObject {
      const object = createSceneObject({ id: "a", name: "Phone" });
      const pose = (positionX: number) => ({
        opacity: 1,
        positionX,
        positionY: 0,
        positionZ: 0,
        rotationX: 0,
        rotationY: 0,
        rotationZ: 0,
        scale: 1,
      });

      return {
        ...object,
        keyframes: [
          { easing: "ease-in-out", id: "k0", timeMs: 0, transform: pose(0) },
          { easing: "ease-in-out", id: "k1", timeMs: 1000, transform: pose(1) },
        ],
      };
    }

    it("copies the pose of the next keyframe, and the first has no previous one", () => {
      const object = withKeyframes();
      const { handlers } = renderTimeline([object]);

      fireEvent.contextMenu(screen.getByLabelText("Keyframe 0.0s · Phone"));

      expect(
        screen.getByRole("menuitem", { name: "Copy from previous keyframe" }),
      ).toBeDisabled();

      fireEvent.click(screen.getByRole("menuitem", { name: "Copy from next keyframe" }));

      const [objectId, keyframes] = handlers.onChangeKeyframes.mock.calls[0];

      expect(objectId).toBe("a");
      expect(keyframes[0]).toMatchObject({ id: "k0", timeMs: 0, transform: { positionX: 1 } });
    });
  });
});

