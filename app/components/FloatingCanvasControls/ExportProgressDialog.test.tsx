import { fireEvent, render, screen } from "@testing-library/react";
import ExportProgressDialog from "./ExportProgressDialog";
import { APP_COPY } from "../../lib/i18n";

const copy = APP_COPY["en-US"];

function renderProgress(
  progress: { done: number; remainingMs: number | null; total: number } | null,
  onCancel = jest.fn(),
) {
  render(
    <ExportProgressDialog
      copy={copy}
      locale="en-US"
      progress={progress}
      onCancel={onCancel}
    />,
  );

  return onCancel;
}

describe("ExportProgressDialog", () => {
  it("is closed while nothing is exporting", () => {
    renderProgress(null);

    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("shows the bar, the frame and the time left", () => {
    renderProgress({ done: 220, remainingMs: 95_000, total: 1040 });

    expect(screen.getByRole("dialog", { name: "Exporting video" })).toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "21");
    expect(screen.getByText("Frame 220 of 1,040")).toBeInTheDocument();
    expect(screen.getByText("21%")).toBeInTheDocument();
    expect(screen.getByText("About 2 minutes left")).toBeInTheDocument();
  });

  it("rounds short waits up to 5 seconds", () => {
    renderProgress({ done: 900, remainingMs: 12_000, total: 1000 });
    expect(screen.getByText("About 15 seconds left")).toBeInTheDocument();
  });

  it("says it is estimating before there is a pace", () => {
    renderProgress({ done: 3, remainingMs: null, total: 1000 });
    expect(screen.getByText(copy.videoExportEstimating)).toBeInTheDocument();
  });

  it("says it is finishing once every frame is done", () => {
    renderProgress({ done: 1000, remainingMs: null, total: 1000 });
    expect(screen.getByText(copy.videoExportFinishing)).toBeInTheDocument();
  });

  it("only cancels from the button, never from Escape or the backdrop", () => {
    const onCancel = renderProgress({ done: 10, remainingMs: null, total: 100 });

    fireEvent.keyDown(window, { key: "Escape" });
    fireEvent.click(screen.getByRole("dialog").parentElement!);
    expect(onCancel).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
