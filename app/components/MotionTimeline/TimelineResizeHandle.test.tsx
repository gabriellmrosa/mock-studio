import { fireEvent, render, screen } from "@testing-library/react";
import TimelineResizeHandle from "./TimelineResizeHandle";
import { APP_COPY } from "../../lib/i18n";

const copy = APP_COPY["en-US"];

// O jsdom não carrega tokens.css: a altura padrão vem daqui (9.5rem = 152px).
beforeAll(() => {
  document.documentElement.style.setProperty("--motion-timeline-height", "9.5rem");
  document.documentElement.style.fontSize = "16px";
  Object.defineProperty(window, "innerHeight", { configurable: true, value: 800 });

  if (!("PointerEvent" in window)) {
    Object.defineProperty(window, "PointerEvent", { value: MouseEvent });
  }

  // O jsdom não implementa captura de ponteiro.
  Element.prototype.setPointerCapture = () => undefined;
  Element.prototype.releasePointerCapture = () => undefined;
  Element.prototype.hasPointerCapture = () => false;
});

function renderHandle(height: number | null = null) {
  const onChange = jest.fn();

  render(<TimelineResizeHandle copy={copy} height={height} onChange={onChange} />);

  return { handle: screen.getByRole("separator", { name: "Timeline height" }), onChange };
}

describe("TimelineResizeHandle", () => {
  it("grows with the arrow keys from the default height", () => {
    const { handle, onChange } = renderHandle();

    expect(handle).toHaveAttribute("aria-valuenow", "152");

    fireEvent.keyDown(handle, { key: "ArrowUp" });

    expect(onChange).toHaveBeenCalledWith(168);
  });

  it("never shrinks below the default height", () => {
    const { handle, onChange } = renderHandle(160);

    fireEvent.keyDown(handle, { key: "ArrowDown" });

    expect(onChange).toHaveBeenCalledWith(152);
  });

  it("follows the pointer upwards and stops at half the window", () => {
    const { handle, onChange } = renderHandle();

    fireEvent.pointerDown(handle, { button: 0, clientY: 600, pointerId: 1 });
    fireEvent.pointerMove(handle, { clientY: 500, pointerId: 1 });
    expect(onChange).toHaveBeenLastCalledWith(252);

    fireEvent.pointerMove(handle, { clientY: 0, pointerId: 1 });
    expect(onChange).toHaveBeenLastCalledWith(400);
  });

  it("goes back to the default on double-click and on Home", () => {
    const { handle, onChange } = renderHandle(300);

    fireEvent.doubleClick(handle);
    expect(onChange).toHaveBeenLastCalledWith(null);

    fireEvent.keyDown(handle, { key: "Home" });
    expect(onChange).toHaveBeenCalledTimes(2);
  });
});
