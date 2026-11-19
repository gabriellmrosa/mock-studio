import { fireEvent, render, screen } from "@testing-library/react";
import {
  CanvasErrorBoundary,
  CanvasRecoveryCard,
} from "./CanvasErrorBoundary";

function CrashOnRender({ shouldCrash }: { shouldCrash: () => boolean }) {
  if (shouldCrash()) {
    throw new Error("WebGL boom");
  }

  return <div data-testid="canvas-ok">Canvas ready</div>;
}

describe("CanvasErrorBoundary", () => {
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it("catches render errors, shows recovery UI and retries when requested", () => {
    let shouldCrash = true;
    const onRetry = jest.fn(() => {
      shouldCrash = false;
    });
    const onReloadPage = jest.fn();

    render(
      <CanvasErrorBoundary
        title="Something went wrong in the 3D view"
        body="Try reloading the viewer."
        retryLabel="Try again"
        reloadPageLabel="Reload page"
        onRetry={onRetry}
        onReloadPage={onReloadPage}
      >
        <CrashOnRender shouldCrash={() => shouldCrash} />
      </CanvasErrorBoundary>,
    );

    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(
      screen.getByText("Something went wrong in the 3D view"),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Reload page" }));
    expect(onReloadPage).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("canvas-ok")).toBeInTheDocument();
  });
});

describe("CanvasRecoveryCard", () => {
  it("renders WebGL lost copy and triggers primary and reload actions", () => {
    const onPrimaryAction = jest.fn();
    const onReloadPage = jest.fn();

    render(
      <CanvasRecoveryCard
        title="The 3D viewer was interrupted"
        body="Your scene is still here."
        primaryLabel="Reload viewer"
        reloadPageLabel="Reload page"
        onPrimaryAction={onPrimaryAction}
        onReloadPage={onReloadPage}
      />,
    );

    expect(
      screen.getByText("The 3D viewer was interrupted"),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Reload viewer" }));
    fireEvent.click(screen.getByRole("button", { name: "Reload page" }));

    expect(onPrimaryAction).toHaveBeenCalledTimes(1);
    expect(onReloadPage).toHaveBeenCalledTimes(1);
  });
});
