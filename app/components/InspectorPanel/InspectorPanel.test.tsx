import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import InspectorPanel from "./InspectorPanel";
import { createSceneObject } from "../../lib/scene-objects";
import type { AppCopy } from "../../lib/i18n";

jest.mock("../CustomSelect/CustomSelect", () => ({
  __esModule: true,
  default: ({
    ariaLabel,
    onChange,
    value,
  }: {
    ariaLabel: string;
    onChange: (value: string) => void;
    value: string;
  }) => (
    <button
      type="button"
      aria-label={ariaLabel}
      onClick={() => onChange(value === "smartphone" ? "notebook" : "smartphone")}
    >
      select-model
    </button>
  ),
}));

jest.mock("../ColorRow/ColorRow", () => ({
  __esModule: true,
  default: ({
    label,
    onChange,
  }: {
    label: string;
    onChange: (hex: string) => void;
  }) => (
    <button type="button" onClick={() => onChange("#123456")}>
      color-row:{label}
    </button>
  ),
}));

jest.mock("../Control/Control", () => ({
  __esModule: true,
  default: ({
    label,
    setValue,
  }: {
    label: string;
    setValue: (value: number) => void;
  }) => (
    <button type="button" onClick={() => setValue(12)}>
      control:{label}
    </button>
  ),
}));

jest.mock("../EditorPrimitives/EditorPrimitives", () => ({
  __esModule: true,
  InspectorPanelHeader: ({
    title,
  }: {
    title: string;
  }) => <div>{title}</div>,
  PanelSection: ({
    title,
    children,
    action,
  }: {
    title: string;
    children: ReactNode;
    action?: ReactNode;
  }) => (
    <section>
      <h3>{title}</h3>
      {action}
      {children}
    </section>
  ),
}));

const copy: AppCopy = {
  addObject: "Add layer",
  appTitle: "Mock Studio",
  appSubtitle: "Visual mockup editor",
  baseObject: "Base layer",
  bodyColorLabel: "Customize",
  backgroundColorButton: "Background color",
  canvasInitialLoadingLabel: "Loading",
  canvasObjectLoadingLabel: "Updating scene",
  canvasExportLoadingLabel: "Taking photo",
  photoExportSuccess: "Photo exported successfully",
  photoExportError: "Could not export photo",
  dismissSnackbar: "Dismiss notice",
  desktopOnlyTitle: "Desktop only",
  desktopOnlyBody: "Desktop only body {size}",
  desktopOnlyHint: "Desktop only hint",
  creditsAuthor: "Author",
  creditsCloseButton: "Close credits",
  creditsDescription: "for 3D models",
  creditsEyebrow: "3D assets and credits",
  creditsFooterRemoval: "Removal",
  creditsFooterThanks: "Thanks",
  creditsIntro: "Intro",
  creditsLabel: "Credits",
  creditsLicense: "License",
  creditsSource: "Source",
  creditsTitle: "Attributions",
  darkMode: "Dark",
  debugOff: "Debug off",
  debugOn: "Debug on",
  debugSectionTitle: "Debug",
  deleteObject: "Delete",
  english: "EN-US",
  fitSceneButton: "Fit to view",
  hideObject: "Hide",
  hiddenObjectLabel: "Hidden",
  keyboardToggleLabel: "Keyboard",
  languageLabel: "Language",
  layersSectionTitle: "Layers",
  lightMode: "Light",
  matteColorLabel: "Matte finish",
  moveDownButton: "Move down",
  moveLeftButton: "Move left",
  moveRightButton: "Move right",
  moveUpButton: "Move up",
  modelLabel: "Model",
  objectOptionsLabel: "Layer options",
  positionX: "Position X",
  positionY: "Position Y",
  positionZ: "Position Z",
  preferencesLabel: "Preferences",
  propertiesEyebrow: "Properties",
  portuguese: "PT-BR",
  renameObject: "Rename",
  resetCameraButton: "Reset view",
  resetObjectButton: "Reset transform",
  rotationX: "Rotation X",
  rotationY: "Rotation Y",
  rotationZ: "Rotation Z",
  scale: "Scale",
  sceneSectionHint: "Device body",
  screenSectionHintPrefix: "Ideal size:",
  screenSectionTitle: "App Screen",
  showObject: "Show",
  takePhotoButton: "Export PNG",
  themeLabel: "Interface",
  themesSectionTitle: "Themes",
  transformSectionTitle: "Transform",
  uploadImage: "Upload image",
  uploadImageError: "Upload failed",
  zoomInButton: "Zoom in",
  zoomOutButton: "Zoom out",
  themeNames: {
    black: "Black",
    blood: "Red",
    gray: "Gray",
    "light-gray": "Light Gray",
  },
};

function renderInspector(
  object = createSceneObject({ id: "object-1", modelId: "smartphone", name: "Object 1" }),
) {
  const handlers = {
    onImageUpload: jest.fn(),
    onModelChange: jest.fn(),
    onResetObject: jest.fn(),
    onThemeColorChange: jest.fn(),
    onThemeChange: jest.fn(),
    onToggleCustomColors: jest.fn(),
    onToggleDeviceShell: jest.fn(),
    onToggleNotebookKeyboard: jest.fn(),
    onToggleMatteColors: jest.fn(),
    onUpdatePosition: jest.fn(),
    onUpdateRotation: jest.fn(),
    onUpdateScale: jest.fn(),
  };

  render(
    <InspectorPanel
      copy={copy}
      object={object}
      uiTheme="dark"
      uploadError=""
      {...handlers}
    />,
  );

  return handlers;
}

describe("InspectorPanel", () => {
  it("calls model change from the custom select", () => {
    const handlers = renderInspector();

    fireEvent.click(screen.getByLabelText("Model"));

    expect(handlers.onModelChange).toHaveBeenCalledWith("notebook");
  });

  it("calls reset object from the reset action", () => {
    const handlers = renderInspector();

    fireEvent.click(screen.getByLabelText("Reset transform"));

    expect(handlers.onResetObject).toHaveBeenCalled();
  });

  it("maps rotation Y control back to the stored object rotation", () => {
    const handlers = renderInspector();

    fireEvent.click(screen.getByText("control:Rotation Y"));

    expect(handlers.onUpdateRotation).toHaveBeenCalledWith({
      rotationX: 0,
      rotationY: 192,
      rotationZ: 0,
    });
  });

  it("shows notebook keyboard toggle only for notebook objects", () => {
    const notebook = createSceneObject({
      id: "notebook-1",
      modelId: "notebook",
      name: "Notebook",
    });

    renderInspector(notebook);

    expect(screen.getByText("Keyboard")).toBeInTheDocument();
  });

  it("filters notebook custom colors when keyboard is disabled", () => {
    const notebook = {
      ...createSceneObject({
        id: "notebook-2",
        modelId: "notebook",
        name: "Notebook",
      }),
      customColorsEnabled: true,
      showNotebookKeyboard: false,
    };

    renderInspector(notebook);

    expect(screen.getByText("color-row:Tampa traseira")).toBeInTheDocument();
    expect(screen.getByText("color-row:Moldura da tela")).toBeInTheDocument();
    expect(screen.getByText("color-row:Borracha da tela")).toBeInTheDocument();
    expect(screen.getByText("color-row:Barra da dobradica")).toBeInTheDocument();
    expect(screen.queryByText("color-row:Base do teclado")).not.toBeInTheDocument();
  });

  it("forwards theme color changes from visible color rows", () => {
    const notebook = {
      ...createSceneObject({
        id: "notebook-3",
        modelId: "notebook",
        name: "Notebook",
      }),
      customColorsEnabled: true,
      showNotebookKeyboard: false,
    };

    const handlers = renderInspector(notebook);

    fireEvent.click(screen.getByText("color-row:Tampa traseira"));

    expect(handlers.onThemeColorChange).toHaveBeenCalledWith(
      "screenBackCover",
      "#123456",
    );
  });
});
