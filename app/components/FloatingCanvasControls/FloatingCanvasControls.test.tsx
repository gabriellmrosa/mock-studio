import { fireEvent, render, screen } from "@testing-library/react";
import { DEFAULT_CANVAS_GRID, type CanvasGrid } from "../../lib/canvas-grid";
import {
  DEFAULT_CANVAS_BACKGROUND,
  DEFAULT_CANVAS_COLOR,
  type CanvasBackground,
} from "../../lib/canvas-background";
import { APP_COPY } from "../../lib/i18n";
import FloatingCanvasControls from "./FloatingCanvasControls";

const copy = APP_COPY["en-US"];

function renderControls(
  grid: CanvasGrid = DEFAULT_CANVAS_GRID,
  background: CanvasBackground = DEFAULT_CANVAS_BACKGROUND,
  { editable = true }: { editable?: boolean } = {},
) {
  const onChange = jest.fn();
  const handlers = { onChange };

  render(
    <FloatingCanvasControls
      backgroundEditor={
        editable
          ? {
              onChange,
              value: { ...background, color: DEFAULT_CANVAS_COLOR.dark, grid },
            }
          : null
      }
      backgroundSwatch={DEFAULT_CANVAS_COLOR.dark}
      copy={copy}
      isUiHidden={false}
      locale="en-US"
      onFitToScene={jest.fn()}
      onPanDown={jest.fn()}
      onPanLeft={jest.fn()}
      onPanRight={jest.fn()}
      onPanUp={jest.fn()}
      onTakePhoto={jest.fn()}
      onToggleUiHidden={jest.fn()}
      onZoomIn={jest.fn()}
      onZoomOut={jest.fn()}
      takePhotoDisabled={false}
      uiTheme="dark"
    />,
  );

  return handlers;
}

function openPanel() {
  fireEvent.click(screen.getByRole("button", { name: copy.backgroundColorButton }));
}

describe("background and grid panel", () => {
  it("opens from the background button, with the background and the grid apart", () => {
    renderControls();

    expect(screen.queryByRole("dialog", { name: copy.backgroundColorButton })).not.toBeInTheDocument();

    openPanel();

    expect(screen.getByRole("dialog", { name: copy.backgroundColorButton })).toBeInTheDocument();
    expect(screen.getByText(copy.canvasBackgroundSection)).toBeInTheDocument();
    expect(screen.getByText(copy.canvasGridSection)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: copy.backgroundColorButton })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
  });

  it("changes the grid opacity as a fraction, leaving the color alone", () => {
    const { onChange } = renderControls();

    openPanel();

    const opacity = screen.getByLabelText(copy.canvasGridOpacityLabel);

    expect(opacity).toHaveValue("100");

    fireEvent.change(opacity, { target: { value: "40" } });
    fireEvent.blur(opacity);

    expect(onChange).toHaveBeenCalledWith({ grid: { opacity: 0.4 } });
  });

  it("shows the automatic grid color: the usual light one on the dark default background", () => {
    renderControls();

    openPanel();

    expect(screen.getAllByLabelText(copy.canvasGridColorLabel)[0]).toHaveValue("#888888");
  });

  it("shows a chosen grid color", () => {
    renderControls({ color: "#ff0000", opacity: 1 });

    openPanel();

    expect(screen.getAllByLabelText(copy.canvasGridColorLabel)[0]).toHaveValue("#ff0000");
  });

  it("can only go back to automatic once something was changed", () => {
    const { onChange } = renderControls({ color: "#ff0000", opacity: 0.5 });

    openPanel();

    const reset = screen.getByRole("button", { name: copy.canvasGridResetLabel });

    expect(reset).toBeEnabled();

    fireEvent.click(reset);

    expect(onChange).toHaveBeenCalledWith({ grid: { color: null, opacity: 1 } });
  });

  it("has nothing to reset while the grid is automatic", () => {
    renderControls();

    openPanel();

    expect(screen.getByRole("button", { name: copy.canvasGridResetLabel })).toBeDisabled();
  });

  it("closes with Esc and with a click outside", () => {
    renderControls();

    openPanel();
    fireEvent.keyDown(document, { key: "Escape" });

    expect(screen.queryByRole("dialog", { name: copy.backgroundColorButton })).not.toBeInTheDocument();

    openPanel();
    fireEvent.mouseDown(document.body);

    expect(screen.queryByRole("dialog", { name: copy.backgroundColorButton })).not.toBeInTheDocument();
  });
});

describe("background style", () => {
  it("switches to a flat background from the style tabs", () => {
    const { onChange } = renderControls();

    openPanel();
    fireEvent.click(screen.getByRole("tab", { name: copy.canvasBackgroundFlat }));

    expect(onChange).toHaveBeenCalledWith({ style: "flat" });
  });

  it("hides the floor grid on a flat background and offers the gradient", () => {
    renderControls(DEFAULT_CANVAS_GRID, { gradient: null, style: "flat" });

    openPanel();

    expect(screen.queryByText(copy.canvasGridSection)).not.toBeInTheDocument();
    expect(screen.getByRole("switch", { name: copy.canvasGradientLabel })).toHaveAttribute(
      "aria-checked",
      "false",
    );
    expect(screen.queryByLabelText(copy.canvasGradientAngleLabel)).not.toBeInTheDocument();
  });

  it("turns the gradient on from the default background color, top to bottom", () => {
    const { onChange } = renderControls(DEFAULT_CANVAS_GRID, {
      gradient: null,
      style: "flat",
    });

    openPanel();
    fireEvent.click(screen.getByRole("switch", { name: copy.canvasGradientLabel }));

    expect(onChange).toHaveBeenCalledWith({
      gradient: { angle: 180, color: expect.stringMatching(/^#[0-9a-f]{6}$/) },
    });
  });

  it("changes only the angle of the gradient", () => {
    const { onChange } = renderControls(DEFAULT_CANVAS_GRID, {
      gradient: { angle: 180, color: "#000000" },
      style: "flat",
    });

    openPanel();

    const angle = screen.getByLabelText(copy.canvasGradientAngleLabel);

    fireEvent.change(angle, { target: { value: "90" } });
    fireEvent.blur(angle);

    expect(onChange).toHaveBeenCalledWith({ gradient: { angle: 90 } });
  });
});

it("says how to reach a keyframe when the Background animates and none is selected", () => {
  renderControls(DEFAULT_CANVAS_GRID, DEFAULT_CANVAS_BACKGROUND, { editable: false });

  openPanel();

  expect(screen.getByText(copy.motionEmptyHint)).toBeInTheDocument();
  expect(screen.queryByRole("tab", { name: copy.canvasBackgroundFlat })).not.toBeInTheDocument();
});
