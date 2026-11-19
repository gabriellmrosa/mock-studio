import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import Home from "./page";
import { readImageFile } from "./lib/image-objects";

// O jsdom não decodifica imagem nem tem URL.createObjectURL: a leitura do
// arquivo é de mentira, e o resto de image-objects é de verdade.
jest.mock("./lib/image-objects", () => ({
  ...jest.requireActual("./lib/image-objects"),
  readImageFile: jest.fn(),
}));

const mockedReadImageFile = readImageFile as jest.MockedFunction<typeof readImageFile>;

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
    objects: allObjects,
    onSelectObject,
  }: {
    objects: Array<{ id: string; isVisible: boolean; kind: string; name: string }>;
    onSelectObject: (id: string) => void;
  }) => {
    // A câmera e o Fundo não se desenham: o canvas de mentira só conta o que
    // é desenhado.
    const objects = allObjects.filter(
      (object) => object.kind !== "camera" && object.kind !== "background",
    );

    return (
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
    );
  },
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
      positionY: number;
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
          ? `${object.name} :: image :: file=${object.image.url ?? "none"} :: z=${object.positionZ.toFixed(2)} :: at=${object.positionX.toFixed(0)},${object.positionY.toFixed(0)}`
          : object.text
          ? `${object.name} :: text "${object.text.content}" :: size=${object.text.fontSize} :: z=${object.positionZ.toFixed(2)}`
          : `${object.name} :: ${object.modelId} :: x=${object.positionX.toFixed(2)}`
        : "no-selection"}
    </aside>
  ),
}));

/**
 * "Imagem" abre direto o seletor de arquivos: o objeto só nasce quando um arquivo
 * é escolhido. Aqui, o arquivo escolhido é `a.png`.
 */
async function addImageWithFile() {
  mockedReadImageFile.mockResolvedValue({
    animation: null,
    aspect: 1,
    isVector: false,
    name: "a.png",
    outline: false,
    shadow: false,
    speed: 1,
    stickerId: null,
    url: "blob:a",
  });

  addFromMenu("Image");

  fireEvent.change(document.querySelector('input[type="file"][accept*="gif"]') as HTMLInputElement, {
    target: { files: [new File(["x"], "a.png", { type: "image/png" })] },
  });

  await waitFor(() =>
    expect(screen.getByTestId("inspector-panel")).toHaveTextContent(/image :: file=blob:a/),
  );
}

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

  it("opens the file picker for an image, and adds nothing until a file is chosen", () => {
    const click = jest.spyOn(HTMLInputElement.prototype, "click");

    render(<Home />);

    addFromMenu("Image");

    const calls = click.mock.contexts.filter(
      (input) => (input as HTMLInputElement).type === "file",
    );

    expect(calls.length).toBeGreaterThan(0);
    // Desistir do seletor não deixa um objeto vazio na cena.
    expect(screen.getByTestId("mockup-canvas")).toHaveTextContent("visible:1");
    expect(screen.getByTestId("inspector-panel")).not.toHaveTextContent("Image 1");

    click.mockRestore();
  });

  it("adds the image with its file once it is chosen, in front of the devices", async () => {
    render(<Home />);

    await addImageWithFile();

    expect(screen.getByTestId("inspector-panel")).toHaveTextContent(
      "Image 1 :: image :: file=blob:a :: z=0.25",
    );
    expect(screen.getByTestId("mockup-canvas")).toHaveTextContent("visible:2");
  });

  it("shows a note and adds nothing when the browser cannot open the file", async () => {
    mockedReadImageFile.mockRejectedValue(new Error("nope"));
    const error = jest.spyOn(console, "error").mockImplementation(() => undefined);

    render(<Home />);
    addFromMenu("Image");
    fireEvent.change(document.querySelector('input[type="file"][accept*="gif"]') as HTMLInputElement, {
      target: { files: [new File(["x"], "a.heic", { type: "image/heic" })] },
    });

    await waitFor(() => expect(error).toHaveBeenCalled());

    expect(screen.getByTestId("mockup-canvas")).toHaveTextContent("visible:1");
    error.mockRestore();
  });

  it("puts a new image on a diagonal, never at the center where it would look like the device's screen", async () => {
    render(<Home />);

    await addImageWithFile();

    // Direita em cima: o deslocamento é de uma unidade de posição nos dois eixos.
    expect(screen.getByTestId("inspector-panel")).toHaveTextContent(":: at=1,1");
  });

  it("sends each new image or sticker to a diagonal that is still free", async () => {
    render(<Home />);

    await addImageWithFile();
    expect(screen.getByTestId("inspector-panel")).toHaveTextContent(":: at=1,1");

    addFromMenu("Sticker");
    fireEvent.click(screen.getByRole("button", { name: "Red heart" }));
    expect(screen.getByTestId("inspector-panel")).toHaveTextContent(":: at=-1,1");

    await addImageWithFile();
    expect(screen.getByTestId("inspector-panel")).toHaveTextContent(":: at=1,-1");
  });

  it("numbers the images apart from the texts and the devices", async () => {
    render(<Home />);

    await addImageWithFile();
    addFromMenu("Text");
    await addImageWithFile();

    expect(screen.getByTestId("inspector-panel")).toHaveTextContent("Image 2");
  });

  it("duplicates an image, offset from the original, and selects the copy", async () => {
    render(<Home />);

    await addImageWithFile();

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
      "Sticker 1 :: image :: file=/stickers/red-heart.svg :: z=0.25 :: at=1,1",
    );
    expect(screen.getByTestId("mockup-canvas")).toHaveTextContent("visible:2");
    // A grade fecha ao escolher.
    expect(screen.queryByRole("searchbox")).not.toBeInTheDocument();
  });

  it("numbers the stickers apart from the images", async () => {
    render(<Home />);

    await addImageWithFile();
    addFromMenu("Sticker");
    fireEvent.click(screen.getByRole("button", { name: "Red heart" }));

    expect(screen.getByTestId("inspector-panel")).toHaveTextContent("Sticker 1");
  });

  it("resets the pose of an image", async () => {
    render(<Home />);

    await addImageWithFile();
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

  it("has the camera in the list from the start, in the language of the interface", () => {
    render(<Home />);

    expect(screen.getByText("Camera")).toBeInTheDocument();
    // O que está selecionado ao abrir continua sendo o aparelho.
    expect(screen.getByTestId("inspector-panel")).toHaveTextContent("Object 1");
  });

  it("selects the camera like any object, and only the device has an options menu", () => {
    render(<Home />);

    fireEvent.click(screen.getByText("Camera"));

    expect(screen.getByTestId("inspector-panel")).toHaveTextContent("Camera ::");
    expect(screen.getAllByLabelText("Object options")).toHaveLength(1);
  });

  it("does not count the camera when numbering the new devices", () => {
    render(<Home />);

    addFromMenu("Device");

    expect(screen.getByTestId("inspector-panel")).toHaveTextContent("Object 2");
  });

  describe("saving over the template the scene came from", () => {
    beforeEach(() => {
      window.localStorage.clear();
    });

    function savedTemplates() {
      return JSON.parse(window.localStorage.getItem("mock-photo-templates") ?? "{}")
        .templates as { createdAt: number; id: string; name: string }[];
    }

    it("saves a new template when the scene did not come from one", () => {
      render(<Home />);

      fireEvent.click(screen.getByRole("button", { name: "Save template" }));

      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
      expect(savedTemplates()).toHaveLength(1);
    });

    it("asks before saving again, and overwrites keeping the name and the place", () => {
      render(<Home />);
      fireEvent.click(screen.getByRole("button", { name: "Save template" }));

      const [first] = savedTemplates();

      addFromMenu("Device");
      fireEvent.click(screen.getByRole("button", { name: "Save template" }));

      const dialog = screen.getByRole("alertdialog");

      expect(dialog).toHaveTextContent(first.name);

      fireEvent.click(
        within(dialog).getByRole("button", { name: `Overwrite “${first.name}”` }),
      );

      const after = savedTemplates();

      expect(after).toHaveLength(1);
      expect(after[0]).toMatchObject({
        createdAt: first.createdAt,
        id: first.id,
        name: first.name,
      });
    });

    it("can still save a new one from the same question", () => {
      render(<Home />);
      fireEvent.click(screen.getByRole("button", { name: "Save template" }));
      fireEvent.click(screen.getByRole("button", { name: "Save template" }));
      fireEvent.click(
        within(screen.getByRole("alertdialog")).getByRole("button", {
          name: "Save as new",
        }),
      );

      expect(savedTemplates()).toHaveLength(2);
    });
  });

  describe("undo and redo", () => {
    const press = (init: KeyboardEventInit, target: Element | Window = window) =>
      fireEvent.keyDown(target, { key: "z", ...init });

    it("undoes adding an object and redoes it, on Mac and Windows shortcuts", () => {
      render(<Home />);

      addFromMenu("Device");
      expect(screen.getByTestId("mockup-canvas")).toHaveTextContent("visible:2");

      press({ metaKey: true });
      expect(screen.getByTestId("mockup-canvas")).toHaveTextContent("visible:1");

      press({ metaKey: true, shiftKey: true });
      expect(screen.getByTestId("mockup-canvas")).toHaveTextContent("visible:2");

      press({ ctrlKey: true });
      expect(screen.getByTestId("mockup-canvas")).toHaveTextContent("visible:1");

      press({ ctrlKey: true, key: "y" });
      expect(screen.getByTestId("mockup-canvas")).toHaveTextContent("visible:2");
    });

    it("leaves the shortcut to a text field that has the focus", () => {
      render(<Home />);

      addFromMenu("Device");

      const field = document.createElement("input");

      document.body.appendChild(field);
      press({ metaKey: true }, field);

      expect(screen.getByTestId("mockup-canvas")).toHaveTextContent("visible:2");
      field.remove();
    });

    it("has nothing to undo on a fresh scene", () => {
      render(<Home />);

      press({ metaKey: true });

      expect(screen.getByTestId("mockup-canvas")).toHaveTextContent("visible:1");
    });
  });

  describe("space playback shortcut", () => {
    it("does not intercept Space while a modal dialog is open", () => {
      render(<Home />);

      const modal = document.createElement("div");
      modal.setAttribute("role", "dialog");
      modal.setAttribute("aria-modal", "true");
      const button = document.createElement("button");
      modal.appendChild(button);
      document.body.appendChild(modal);

      const event = new KeyboardEvent("keydown", {
        bubbles: true,
        cancelable: true,
        code: "Space",
        key: " ",
      });

      button.dispatchEvent(event);
      modal.remove();

      expect(event.defaultPrevented).toBe(false);
    });
  });
});
