import { act, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import ExportDialog, { type ExportKind } from "./ExportDialog";
import { APP_COPY } from "../../lib/i18n";
import {
  DEFAULT_VIDEO_EXPORT_SETTINGS,
  type VideoExportSettings,
} from "../../lib/video-export";

jest.mock("../MockupCanvas/export-video", () => ({
  canExportVideo: jest.fn(() => Promise.resolve(true)),
}));

const copy = APP_COPY["en-US"];
const PHOTO_OPTIONS = [
  { badge: "Full HD", height: 1080, id: "full-hd", width: 1920 },
  { badge: "4K", height: 2160, id: "ultra-hd", width: 3840 },
] as const;

/**
 * O dialog com o estado que o FloatingCanvasControls guardaria. `onExport`
 * recebe as escolhas do momento, para o teste conferir o que sairia.
 */
function Harness({
  durationMs = 4000,
  isMotion = true,
  onCancel = jest.fn(),
  onCreateProjectLink = jest.fn(() =>
    Promise.resolve("https://mock.studio/#scene=abc"),
  ),
  onExport = jest.fn(),
}: {
  durationMs?: number;
  isMotion?: boolean;
  onCancel?: jest.Mock;
  onCreateProjectLink?: jest.Mock;
  onExport?: jest.Mock;
}) {
  const [kind, setKind] = useState<ExportKind>("image");
  const [photoSizeId, setPhotoSizeId] = useState("full-hd");
  const [withBg, setWithBg] = useState(false);
  const [saveTemplate, setSaveTemplate] = useState(true);
  const [settings, setSettings] = useState<VideoExportSettings>(
    DEFAULT_VIDEO_EXPORT_SETTINGS,
  );

  return (
    <ExportDialog
      backgroundSwatch={{ background: "#000", border: "none" }}
      copy={copy}
      exportWithBg={withBg}
      isOpen
      kind={kind}
      locale="en-US"
      photoOptions={PHOTO_OPTIONS}
      photoSizeId={photoSizeId}
      saveTemplate={saveTemplate}
      video={
        isMotion
          ? {
              durationMs,
              frame: { height: 1080, width: 1920 },
              onSettingsChange: setSettings,
              settings,
            }
          : undefined
      }
      onCancel={onCancel}
      onCreateProjectLink={onCreateProjectLink}
      onExport={() =>
        onExport({ kind, photoSizeId, saveTemplate, settings, withBg })
      }
      onExportWithBgChange={setWithBg}
      onKindChange={setKind}
      onPhotoSizeChange={setPhotoSizeId}
      onSaveTemplateChange={setSaveTemplate}
    />
  );
}

function choose(select: string, option: RegExp | string) {
  fireEvent.click(screen.getByRole("button", { name: select }));
  fireEvent.click(screen.getByRole("option", { name: option }));
}

async function chooseVideo() {
  choose("Format", /Video/);
  // Deixa a checagem de suporte (assíncrona) terminar.
  await act(async () => {});
}

describe("ExportDialog", () => {
  beforeAll(() => {
    // O jsdom não rola nada; o select chama isto ao abrir a lista.
    Element.prototype.scrollIntoView = jest.fn();
  });

  it("is a modal dialog with Cancel and a single Export", () => {
    render(<Harness />);

    expect(screen.getByRole("dialog", { name: "Export" })).toHaveAttribute(
      "aria-modal",
      "true",
    );
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Export" })).toHaveFocus();
  });

  it("has no format choice in Static, only the image settings", () => {
    render(<Harness isMotion={false} />);

    expect(screen.queryByRole("button", { name: "Format" })).toBeNull();
    expect(screen.getByRole("button", { name: "Size" })).toHaveTextContent(
      "1920 × 1080",
    );
  });

  it("exports nothing until Export, then what was chosen", () => {
    const onExport = jest.fn();
    render(<Harness onExport={onExport} />);

    choose("Size", /3840 × 2160/);
    choose("Background", /With background/);
    fireEvent.click(screen.getByRole("checkbox", { name: "Save as template" }));

    expect(onExport).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Export" }));

    expect(onExport).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: "image",
        photoSizeId: "ultra-hd",
        saveTemplate: false,
        withBg: true,
      }),
    );
  });

  it("cancels from the button, Escape and the backdrop", () => {
    const onCancel = jest.fn();
    render(<Harness onCancel={onCancel} />);

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    fireEvent.keyDown(window, { key: "Escape" });
    fireEvent.click(screen.getByRole("dialog").parentElement!);

    expect(onCancel).toHaveBeenCalledTimes(3);
  });

  it("closes an open select on Escape without closing the dialog", () => {
    const onCancel = jest.fn();
    render(<Harness onCancel={onCancel} />);

    fireEvent.click(screen.getByRole("button", { name: "Size" }));
    fireEvent.keyDown(document, { key: "Escape" });

    expect(screen.queryByRole("listbox")).toBeNull();
    expect(onCancel).not.toHaveBeenCalled();
  });

  it("sums up the video and updates it as settings change", async () => {
    render(<Harness />);
    await chooseVideo();

    expect(screen.queryByRole("button", { name: "Destination" })).toBeNull();
    expect(screen.getByText("MP4 · 1920 × 1080 · 60 fps · 4.0 s")).toBeInTheDocument();

    choose("Background", /Transparent/);
    choose("Frame rate", "30 fps");
    choose("Resolution", /3840 × 2160/);

    expect(screen.getByText("WEBM · 3840 × 2160 · 30 fps · 4.0 s")).toBeInTheDocument();
  });

  it("exports the video with the chosen settings", async () => {
    const onExport = jest.fn();
    render(<Harness onExport={onExport} />);
    await chooseVideo();

    choose("Frame rate", "30 fps");
    fireEvent.click(screen.getByRole("button", { name: "Export" }));

    expect(onExport).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: "video",
        settings: { background: true, fps: 30, scale: 1 },
      }),
    );
  });

  describe("in Safari", () => {
    beforeEach(() => {
      jest
        .spyOn(navigator, "userAgent", "get")
        .mockReturnValue(
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Safari/605.1.15",
        );
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it("suggests another browser for a transparent video, without blocking it", async () => {
      render(<Harness />);
      await chooseVideo();

      expect(screen.queryByRole("note")).toBeNull();

      choose("Background", /Transparent/);

      expect(screen.getByRole("note")).toHaveTextContent(
        copy.videoExportSafariTransparent,
      );
      expect(screen.getByRole("button", { name: "Export" })).toBeEnabled();
    });

    it("copies a link to the scene, to open it in another browser", async () => {
      const writeText = jest.fn(() => Promise.resolve());
      const onCreateProjectLink = jest.fn(() =>
        Promise.resolve("https://mock.studio/#scene=abc"),
      );

      Object.assign(navigator, { clipboard: { writeText } });
      render(<Harness onCreateProjectLink={onCreateProjectLink} />);
      await chooseVideo();
      choose("Background", /Transparent/);

      fireEvent.click(screen.getByRole("button", { name: "Copy project link" }));
      await act(async () => {});

      expect(onCreateProjectLink).toHaveBeenCalled();
      expect(writeText).toHaveBeenCalledWith("https://mock.studio/#scene=abc");
      expect(screen.getByRole("button", { name: "Link copied" })).toBeInTheDocument();
    });
  });

  it("shows no Safari notice in other browsers", async () => {
    render(<Harness />);
    await chooseVideo();
    choose("Background", /Transparent/);

    expect(screen.queryByRole("note")).toBeNull();
  });

  it("explains and blocks the video export when nothing is animated", async () => {
    render(<Harness durationMs={0} />);
    await chooseVideo();

    expect(screen.getByText(copy.videoExportUnavailable)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Export" })).toBeDisabled();
  });
});
