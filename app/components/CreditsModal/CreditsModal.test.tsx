import { fireEvent, render, screen } from "@testing-library/react";
import { APP_COPY } from "../../lib/i18n";
import CreditsModal from "./CreditsModal";

const copy = APP_COPY["en-US"];

describe("CreditsModal", () => {
  it("lists the credits inside the shared reading modal", () => {
    render(<CreditsModal copy={copy} isOpen onClose={jest.fn()} />);

    expect(screen.getByRole("dialog", { name: copy.creditsTitle })).toBeInTheDocument();
    expect(screen.getByText(copy.creditsEyebrow)).toBeInTheDocument();
    expect(screen.getByText("Stickers — Fluent Emoji (Color)")).toBeInTheDocument();
    expect(screen.getByText("Animated stickers — Noto Animated Emoji")).toBeInTheDocument();
    expect(screen.getByText("Theme — Dracula")).toBeInTheDocument();
  });

  it("closes from the ✕", () => {
    const onClose = jest.fn();

    render(<CreditsModal copy={copy} isOpen onClose={onClose} />);
    fireEvent.click(screen.getByRole("button", { name: copy.creditsCloseButton }));

    expect(onClose).toHaveBeenCalled();
  });
});
