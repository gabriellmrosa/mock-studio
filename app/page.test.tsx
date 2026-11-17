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
    onResetObject,
    onUpdateText,
  }: {
    object: {
      name: string;
      modelId?: string;
      positionX: number;
      positionZ: number;
      text?: { content: string; fontSize: number };
      image?: { aspect: number; url: string | null };
    } | null;
    onModelChange: (modelId: string) => void;
    onResetObject: () => void;
    onUpdateText: (patch: { content?: string; fontSize?: number }) => void;
  }) => (
    <aside data-testid="inspector-panel">
      <button type="button" onClick={() => onModelChange("smartwatch")}>
        change-model-smartwatch
      </button>
      <button type="button" onClick={() => onUpdateText({ content: "Novo" })}>
        set-text
      </button>
      <button type="button" onClick={() => onUpdateText({ fontSize: 99999 })}>
        set-huge-size
      </button>
      <button type="button" onClick={onResetObject}>
        reset-object
      </button>
      {object
        ? object.image
          ? `${object.name} :: image :: file=${object.image.url ?? "none"} :: z=${object.positionZ.toFixed(2)}`
          : object.text
          ? `${object.name} :: text "${object.text.content}" :: size=${object.text.fontSize} :: z=${object.positionZ.toFixed(2)}`
          : `${object.name} :: ${object.modelId} :: x=${object.positionX.toFixed(2)}`
        : "no-selection"}
    </aside>
  ),
}));

/** O "+" abre um menu: um aparelho, um texto ou uma imagem. */
function addFromMenu(kind: "Device" | "Text" | "Image" | "Sticker") {
  // O menu de mentira não fecha sozinho ao escolher; o de verdade fecha.
  if (!screen.queryByRole("button", { name: kind })) {
    fireEvent.click(screen.getByLabelText("Add object"));
  }

  fireEvent.click(screen.getByRole("button", { name: kind }));
}

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

    addFromMenu("Device");

    expect(screen.getByTestId("inspector-panel")).toHaveTextContent(
      "Object 2 :: smartphone :: x=1.95",
    );
    expect(screen.getByTestId("mockup-canvas")).toHaveTextContent("visible:2");
  });

  it("selects an object from the mocked canvas", () => {
    render(<Home />);

    addFromMenu("Device");
    fireEvent.click(screen.getByRole("button", { name: "select-Object 1" }));

    expect(screen.getByTestId("inspector-panel")).toHaveTextContent(
      "Object 1 :: smartphone :: x=0.00",
    );
  });

  it("toggles visibility from the layer eye button", () => {
    render(<Home />);

    addFromMenu("Device");

    const secondLayer = screen.getByText("Object 2").closest('[role="button"]');

    expect(secondLayer).not.toBeNull();

    const hideButton = within(secondLayer as HTMLElement).getByTitle("Hide");
    fireEvent.click(hideButton);

    expect(screen.getByTestId("mockup-canvas")).toHaveTextContent("visible:1");
  });

  it("falls back to the base object when the selected object is removed", () => {
    render(<Home />);

    addFromMenu("Device");
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

    addFromMenu("Device");

    expect(screen.getByTestId("inspector-panel")).toHaveTextContent(
      "Object 2 :: smartphone :: x=1.65",
    );
  });

  it("adds a text in front of the devices and selects it", () => {
    render(<Home />);

    addFromMenu("Text");

    expect(screen.getByTestId("inspector-panel")).toHaveTextContent(
      'Text 1 :: text "Your text"',
    );
    // À frente dos aparelhos, para não nascer dentro de um.
    expect(screen.getByTestId("inspector-panel")).toHaveTextContent("z=0.25");
    expect(screen.getByTestId("mockup-canvas")).toHaveTextContent("visible:2");
  });

  it("numbers the texts apart from the devices", () => {
    render(<Home />);

    addFromMenu("Text");
    addFromMenu("Device");
    addFromMenu("Text");

    expect(screen.getByTestId("inspector-panel")).toHaveTextContent("Text 2");
  });

  it("edits the selected text and keeps the numbers inside their limits", () => {
    render(<Home />);

    addFromMenu("Text");
    fireEvent.click(screen.getByText("set-text"));

    expect(screen.getByTestId("inspector-panel")).toHaveTextContent(
      'text "Novo"',
    );

    fireEvent.click(screen.getByText("set-huge-size"));

    expect(screen.getByTestId("inspector-panel")).toHaveTextContent(
      "size=600",
    );
  });

  it("duplicates a text, offset from the original, and selects the copy", () => {
    render(<Home />);

    addFromMenu("Text");

    const optionButtons = screen.getAllByLabelText("Object options");

    fireEvent.click(optionButtons[1]);
    fireEvent.click(screen.getByText("Duplicate"));

    expect(screen.getByTestId("inspector-panel")).toHaveTextContent(
      'Text 1 copy :: text "Your text"',
    );
    expect(screen.getByTestId("mockup-canvas")).toHaveTextContent("visible:3");
  });

  it("resets the pose of a text without touching what it says", () => {
    render(<Home />);

    addFromMenu("Text");
    fireEvent.click(screen.getByText("set-text"));
    fireEvent.click(screen.getByText("reset-object"));

    // A pose volta ao padrão (z=0); o texto fica como estava.
    expect(screen.getByTestId("inspector-panel")).toHaveTextContent("z=0.00");
    expect(screen.getByTestId("inspector-panel")).toHaveTextContent(
      'text "Novo"',
    );
  });

  it("adds an image as an empty dashed placeholder, in front of the devices", () => {
    render(<Home />);

    addFromMenu("Image");

    // Sem arquivo (o tracejado) até o usuário enviar um.
    expect(screen.getByTestId("inspector-panel")).toHaveTextContent(
      "Image 1 :: image :: file=none :: z=0.25",
    );
    expect(screen.getByTestId("mockup-canvas")).toHaveTextContent("visible:2");
  });

  it("numbers the images apart from the texts and the devices", () => {
    render(<Home />);

    addFromMenu("Image");
    addFromMenu("Text");
    addFromMenu("Image");

    expect(screen.getByTestId("inspector-panel")).toHaveTextContent("Image 2");
  });

  it("duplicates an image, offset from the original, and selects the copy", () => {
    render(<Home />);

    addFromMenu("Image");

    fireEvent.click(screen.getAllByLabelText("Object options")[1]);
    fireEvent.click(screen.getByText("Duplicate"));

    expect(screen.getByTestId("inspector-panel")).toHaveTextContent(
      "Image 1 copy :: image",
    );
    expect(screen.getByTestId("mockup-canvas")).toHaveTextContent("visible:3");
  });

  it("adds a sticker from the picker, with its art, outline and number", () => {
    render(<Home />);

    addFromMenu("Sticker");
    fireEvent.click(screen.getByRole("button", { name: "Red heart" }));

    expect(screen.getByTestId("inspector-panel")).toHaveTextContent(
      "Sticker 1 :: image :: file=/stickers/red-heart.svg :: z=0.25",
    );
    expect(screen.getByTestId("mockup-canvas")).toHaveTextContent("visible:2");
    // A grade fecha ao escolher.
    expect(screen.queryByRole("searchbox")).not.toBeInTheDocument();
  });

  it("numbers the stickers apart from the images", () => {
    render(<Home />);

    addFromMenu("Image");
    addFromMenu("Sticker");
    fireEvent.click(screen.getByRole("button", { name: "Red heart" }));

    expect(screen.getByTestId("inspector-panel")).toHaveTextContent("Sticker 1");
  });

  it("resets the pose of an image", () => {
    render(<Home />);

    addFromMenu("Image");
    fireEvent.click(screen.getByText("reset-object"));

    expect(screen.getByTestId("inspector-panel")).toHaveTextContent("z=0.00");
  });

  it("opens the patch notes from the preferences menu, and closes them", () => {
    render(<Home />);

    expect(screen.queryByRole("dialog", { name: "What's new" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByLabelText("Preferences"));
    fireEvent.click(screen.getByRole("button", { name: "What's new" }));

    expect(screen.getByRole("dialog", { name: "What's new" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Close" }));

    expect(screen.queryByRole("dialog", { name: "What's new" })).not.toBeInTheDocument();
  });
});
