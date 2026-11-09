import { act, render, screen } from "@testing-library/react";
import { SidePopover } from "./EditorPrimitives";

/**
 * O jsdom não mede nada nem tem PointerEvent: a janela ganha um tamanho, o
 * popover um tamanho, e os eventos de ponteiro saem como MouseEvent, que
 * trazem `clientX`/`clientY` e `button` como o React espera.
 */
function pointer(target: Element, type: string, clientX: number, clientY: number) {
  act(() => {
    target.dispatchEvent(
      new MouseEvent(type, { bubbles: true, button: 0, clientX, clientY }),
    );
  });
}

function renderPopover(onClose = jest.fn()) {
  const anchor = document.createElement("div");

  document.body.append(anchor);
  render(
    <SidePopover
      anchorRef={{ current: anchor }}
      closeLabel="Close"
      title="Image options"
      onClose={onClose}
    >
      <p>Content</p>
    </SidePopover>,
  );

  const panel = screen.getByRole("dialog", { name: "Image options" });
  const header = panel.querySelector(".side-popover-header")!;

  // O popover tem 272 × 400. Ao abrir, fica a 12 px do topo (o item está em
  // 0); a esquerda vem do `right`, que o jsdom não converte: 100.
  Object.defineProperties(panel, {
    offsetHeight: { configurable: true, value: 400 },
    offsetWidth: { configurable: true, value: 272 },
  });
  panel.getBoundingClientRect = () =>
    ({
      height: 400,
      left: parseFloat(panel.style.left) || 100,
      top: parseFloat(panel.style.top),
      width: 272,
    }) as DOMRect;

  return { header, panel };
}

describe("SidePopover", () => {
  beforeAll(() => {
    Object.defineProperties(document.documentElement, {
      clientHeight: { configurable: true, value: 900 },
      clientWidth: { configurable: true, value: 1440 },
    });
    Element.prototype.setPointerCapture = jest.fn();
  });

  it("moves with the pointer when dragged by its header", () => {
    const { header, panel } = renderPopover();

    // Pega 20 px dentro do canto e arrasta: o canto acompanha o ponteiro.
    pointer(header, "pointerdown", 120, 32);
    pointer(header, "pointermove", 620, 370);
    pointer(header, "pointerup", 620, 370);

    expect(panel.style.left).toBe("600px");
    expect(panel.style.top).toBe("350px");
    expect(panel.style.right).toBe("auto");
  });

  it("stays whole inside the window", () => {
    const { header, panel } = renderPopover();

    pointer(header, "pointerdown", 120, 32);
    pointer(header, "pointermove", 5000, -300);
    pointer(header, "pointerup", 5000, -300);

    // 1440 − 272 − 12 de folga; e 12 no topo.
    expect(panel.style.left).toBe("1156px");
    expect(panel.style.top).toBe("12px");
  });

  it("is not dragged from the close button, which still closes it", () => {
    const onClose = jest.fn();
    const { panel } = renderPopover(onClose);
    const close = screen.getByRole("button", { name: "Close" });

    pointer(close, "pointerdown", 120, 70);
    pointer(close, "pointermove", 620, 370);
    act(() => close.click());

    expect(panel.style.left).toBe("");
    expect(onClose).toHaveBeenCalled();
  });
});
