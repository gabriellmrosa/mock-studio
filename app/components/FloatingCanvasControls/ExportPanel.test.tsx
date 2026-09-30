import { act, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import ExportPanel, { type ExportTab } from "./ExportPanel";
import { APP_COPY } from "../../lib/i18n";
import {
  getVideoExportPreset,
  type VideoExportSettings,
} from "../../lib/video-export";

jest.mock("../MockupCanvas/export-video", () => ({
  canExportVideo: jest.fn(() => Promise.resolve(true)),
}));

const copy = APP_COPY["en-US"];
const PHOTO_OPTIONS = [
  { height: 1080, id: "full-hd", label: "1920x1080", width: 1920 },
] as const;

/** O painel com o estado que o FloatingCanvasControls guardaria. */
function Harness({
  durationMs = 4000,
  isMotion = true,
  onExportPhoto = jest.fn(),
  onExportVideo = jest.fn(),
}: {
  durationMs?: number;
  isMotion?: boolean;
  onExportPhoto?: jest.Mock;
  onExportVideo?: jest.Mock;
}) {
  const [tab, setTab] = useState<ExportTab>("image");
  const [saveTemplate, setSaveTemplate] = useState(true);
  const [settings, setSettings] = useState<VideoExportSettings>(
    getVideoExportPreset("social"),
  );

  return (
    <ExportPanel
      backgroundSwatch={{ background: "#000", border: "none" }}
      copy={copy}
      exportWithBg={false}
      locale="en-US"
      photoOptions={PHOTO_OPTIONS}
      saveTemplate={saveTemplate}
      tab={tab}
      video={
        isMotion
          ? {
              durationMs,
              frame: { height: 1080, width: 1920 },
              onExport: onExportVideo,
              onSettingsChange: setSettings,
              settings,
            }
          : undefined
      }
      onExportPhoto={onExportPhoto}
      onExportWithBgChange={jest.fn()}
      onSaveTemplateChange={setSaveTemplate}
      onTabChange={setTab}
    />
  );
}

async function openVideoTab() {
  fireEvent.click(screen.getByRole("tab", { name: "Video" }));
  // Deixa a checagem de suporte (assíncrona) terminar.
  await act(async () => {});
}

describe("ExportPanel", () => {
  it("has no tabs in Static, only the image export", () => {
    render(<Harness isMotion={false} />);

    expect(screen.queryByRole("tab")).toBeNull();
    expect(screen.getByText("1920x1080")).toBeInTheDocument();
  });

  it("splits Image and Video in Motion, starting on Image", () => {
    render(<Harness />);

    expect(screen.getByRole("tab", { name: "Image" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByText("1920x1080")).toBeInTheDocument();
  });

  it("offers saving as a template as a checkbox, checked by default", () => {
    const onExportPhoto = jest.fn();
    render(<Harness onExportPhoto={onExportPhoto} />);

    const checkbox = screen.getByRole("checkbox", { name: "Save as template" });

    expect(checkbox).toBeChecked();
    fireEvent.click(checkbox);
    expect(checkbox).not.toBeChecked();

    fireEvent.click(screen.getByText("1920x1080"));
    expect(onExportPhoto).toHaveBeenCalledWith(PHOTO_OPTIONS[0]);
  });

  it("sums up the video setup and switches it from a destination", async () => {
    render(<Harness />);
    await openVideoTab();

    expect(
      screen.getByRole("radio", { name: /Social and presentations/ }),
    ).toHaveAttribute("aria-checked", "true");
    expect(screen.getByText("MP4 · 1920 × 1080 · 60 fps · 4.0 s")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("radio", { name: /Website, no background/ }));

    expect(screen.getByText("WEBM · 1920 × 1080 · 30 fps · 4.0 s")).toBeInTheDocument();
  });

  it("clears the destination once a setting is customized", async () => {
    render(<Harness />);
    await openVideoTab();

    fireEvent.click(screen.getByRole("button", { name: "Customize" }));
    fireEvent.click(screen.getByRole("tab", { name: "30" }));

    expect(
      screen
        .getAllByRole("radio")
        .every((radio) => radio.getAttribute("aria-checked") === "false"),
    ).toBe(true);
    expect(screen.getByText("MP4 · 1920 × 1080 · 30 fps · 4.0 s")).toBeInTheDocument();
  });

  it("exports the video with the chosen settings", async () => {
    const onExportVideo = jest.fn();
    render(<Harness onExportVideo={onExportVideo} />);
    await openVideoTab();

    fireEvent.click(screen.getByRole("button", { name: "Export video" }));

    expect(onExportVideo).toHaveBeenCalledWith({
      background: true,
      fps: 60,
      scale: 1,
    });
  });

  it("explains and blocks the video export when nothing is animated", async () => {
    render(<Harness durationMs={0} />);
    await openVideoTab();

    expect(screen.getByText(copy.videoExportUnavailable)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Export video" })).toBeDisabled();
  });
});
