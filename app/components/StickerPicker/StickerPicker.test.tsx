import { fireEvent, render, screen } from "@testing-library/react";
import { APP_COPY } from "../../lib/i18n";
import StickerPicker from "./StickerPicker";

const copy = APP_COPY["pt-BR"];

function renderPicker(onPick = jest.fn()) {
  render(<StickerPicker copy={copy} isOpen onCancel={jest.fn()} onPick={onPick} />);

  return onPick;
}

describe("StickerPicker", () => {
  it("shows the first category and how many stickers it has", () => {
    renderPicker();

    expect(screen.getByRole("button", { name: "Rosto sorrindo" })).toBeInTheDocument();
    // A de outra categoria não está na grade.
    expect(screen.queryByRole("button", { name: "Foguete" })).not.toBeInTheDocument();
    expect(screen.getByText(/^87 stickers$/)).toBeInTheDocument();
  });

  it("hands over the id of the chosen sticker", () => {
    const onPick = renderPicker();

    fireEvent.click(screen.getByRole("button", { name: "Joinha" }));

    expect(onPick).toHaveBeenCalledWith("thumbs-up");
  });

  it("searches the whole catalog, ignoring accents and case", () => {
    renderPicker();

    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "CORACAO verm" } });

    expect(screen.getByRole("button", { name: "Coração vermelho" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Rosto sorrindo" })).not.toBeInTheDocument();
  });

  it("finds a sticker of another category by search", () => {
    renderPicker();

    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "foguete" } });

    expect(screen.getByRole("button", { name: "Foguete" })).toBeInTheDocument();
  });

  it("says so when nothing matches", () => {
    renderPicker();

    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "zzzz" } });

    expect(screen.getByText(copy.stickerNone)).toBeInTheDocument();
  });

  it("renders nothing when closed", () => {
    render(<StickerPicker copy={copy} isOpen={false} onCancel={jest.fn()} onPick={jest.fn()} />);

    expect(screen.queryByRole("searchbox")).not.toBeInTheDocument();
  });
});
