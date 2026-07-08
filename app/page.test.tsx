import { fireEvent, render, screen, within } from "@testing-library/react";
import Home from "./page";

jest.mock("./components/CreditsModal/CreditsModal", () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock("./components/ContextMenu/ContextMenu", () => ({
  __esModule: true,
  default: function MockContextMenu({
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
  }) {
    const { useState } = jest.requireActual("react") as typeof import("react");
    const [isOpen, setIsOpen] = useState(false);

    return (
      <div>
        <button
          type="button"
          aria-label={triggerAriaLabel}
          onClick={() => setIsOpen((current) => !current)}
        >
          {triggerIcon}
        </button>
        {isOpen
          ? items
              .filter((item) => item.type === "action")
              .map((item) => (
                <button
                  key={`${triggerAriaLabel}-${item.label}`}
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    item.onClick();
                  }}
                >
                  {item.label}
                </button>
              ))
          : null}
      </div>
    );
  },
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
    onModelChange,
  }: {
    object: { name: string; modelId: string; positionX: number } | null;
    onModelChange: (modelId: string) => void;
  }) => (
    <aside data-testid="inspector-panel">
      <button type="button" onClick={() => onModelChange("smartwatch")}>
        change-model-smartwatch
      </button>
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

    fireEvent.click(screen.getByLabelText("Add object"));

    expect(screen.getByTestId("inspector-panel")).toHaveTextContent(
      "Object 2 :: smartphone :: x=1.95",
    );
    expect(screen.getByTestId("mockup-canvas")).toHaveTextContent("visible:2");
  });

  it("selects an object from the mocked canvas", () => {
    render(<Home />);

    fireEvent.click(screen.getByLabelText("Add object"));
    fireEvent.click(screen.getByRole("button", { name: "select-Object 1" }));

    expect(screen.getByTestId("inspector-panel")).toHaveTextContent(
      "Object 1 :: smartphone :: x=0.00",
    );
  });

  it("toggles visibility from the layer eye button", () => {
    render(<Home />);

    fireEvent.click(screen.getByLabelText("Add object"));

    const secondLayer = screen.getByText("Object 2").closest('[role="button"]');

    expect(secondLayer).not.toBeNull();

    const hideButton = within(secondLayer as HTMLElement).getByTitle("Hide");
    fireEvent.click(hideButton);

    expect(screen.getByTestId("mockup-canvas")).toHaveTextContent("visible:1");
  });

  it("falls back to the base object when the selected object is removed", () => {
    render(<Home />);

    fireEvent.click(screen.getByLabelText("Add object"));
    expect(screen.getByTestId("inspector-panel")).toHaveTextContent("Object 2");

    const objectOptionsButtons = screen.getAllByLabelText("Object options");
    fireEvent.click(objectOptionsButtons[1]);

    const deleteButtons = screen.getAllByText("Delete");
    fireEvent.click(deleteButtons[0]);

    expect(screen.getByTestId("inspector-panel")).toHaveTextContent(
      "Object 1 :: smartphone :: x=0.00",
    );
  });

  it("duplicates a layer preserving its state and selects the copy", () => {
    render(<Home />);

    const objectOptionsButtons = screen.getAllByLabelText("Object options");
    fireEvent.click(objectOptionsButtons[0]);
    fireEvent.click(screen.getByText("Duplicate"));

    expect(screen.getByTestId("inspector-panel")).toHaveTextContent(
      "Object 1 copy :: smartphone :: x=1.95",
    );
    expect(screen.getByTestId("mockup-canvas")).toHaveTextContent("visible:2");
  });

  it("adds the next layer to the side even when the previous layer changed model", () => {
    render(<Home />);

    fireEvent.click(screen.getByText("change-model-smartwatch"));
    expect(screen.getByTestId("inspector-panel")).toHaveTextContent(
      "Object 1 :: smartwatch :: x=0.00",
    );

    fireEvent.click(screen.getByLabelText("Add object"));

    expect(screen.getByTestId("inspector-panel")).toHaveTextContent(
      "Object 2 :: smartphone :: x=1.65",
    );
  });
});
