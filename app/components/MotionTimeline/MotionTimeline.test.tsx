import { fireEvent, render, screen } from "@testing-library/react";
import MotionTimeline from "./MotionTimeline";
import { APP_COPY } from "../../lib/i18n";
import { DEFAULT_MOTION_FRAME, type MotionFrame } from "../../lib/motion-frame";
import { createAudioObject, createSceneAudio } from "../../lib/audio-objects";
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
  overrides: { sceneDurationMs?: number; selectedKeyframeId?: string } = {},
) {
  const handlers = {
    onChangeAudio: jest.fn(),
    onChangeFrame: jest.fn(),
    onChangeKeyframes: jest.fn(),
    onChangeMultipleKeyframes: jest.fn(),
    onChangeVideo: jest.fn(),
    onRemoveKeyframe: jest.fn(),
    onRemoveMultipleKeyframes: jest.fn(),
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
      sceneDurationMs={overrides.sceneDurationMs ?? 5000}
      selectedKeyframeId={overrides.selectedKeyframeId ?? ""}
      selectedObjectId=""
      {...handlers}
    />,
  );

  return { container, handlers };
}

function music(patch: Partial<ReturnType<typeof createSceneAudio>> = {}) {
  return {
    ...createAudioObject({
      audio: {
        ...createSceneAudio({ durationMs: 8000, name: "song.mp3", url: "blob:song" }),
        ...patch,
      },
      name: "Music",
    }),
    id: "m",
  };
}

describe("MotionTimeline", () => {
  describe("music track", () => {
    it("shows the music clip with no keyframe button, and stretches the axis to fit it", () => {
      const { container } = renderTimeline([
        createSceneObject({ id: "a", name: "Phone" }),
        music({ startMs: 1000 }),
      ]);
      const clip = container.querySelector<HTMLElement>(".motion-timeline-clip-audio");

      // A música vai até 9 s, além dos 5 s da cena: eixo de 10 s.
      expect(clip?.style.left).toBe("10%");
      expect(clip?.style.width).toBe("80%");
      expect(screen.getByText("song.mp3")).toBeInTheDocument();
      // Só o aparelho tem o botão de keyframe.
      expect(container.querySelectorAll(".motion-timeline-add")).toHaveLength(1);
    });

    it("trims the start so the music plays from there", () => {
      const { container, handlers } = renderTimeline([music()]);
      const lanes = container.querySelector(".motion-timeline-lanes") as HTMLElement;
      const handle = container.querySelector(
        ".motion-timeline-clip-audio .motion-timeline-clip-trim.is-start",
      ) as HTMLElement;

      // Eixo de 9 s em 900 px: 100 px = 1 s.
      lanes.getBoundingClientRect = () => ({ left: 0, width: 900 }) as DOMRect;
      handle.setPointerCapture = jest.fn();
      fireEvent.pointerDown(handle, { button: 0, clientX: 0, pointerId: 1 });
      fireEvent.pointerMove(handle, { altKey: true, clientX: 230, pointerId: 1 });

      expect(handlers.onChangeAudio).toHaveBeenLastCalledWith("m", {
        startMs: 2300,
        trimStartMs: 2300,
      });
    });

    it("moves the clip on the scene axis", () => {
      const { container, handlers } = renderTimeline([music()]);
      const lanes = container.querySelector(".motion-timeline-lanes") as HTMLElement;
      const clip = container.querySelector(".motion-timeline-clip-audio") as HTMLElement;

      lanes.getBoundingClientRect = () => ({ left: 0, width: 900 }) as DOMRect;
      clip.setPointerCapture = jest.fn();
      fireEvent.pointerDown(clip, { button: 0, clientX: 100, pointerId: 1 });
      fireEvent.pointerMove(clip, { altKey: true, clientX: 250, pointerId: 1 });

      expect(handlers.onSelectObject).toHaveBeenCalledWith("m");
      expect(handlers.onChangeAudio).toHaveBeenLastCalledWith("m", { startMs: 1500 });
    });

    it("draws the fades as ramps only when there are fades", () => {
      const flat = renderTimeline([music()]);

      expect(flat.container.querySelector("[data-testid='audio-fades']")).toBeNull();

      // Fade-in de 2 s num clipe de 8 s: a rampa ocupa 25% da largura.
      const faded = renderTimeline([music({ fadeInMs: 2000 })]);

      expect(
        faded.container.querySelector("[data-testid='audio-fades'] polygon"),
      ).toHaveAttribute("points", "0,0 25,0 0,100");
    });

    it("has no clip while a template still waits for the file", () => {
      const { container } = renderTimeline([{ ...music(), audio: null }]);

      expect(container.querySelector(".motion-timeline-lane-audio")).not.toBeNull();
      expect(container.querySelector(".motion-timeline-clip-audio")).toBeNull();
    });
  });

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

  describe("multi-keyframe selection", () => {
    function twoTracks() {
      const pose = {
        opacity: 1,
        positionX: 0,
        positionY: 0,
        positionZ: 0,
        rotationX: 0,
        rotationY: 0,
        rotationZ: 0,
        scale: 1,
      };
      const first: SceneObject = {
        ...createSceneObject({ deletable: false, name: "Phone" }),
        id: "a",
        keyframes: [
          { easing: "ease-in-out", id: "a1", timeMs: 1000, transform: pose },
          { easing: "ease-in-out", id: "a2", timeMs: 2500, transform: pose },
        ],
      };
      const second: SceneObject = {
        ...createSceneObject({ deletable: true, name: "Watch" }),
        id: "b",
        keyframes: [
          { easing: "ease-in-out", id: "b1", timeMs: 1500, transform: pose },
          { easing: "ease-in-out", id: "b2", timeMs: 3500, transform: pose },
        ],
      };
      return [first, second];
    }

    it("selects keyframes across tracks with a marquee drag and moves them together", () => {
      const objects = twoTracks();
      const { container, handlers } = renderTimeline(
        objects,
        DEFAULT_MOTION_FRAME,
        { sceneDurationMs: 4000 },
      );

      const timeline = container.querySelector(".motion-timeline") as HTMLElement;
      timeline.getBoundingClientRect = () =>
        ({ bottom: 240, height: 240, left: 0, right: 600, top: 0, width: 600 }) as DOMRect;
      timeline.setPointerCapture = jest.fn();

      const lanes = container.querySelector(".motion-timeline-lanes") as HTMLElement;
      lanes.getBoundingClientRect = () =>
        ({ bottom: 200, height: 200, left: 0, right: 500, top: 0, width: 500 }) as DOMRect;
      lanes.setPointerCapture = jest.fn();

      // Eixo de 5s em 500px (100px = 1s). Posiciona os marcadores no DOM mock.
      const markerPositions: Record<string, { x: number; y: number }> = {
        a1: { x: 100, y: 30 },
        a2: { x: 250, y: 30 },
        b1: { x: 150, y: 70 },
        b2: { x: 350, y: 70 },
      };
      for (const [id, pos] of Object.entries(markerPositions)) {
        const el = container.querySelector(
          `[data-keyframe-id="${id}"]`,
        ) as HTMLElement;
        el.getBoundingClientRect = () =>
          ({
            bottom: pos.y + 5,
            height: 10,
            left: pos.x - 5,
            right: pos.x + 5,
            top: pos.y - 5,
            width: 10,
          }) as DOMRect;
        el.setPointerCapture = jest.fn();
      }

      // Caixa de seleção pode começar em qualquer ponto vazio da section e cobrir a1 e b1.
      fireEvent.pointerDown(timeline, { button: 0, clientX: 80, clientY: 20, pointerId: 1 });
      fireEvent.pointerMove(timeline, { clientX: 180, clientY: 90, pointerId: 1 });

      expect(screen.getByTestId("timeline-marquee")).toBeInTheDocument();
      expect(container.querySelector('[data-keyframe-id="a1"]')).toHaveClass("is-active");
      expect(container.querySelector('[data-keyframe-id="b1"]')).toHaveClass("is-active");
      expect(container.querySelector('[data-keyframe-id="a2"]')).not.toHaveClass("is-active");
      expect(container.querySelector('[data-keyframe-id="b2"]')).not.toHaveClass("is-active");

      fireEvent.pointerUp(timeline, { clientX: 180, clientY: 90, pointerId: 1 });
      expect(screen.queryByTestId("timeline-marquee")).not.toBeInTheDocument();

      // Arrastar a1 +50px (+500ms) com Alt (sem snap) move a1 e b1 juntos.
      const a1 = container.querySelector('[data-keyframe-id="a1"]') as HTMLElement;
      fireEvent.pointerDown(a1, { button: 0, clientX: 100, pointerId: 2 });
      fireEvent.pointerMove(a1, { altKey: true, clientX: 150, pointerId: 2 });

      expect(handlers.onChangeMultipleKeyframes).toHaveBeenCalled();
      const updates = handlers.onChangeMultipleKeyframes.mock.calls.at(-1)?.[0] as Array<{
        keyframes: { id: string; timeMs: number }[];
        objectId: string;
      }>;

      const updatedA = updates.find((u) => u.objectId === "a")?.keyframes;
      const updatedB = updates.find((u) => u.objectId === "b")?.keyframes;

      expect(updatedA?.find((k) => k.id === "a1")?.timeMs).toBe(1500);
      expect(updatedA?.find((k) => k.id === "a2")?.timeMs).toBe(2500);
      expect(updatedB?.find((k) => k.id === "b1")?.timeMs).toBe(2000);
      expect(updatedB?.find((k) => k.id === "b2")?.timeMs).toBe(3500);
    });

    it("supports Shift+click multi-selection and batch delete with Backspace", () => {
      const objects = twoTracks();
      const { container, handlers } = renderTimeline(
        objects,
        DEFAULT_MOTION_FRAME,
        { selectedKeyframeId: "a1" },
      );

      const b1 = container.querySelector('[data-keyframe-id="b1"]') as HTMLElement;
      fireEvent.pointerDown(b1, { button: 0, shiftKey: true });

      expect(container.querySelector('[data-keyframe-id="a1"]')).toHaveClass("is-active");
      expect(b1).toHaveClass("is-active");

      fireEvent.keyDown(b1, { key: "Backspace" });

      expect(handlers.onRemoveMultipleKeyframes).toHaveBeenCalledWith([
        { keyframeId: "a1", objectId: "a" },
        { keyframeId: "b1", objectId: "b" },
      ]);
    });

    it("scrubs on a simple click in empty lane space without dragging", () => {
      const objects = twoTracks();
      const { container, handlers } = renderTimeline(
        objects,
        DEFAULT_MOTION_FRAME,
        { sceneDurationMs: 4000 },
      );

      const timeline = container.querySelector(".motion-timeline") as HTMLElement;
      timeline.setPointerCapture = jest.fn();

      const lanes = container.querySelector(".motion-timeline-lanes") as HTMLElement;
      lanes.getBoundingClientRect = () =>
        ({ bottom: 200, height: 200, left: 0, right: 500, top: 0, width: 500 }) as DOMRect;

      fireEvent.pointerDown(lanes, { button: 0, clientX: 200, clientY: 30, pointerId: 1 });
      fireEvent.pointerUp(lanes, { altKey: true, clientX: 200, clientY: 30, pointerId: 1 });

      expect(handlers.onScrub).toHaveBeenCalledWith(2000);
    });
  });
});

