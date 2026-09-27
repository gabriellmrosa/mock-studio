import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import InspectorPanel from "./InspectorPanel";
import {
  DEFAULT_SCREEN_FIT,
  createSceneObject,
} from "../../lib/scene-objects";
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
  addObject: "Add object",
  appTitle: "Mock Studio",
  appSubtitle: "Visual mockup editor",
  baseObject: "Base object",
  bodyColorLabel: "Customize",
  backgroundColorButton: "Background color",
  hideUiButton: "Hide UI",
  showUiButton: "Show UI",
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
  duplicateObject: "Duplicate",
  english: "EN-US",
  fitObjectButton: "Frame object",
  fitSceneButton: "Fit scene",
  restoreTemplateView: "Restore framing",
  hideObject: "Hide",
  hiddenObjectLabel: "Hidden",
  keyboardToggleLabel: "Keyboard",
  tabletBezelToggleLabel: "Screen bezel",
  languageLabel: "Language",
  layersSectionTitle: "Objects",
  lightMode: "Light",
  matteColorLabel: "Matte finish",
  moveDownButton: "Move down",
  moveLeftButton: "Move left",
  moveRightButton: "Move right",
  moveUpButton: "Move up",
  modelLabel: "Model",
  objectOptionsLabel: "Object options",
  positionX: "Position X",
  positionY: "Position Y",
  positionZ: "Position Z",
  preferencesLabel: "Preferences",
  propertiesEyebrow: "Properties",
  portuguese: "PT-BR",
  renameObject: "Rename",
  resetObjectButton: "Reset transform",
  rotationX: "Rotation X",
  rotationY: "Rotation Y",
  rotationZ: "Rotation Z",
  scale: "Scale",
  sceneSectionHint: "Device body",
  screenSectionHintPrefix: "Ideal size:",
  screenSectionTitle: "App Screen",
  showObject: "Show",
  takePhotoButton: "Export",
  exportBackgroundLabel: "Background",
  exportWithBackground: "With background",
  exportTransparent: "Transparent",
  exportTemplateLabel: "Template",
  saveAsTemplate: "Save as template",
  templatesSectionTitle: "Templates",
  templatesEmptyHint: "Save the current scene to reuse it later.",
  templatesEmptyHintMotion: "Save the current animation.",
  modeSwitchTitle: "Leave without saving a template?",
  modeSwitchBodyStatic: "Static has unsaved changes.",
  modeSwitchBodyMotion: "Motion has unsaved changes.",
  modeSwitchSave: "Save template and leave",
  modeSwitchDiscard: "Leave without saving",
  modeSwitchCancel: "Cancel",
  templateOpenTitle: "Open the template without saving?",
  templateOpenSave: "Save and open",
  templateOpenDiscard: "Open without saving",
  saveTemplate: "Save template",
  templateOptionsLabel: "Template options",
  templateSavedMessage: "Template saved.",
  templateAppliedMessage: "Template applied.",
  templateSaveError: "Could not save the template.",
  canvasTemplateLoadingLabel: "Applying template",
  themeLabel: "Interface",
  themesSectionTitle: "Themes",
  transformSectionTitle: "Transform",
  transformStaticTab: "Static",
  motionTimeline: "Timeline",
  motionTimelineEmpty: "No animated objects yet.",
  motionModeToggle: "Motion mode",
  transformMotionTab: "Motion",
  motionEmptyHint: "Animate this object between poses.",
  motionAddKeyframe: "Add keyframe",
  motionKeyframeLabel: "Keyframe",
  motionRemoveKeyframe: "Remove keyframe",
  motionPlay: "Play",
  motionStop: "Stop",
  motionEasing: "Easing",
  motionEasingLabels: {},
  motionBezierTitle: "Transition curve",
  motionBezierReset: "Reset to default",
  motionBezierDone: "Done",

  uploadImage: "Upload image",
  screenSourceImage: "Image",
  screenSourceVideo: "Video",
  uploadVideo: "Upload video",
  replaceVideo: "Replace video",
  screenVideoHint: "MP4, MOV or WebM.",
  uploadVideoError: "This browser can't play that video.",
  screenVideoFrame: "Frame (s)",
  screenFitTitle: "Framing",
  screenFitZoom: "Zoom (%)",
  screenFitX: "Screen position X (%)",
  screenFitY: "Screen position Y (%)",
  screenFitReset: "Reset framing",
  screenFitBackground: "Screen background",
  screenCropTitle: "Crop edges",
  screenCropTop: "Crop top (%)",
  screenCropBottom: "Crop bottom (%)",
  screenCropLeft: "Crop left (%)",
  screenCropRight: "Crop right (%)",
  uploadImageError: "Upload failed",
  zoomInButton: "Zoom in",
  zoomOutButton: "Zoom out",
  themeNames: {
    black: "Black",
    blood: "Red",
    gray: "Gray",
    "light-gray": "Light Gray",
  },
  colorPartLabels: {
    keyboardBaseOuter: "Base do teclado",
    screenBackCover: "Tampa traseira",
    screenBezel: "Moldura da tela",
    screenRubberSeal: "Borracha da tela",
    lowerHingeBar: "Barra da dobradica",
    hingeRubberSeal: "Borracha da dobradica",
  },
};

function renderInspector(
  object = createSceneObject({ id: "object-1", modelId: "smartphone", name: "Object 1" }),
) {
  const handlers = {
    onImageUpload: jest.fn(),
    onVideoUpload: jest.fn(),
    onScreenSourceChange: jest.fn(),
    onUpdateScreenVideo: jest.fn(),
    onUpdateScreenFit: jest.fn(),
    onModelChange: jest.fn(),
    onResetObject: jest.fn(),
    onThemeColorChange: jest.fn(),
    onThemeChange: jest.fn(),
    onToggleCustomColors: jest.fn(),
    onToggleDeviceShell: jest.fn(),
    onToggleNotebookKeyboard: jest.fn(),
    onToggleTabletBezel: jest.fn(),
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
      motionTab="static"
      selectedKeyframeId=""
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

  it("switches the screen between image and video", () => {
    const handlers = renderInspector();

    expect(screen.getByLabelText("Upload image")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "Video" }));

    expect(handlers.onScreenSourceChange).toHaveBeenCalledWith("video");
  });

  it("shows the video upload and the current file on the video source", () => {
    renderInspector({
      ...createSceneObject({ id: "object-1", name: "Object 1" }),
      screenSource: "video",
      screenVideo: {
        durationMs: 12400,
        fit: { ...DEFAULT_SCREEN_FIT },
        frameMs: 0,
        name: "recording.mov",
        startMs: 0,
        url: "blob:x",
      },
    });

    expect(screen.getByLabelText("Replace video")).toBeInTheDocument();
    expect(screen.getByText("recording.mov")).toBeInTheDocument();
    expect(screen.getByText("12.4s")).toBeInTheDocument();
    expect(screen.queryByLabelText("Upload image")).not.toBeInTheDocument();
  });

  it("edits the framing of the screen content", () => {
    const handlers = renderInspector();

    expect(screen.getByLabelText("Reset framing")).toBeDisabled();

    // O Control mockado sempre envia 12: 12% de posição vira 0.12.
    fireEvent.click(screen.getByText("control:Screen position X (%)"));

    expect(handlers.onUpdateScreenFit).toHaveBeenCalledWith({ panX: 0.12 });
  });

  it("no longer lists video as a device model", () => {
    renderInspector();
    fireEvent.click(screen.getByLabelText("Model"));

    expect(screen.queryByText("Video MP4")).not.toBeInTheDocument();
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
    expect(screen.getByText("color-row:Borracha da dobradica")).toBeInTheDocument();
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
