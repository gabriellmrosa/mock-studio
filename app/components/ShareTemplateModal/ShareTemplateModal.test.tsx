import { act, fireEvent, render, screen } from "@testing-library/react";
import { APP_COPY } from "../../lib/i18n";
import ShareTemplateModal from "./ShareTemplateModal";

const copy = APP_COPY["en-US"];

describe("ShareTemplateModal", () => {
  it("stays closed without a code", () => {
    render(<ShareTemplateModal code={null} copy={copy} onClose={jest.fn()} />);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("explains what travels, what does not and what to do next, and shows the code read-only", () => {
    render(<ShareTemplateModal code="CODE123" copy={copy} onClose={jest.fn()} />);

    expect(screen.getByText(copy.shareTemplateIntro)).toBeInTheDocument();
    expect(screen.getByText(copy.shareTemplateNote)).toBeInTheDocument();
    expect(screen.getByText(copy.shareTemplateNext)).toBeInTheDocument();
    expect(screen.getByLabelText(copy.shareTemplateCodeLabel)).toHaveAttribute("readonly");
  });

  it("copies the code and says so on the button", async () => {
    const writeText = jest.fn(() => Promise.resolve());

    Object.assign(navigator, { clipboard: { writeText } });
    render(<ShareTemplateModal code="CODE123" copy={copy} onClose={jest.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: copy.shareTemplateCopy }));
    await act(async () => {});

    expect(writeText).toHaveBeenCalledWith("CODE123");
    expect(
      screen.getByRole("button", { name: copy.templateCodeCopied }),
    ).toBeInTheDocument();
  });
});
