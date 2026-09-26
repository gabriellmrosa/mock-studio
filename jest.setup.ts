import "@testing-library/jest-dom";

// jsdom não implementa ResizeObserver, usado pelo PanelSection colapsável para
// medir as alturas aberta e fechada. O stub apenas evita o ReferenceError: em
// jsdom todas as medidas são 0, então não há tamanho real para observar.
if (typeof globalThis.ResizeObserver === "undefined") {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
}
