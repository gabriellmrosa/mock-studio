import { fireEvent, render, screen } from "@testing-library/react";
import Modal from "./Modal";

function renderModal(props: Partial<Parameters<typeof Modal>[0]> = {}) {
  const onClose = jest.fn();

  render(
    <Modal closeLabel="Close credits" eyebrow="Licensing" isOpen onClose={onClose} title="Credits" {...props}>
      <p>Body text</p>
      <a href="https://example.com">A link</a>
    </Modal>,
  );

  return onClose;
}

describe("Modal", () => {
  it("is a dialog named by its title, with the eyebrow and any content", () => {
    renderModal();

    expect(screen.getByRole("dialog", { name: "Credits" })).toBeInTheDocument();
    expect(screen.getByText("Licensing")).toBeInTheDocument();
    expect(screen.getByText("Body text")).toBeInTheDocument();
  });

  it("leaves the eyebrow out when there is none", () => {
    renderModal({ eyebrow: undefined });

    expect(screen.queryByText("Licensing")).not.toBeInTheDocument();
  });

  it("closes from the ✕, named for screen readers", () => {
    const onClose = renderModal();

    fireEvent.click(screen.getByRole("button", { name: "Close credits" }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("closes with Esc", () => {
    const onClose = renderModal();

    fireEvent.keyDown(window, { key: "Escape" });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("closes by a click outside, but not by a click inside", () => {
    const onClose = renderModal();

    fireEvent.click(screen.getByText("Body text"));
    expect(onClose).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("dialog").parentElement as HTMLElement);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("keeps the page from scrolling behind it, and gives it back", () => {
    document.body.style.overflow = "auto";

    const { unmount } = render(
      <Modal closeLabel="Close" isOpen onClose={jest.fn()} title="Credits">
        x
      </Modal>,
    );

    expect(document.body.style.overflow).toBe("hidden");

    unmount();

    expect(document.body.style.overflow).toBe("auto");
  });

  it("keeps the focus inside: Tab from the last control goes back to the first", () => {
    renderModal();

    const close = screen.getByRole("button", { name: "Close credits" });
    const link = screen.getByRole("link", { name: "A link" });

    link.focus();
    fireEvent.keyDown(window, { key: "Tab" });

    expect(close).toHaveFocus();

    close.focus();
    fireEvent.keyDown(window, { key: "Tab", shiftKey: true });

    expect(link).toHaveFocus();
  });

  it("gives the focus back to what opened it", () => {
    const opener = document.createElement("button");

    document.body.appendChild(opener);
    opener.focus();

    const { unmount } = render(
      <Modal closeLabel="Close" isOpen onClose={jest.fn()} title="Credits">
        x
      </Modal>,
    );

    unmount();

    expect(opener).toHaveFocus();
    opener.remove();
  });

  it("renders nothing when closed", () => {
    renderModal({ isOpen: false });

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
