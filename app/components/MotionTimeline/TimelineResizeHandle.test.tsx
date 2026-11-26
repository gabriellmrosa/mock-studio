import { fireEvent, render, screen } from "@testing-library/react";
import TimelineResizeHandle, {
  countTimelineTracks,
  getAutoTimelineHeight,
  getAutoTimelineHeightCss,
  getManualTimelineHeightCss,
  getMinTimelineHeight,
} from "./TimelineResizeHandle";
import { APP_COPY } from "../../lib/i18n";
import { createAudioObject, createSceneAudio } from "../../lib/audio-objects";
import {
  DEFAULT_SCREEN_FIT,
  createSceneObject,
  type DeviceObject,
} from "../../lib/scene-objects";

const copy = APP_COPY["en-US"];

// Com root em 16px:
// - fixo = 5.25rem + 1px = 85px
// - cada faixa = 1.75rem = 28px
// - 2 faixas (mínimo) = 141px, 3 faixas = 169px, 8 faixas = 309px.
// - em innerHeight = 800: teto automático (35vh) = 280px, manual (50vh) = 400px.
beforeAll(() => {
  document.documentElement.style.fontSize = "16px";
  Object.defineProperty(window, "innerHeight", { configurable: true, value: 800 });

  if (!("PointerEvent" in window)) {
    Object.defineProperty(window, "PointerEvent", { value: MouseEvent });
  }

  // O jsdom não implementa captura de ponteiro.
  Element.prototype.setPointerCapture = () => undefined;
  Element.prototype.releasePointerCapture = () => undefined;
  Element.prototype.hasPointerCapture = () => false;
});

function renderHandle(height: number | null = null, trackCount = 3) {
  const onChange = jest.fn();

  render(
    <TimelineResizeHandle
      copy={copy}
      height={height}
      onChange={onChange}
      trackCount={trackCount}
    />,
  );

  return { handle: screen.getByRole("separator", { name: "Timeline height" }), onChange };
}

describe("timeline height helpers", () => {
  it("counts visible objects, muted audio and active screen video sub-tracks", () => {
    const sampleVideo = {
      durationMs: 3000,
      fit: { ...DEFAULT_SCREEN_FIT },
      name: "demo.mp4",
      startMs: 0,
      trimEndMs: 0,
      trimStartMs: 0,
      url: "blob:demo",
    };
    const phone: DeviceObject = {
      ...createSceneObject({ id: "phone-1", modelId: "smartphone", name: "Phone" }),
      screenSource: "video",
      screenVideo: sampleVideo,
    };
    const duo: DeviceObject = {
      ...createSceneObject({ id: "duo-1", modelId: "duo", name: "Duo" }),
      outerScreenSource: "video",
      outerScreenVideo: sampleVideo,
      screenSource: "video",
      screenVideo: sampleVideo,
    };
    const hiddenPhone: DeviceObject = {
      ...createSceneObject({ id: "phone-2", modelId: "smartphone", name: "Hidden" }),
      isVisible: false,
    };
    const mutedMusic = {
      ...createAudioObject({
        audio: createSceneAudio({
          durationMs: 4000,
          name: "song.mp3",
          url: "blob:song",
        }),
        name: "Music",
      }),
      isVisible: false,
    };

    // phone (1 + 1 vídeo) + duo (1 + 2 vídeos) + mutedMusic (1) = 6
    // hiddenPhone (0) fica fora.
    expect(
      countTimelineTracks([phone, duo, hiddenPhone, mutedMusic]),
    ).toBe(6);
  });

  it("fits visible tracks automatically and caps auto height at 35vh", () => {
    expect(getMinTimelineHeight(16)).toBe(141);
    expect(getAutoTimelineHeight(0, 800, 16)).toBe(141);
    expect(getAutoTimelineHeight(2, 800, 16)).toBe(141);
    expect(getAutoTimelineHeight(3, 800, 16)).toBe(169);
    expect(getAutoTimelineHeight(6, 800, 16)).toBe(253);
    // 8 faixas = 309px, limitado a 35% de 800px = 280px.
    expect(getAutoTimelineHeight(8, 800, 16)).toBe(280);
    // Numa tela alta (900px → 35vh = 315px), cabem todas as 8 faixas.
    expect(getAutoTimelineHeight(8, 900, 16)).toBe(309);
  });

  it("formats CSS clamp expressions for auto and manual heights", () => {
    expect(getAutoTimelineHeightCss(3)).toBe(
      "clamp(calc(8.75rem + 1px), calc(10.5rem + 1px), 35vh)",
    );
    expect(getManualTimelineHeightCss(240)).toBe(
      "clamp(calc(8.75rem + 1px), 240px, 50vh)",
    );
  });
});

describe("TimelineResizeHandle", () => {
  it("starts at the auto-fit height for the current tracks and grows with arrow keys", () => {
    const { handle, onChange } = renderHandle(null, 3);

    expect(handle).toHaveAttribute("aria-valuenow", "169");

    fireEvent.keyDown(handle, { key: "ArrowUp" });

    expect(onChange).toHaveBeenCalledWith(185);
  });

  it("never shrinks below the 2-track minimum height", () => {
    const { handle, onChange } = renderHandle(150, 5);

    fireEvent.keyDown(handle, { key: "ArrowDown" });

    expect(onChange).toHaveBeenCalledWith(141);
  });

  it("follows the pointer upwards from the auto height and stops at half the window", () => {
    const { handle, onChange } = renderHandle(null, 3);

    fireEvent.pointerDown(handle, { button: 0, clientY: 600, pointerId: 1 });
    fireEvent.pointerMove(handle, { clientY: 500, pointerId: 1 });
    expect(onChange).toHaveBeenLastCalledWith(269);

    fireEvent.pointerMove(handle, { clientY: 0, pointerId: 1 });
    expect(onChange).toHaveBeenLastCalledWith(400);
  });

  it("starts dragging from the capped 35vh auto height on crowded scenes without jumping", () => {
    const { handle, onChange } = renderHandle(null, 10);

    // 10 faixas = 365px, mas 35vh de 800px é 280px.
    expect(handle).toHaveAttribute("aria-valuenow", "280");

    fireEvent.pointerDown(handle, { button: 0, clientY: 500, pointerId: 1 });
    fireEvent.pointerMove(handle, { clientY: 480, pointerId: 1 });
    expect(onChange).toHaveBeenLastCalledWith(300);
  });

  it("goes back to auto-fit on double-click and on Home", () => {
    const { handle, onChange } = renderHandle(300, 3);

    fireEvent.doubleClick(handle);
    expect(onChange).toHaveBeenLastCalledWith(null);

    fireEvent.keyDown(handle, { key: "Home" });
    expect(onChange).toHaveBeenCalledTimes(2);
  });
});
