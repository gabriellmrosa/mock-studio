import { fireEvent, render, screen } from "@testing-library/react";
import { APP_COPY } from "../../lib/i18n";
import { PATCH_NOTES } from "../../lib/patch-notes";
import PatchNotesModal from "./PatchNotesModal";

const latest = PATCH_NOTES[0];

function renderModal(locale: "pt-BR" | "en-US", onClose = jest.fn()) {
  render(<PatchNotesModal copy={APP_COPY[locale]} isOpen locale={locale} onClose={onClose} />);

  return onClose;
}

describe("PatchNotesModal", () => {
  it("lists every version, the newest first", () => {
    renderModal("en-US");

    const numbers = screen.getAllByText(/^v\d+\.\d+\.\d+$/).map((node) => node.textContent);

    expect(numbers).toEqual(PATCH_NOTES.map((note) => `v${note.version}`));
  });

  it("writes the items in the language of the interface", () => {
    renderModal("pt-BR");

    expect(screen.getByText(latest.items[0].title["pt-BR"])).toBeInTheDocument();
    expect(screen.getByText(latest.items[0].description["pt-BR"])).toBeInTheDocument();
    expect(screen.queryByText(latest.items[0].title["en-US"])).not.toBeInTheDocument();
  });

  it("writes the date in that language too", () => {
    renderModal("pt-BR");

    expect(screen.getAllByText(/de novembro de 2026/).length).toBeGreaterThan(0);
  });

  it("is titled and closes from its button", () => {
    const onClose = renderModal("en-US");

    expect(screen.getByRole("dialog", { name: "What's new" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Close" }));

    expect(onClose).toHaveBeenCalled();
  });

  it("renders nothing when closed", () => {
    render(<PatchNotesModal copy={APP_COPY["en-US"]} isOpen={false} locale="en-US" onClose={jest.fn()} />);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
