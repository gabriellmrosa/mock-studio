import { act, fireEvent, render, screen } from "@testing-library/react";
import { APP_COPY } from "../../lib/i18n";
import ImportTemplateModal from "./ImportTemplateModal";

const copy = APP_COPY["en-US"];

function renderModal(onImport = jest.fn(() => Promise.resolve(true)), onClose = jest.fn()) {
  render(
    <ImportTemplateModal copy={copy} isOpen onClose={onClose} onImport={onImport} />,
  );

  return { onClose, onImport };
}

function paste(text: string) {
  fireEvent.change(screen.getByLabelText(copy.importTemplateFieldLabel), {
    target: { value: text },
  });
}

async function submit() {
  fireEvent.click(screen.getByRole("button", { name: copy.importTemplateSubmit }));
  await act(async () => {});
}

describe("ImportTemplateModal", () => {
  it("explains what happens and what does not travel in the link", () => {
    renderModal();

    expect(screen.getByText(copy.importTemplateIntro)).toBeInTheDocument();
    expect(screen.getByText(copy.importTemplateNote)).toBeInTheDocument();
  });

  it("only lets importing once something was pasted", () => {
    renderModal();

    expect(
      screen.getByRole("button", { name: copy.importTemplateSubmit }),
    ).toBeDisabled();

    paste("https://mock.studio/#scene=abc");

    expect(
      screen.getByRole("button", { name: copy.importTemplateSubmit }),
    ).toBeEnabled();
  });

  it("hands over the pasted text and closes when the link is good", async () => {
    const { onClose, onImport } = renderModal();

    paste("https://mock.studio/#scene=abc");
    await submit();

    expect(onImport).toHaveBeenCalledWith("https://mock.studio/#scene=abc");
    expect(onClose).toHaveBeenCalled();
  });

  it("keeps the modal open and says so when the link is not good, until it is edited", async () => {
    const { onClose } = renderModal(jest.fn(() => Promise.resolve(false)));

    paste("nonsense");
    await submit();

    expect(screen.getByRole("alert")).toHaveTextContent(copy.importTemplateInvalid);
    expect(onClose).not.toHaveBeenCalled();

    paste("nonsense2");

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
