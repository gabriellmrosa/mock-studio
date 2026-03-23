import { fireEvent, render, screen, within } from "@testing-library/react";
import Home from "./page";

jest.mock("./components/CreditsModal/CreditsModal", () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock("./components/ContextMenu/ContextMenu", () => ({
  __esModule: true,
  default: ({
    items,
    triggerAriaLabel,
    triggerIcon,
  }: {
    items: Array<
      | { type: "action"; label: string; onClick: () => void }
      | { type: "submenu"; label: string; options: Array<{ label: string }> }
    >;
    triggerAriaLabel: string;
    triggerIcon: React.ReactNode;
  }) => (
    <div>
      <button type="button" aria-label={triggerAriaLabel}>
        {triggerIcon}
      </button>
      {items
        .filter((item) => item.type === "action")
        .map((item) => (
          <button
            key={`${triggerAriaLabel}-${item.label}`}
            type="button"
            onClick={item.onClick}
          >
            {item.label}
          </button>
        ))}
    </div>
  ),
}));

jest.mock("./components/MockupCanvas/MockupCanvas", () => ({
  __esModule: true,
  default: ({
    objects,
    onSelectObject,
  }: {
    objects: Array<{ id: string; name: string; isVisible: boolean }>;
    onSelectObject: (id: string) => void;
  }) => (
    <div data-testid="mockup-canvas">
      <p>visible:{objects.filter((object) => object.isVisible).length}</p>
      {objects.map((object) => (
        <button
          key={object.id}
          type="button"
          onClick={() => onSelectObject(object.id)}
        >
          select-{object.name}
        </button>
      ))}
    </div>
  ),
}));

jest.mock("./components/InspectorPanel/InspectorPanel", () => ({
  __esModule: true,
  default: ({
    object,
  }: {
    object: { name: string; modelId: string; positionX: number } | null;
  }) => (
    <aside data-testid="inspector-panel">
      {object
        ? `${object.name} :: ${object.modelId} :: x=${object.positionX.toFixed(2)}`
        : "no-selection"}
    </aside>
  ),
}));

describe("Home page layers and selection flow", () => {
  beforeAll(() => {
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: jest.fn().mockImplementation(() => ({
        addEventListener: jest.fn(),
        addListener: jest.fn(),
        dispatchEvent: jest.fn(),
        matches: true,
        media: "",
        onchange: null,
        removeEventListener: jest.fn(),
        removeListener: jest.fn(),
      })),
    });
  });

  it("adds objects and keeps the latest one selected", () => {
    render(<Home />);

    expect(screen.getByTestId("inspector-panel")).toHaveTextContent(
      "Object 1 :: smartphone :: x=0.00",
    );

    fireEvent.click(screen.getByLabelText("Add layer"));

    expect(screen.getByTestId("inspector-panel")).toHaveTextContent(
      "Object 2 :: smartphone :: x=1.94",
    );
    expect(screen.getByTestId("mockup-canvas")).toHaveTextContent("visible:2");
  });

  it("selects an object from the mocked canvas", () => {
    render(<Home />);

    fireEvent.click(screen.getByLabelText("Add layer"));
    fireEvent.click(screen.getByRole("button", { name: "select-Object 1" }));

    expect(screen.getByTestId("inspector-panel")).toHaveTextContent(
      "Object 1 :: smartphone :: x=0.00",
    );
  });

  it("toggles visibility from the layer eye button", () => {
    render(<Home />);

    fireEvent.click(screen.getByLabelText("Add layer"));

    const secondLayer = screen.getByText("Object 2").closest('[role="button"]');

    expect(secondLayer).not.toBeNull();

    const hideButton = within(secondLayer as HTMLElement).getByTitle("Hide");
    fireEvent.click(hideButton);

    expect(screen.getByTestId("mockup-canvas")).toHaveTextContent("visible:1");
  });

  it("falls back to the base object when the selected object is removed", () => {
    render(<Home />);

    fireEvent.click(screen.getByLabelText("Add layer"));
    expect(screen.getByTestId("inspector-panel")).toHaveTextContent("Object 2");

    const objectOptionsButtons = screen.getAllByLabelText("Layer options");
    fireEvent.click(objectOptionsButtons[1]);

    const deleteButtons = screen.getAllByText("Delete");
    fireEvent.click(deleteButtons[0]);

    expect(screen.getByTestId("inspector-panel")).toHaveTextContent(
      "Object 1 :: smartphone :: x=0.00",
    );
  });
});
