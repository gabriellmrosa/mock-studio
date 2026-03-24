import { fireEvent, render, screen } from "@testing-library/react";
import Snackbar, { type SnackbarNotification } from "./Snackbar";

describe("Snackbar", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  function renderSnackbar(
    notification: SnackbarNotification | null = {
      id: 1,
      message: "Foto exportada com sucesso. Confira a pasta Downloads.",
      tone: "success",
    },
  ) {
    const onDismiss = jest.fn();

    render(
      <Snackbar
        dismissLabel="Fechar aviso"
        notification={notification}
        onDismiss={onDismiss}
      />,
    );

    return { onDismiss };
  }

  it("dismisses itself after the default timeout", () => {
    const { onDismiss } = renderSnackbar();

    jest.advanceTimersByTime(4000);

    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("allows manual dismissal", () => {
    const { onDismiss } = renderSnackbar();

    fireEvent.click(screen.getByRole("button", { name: "Fechar aviso" }));

    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("renders nothing without an active notification", () => {
    renderSnackbar(null);

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
