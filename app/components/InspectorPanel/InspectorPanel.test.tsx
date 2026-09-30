import { fireEvent, render, screen, within } from "@testing-library/react";
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
  // As sub-abas são as reais: o teste precisa clicar nelas.
  SubTabs: jest.requireActual("../EditorPrimitives/EditorPrimitives").SubTabs,
  SubTabPanel: jest.requireActual("../EditorPrimitives/EditorPrimitives")
    .SubTabPanel,
  IconButton: jest.requireActual("../EditorPrimitives/EditorPrimitives")
    .IconButton,
  Switch: jest.requireActual("../EditorPrimitives/EditorPrimitives").Switch,
  SidePopover: jest.requireActual("../EditorPrimitives/EditorPrimitives")
    .SidePopover,
  SegmentedTabs: jest.requireActual("../EditorPrimitives/EditorPrimitives")
    .SegmentedTabs,
  SegmentedTabPanel: jest.requireActual("../EditorPrimitives/EditorPrimitives")
    .SegmentedTabPanel,
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
  appearanceTabsLabel: "Appearance options",
  appearanceTabCustom: "Custom",
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
  screenUploadImage: "Choose image",
  removeImage: "Remove image",
  removeVideo: "Remove video",
  imageOptions: "Image options",
  videoOptions: "Video options",
  closeLabel: "Close",
  screenSourceImage: "Image",
  screenSourceVideo: "Video",
  uploadVideo: "Upload video",
  replaceVideo: "Replace video",
  screenVideoHint: "MP4, MOV or WebM.",
  uploadVideoError: "This browser can't play that video.",
  screenTabsLabel: "Screen options",
  screenTabFit: "Fit",
  screenTabCrop: "Crop",
  screenCropReset: "Reset crop",
  screenFitZoom: "Zoom (%)",
  screenFitX: "Screen position X (%)",
  screenFitY: "Screen position Y (%)",
  screenFitReset: "Reset framing",
  screenFitBackground: "Screen background",
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
  { motionTab = "static" }: { motionTab?: "static" | "motion" } = {},
) {
  const handlers = {
    onImageUpload: jest.fn(),
    onVideoUpload: jest.fn(),
    onRemoveImage: jest.fn(),
    onRemoveVideo: jest.fn(),
    onScreenSourceChange: jest.fn(),
    onUpdateScreenFit: jest.fn(),
    onModelChange: jest.fn(),
    onResetObject: jest.fn(),
    onThemeColorChange: jest.fn(),
    onThemeChange: jest.fn(),
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
      motionTab={motionTab}
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

  it("goes straight to the image upload in Static, with no source choice", () => {
    renderInspector();

    expect(screen.getByLabelText("Choose image")).toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: "Video" })).toBeNull();
  });

  it("switches the screen between image and video in Motion", () => {
    const handlers = renderInspector(undefined, { motionTab: "motion" });

    expect(screen.getByLabelText("Choose image")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "Video" }));

    expect(handlers.onScreenSourceChange).toHaveBeenCalledWith("video");
  });

  it("shows the video upload and the current file on the video source", () => {
    renderInspector(
      {
        ...createSceneObject({ id: "object-1", name: "Object 1" }),
        screenSource: "video",
        screenVideo: {
          durationMs: 12400,
          fit: { ...DEFAULT_SCREEN_FIT },
          name: "recording.mov",
          startMs: 0,
          url: "blob:x",
        },
      },
      { motionTab: "motion" },
    );

    expect(screen.getByRole("button", { name: "Video options" })).toBeInTheDocument();
    expect(screen.getByText("recording.mov")).toBeInTheDocument();
    expect(screen.getByText("12.4s")).toBeInTheDocument();
    expect(screen.queryByLabelText("Choose image")).not.toBeInTheDocument();
  });

  describe("screen options panel", () => {
    const uploaded = () => ({
      ...createSceneObject({ id: "object-1", name: "Object 1" }),
      imageName: "tela.png",
      imageUrl: "data:image/png;base64,AAAA",
    });
    const video = () => ({
      ...createSceneObject({ id: "object-1", name: "Object 1" }),
      screenSource: "video" as const,
      screenVideo: {
        durationMs: 4000,
        fit: { ...DEFAULT_SCREEN_FIT },
        name: "recording.mov",
        startMs: 0,
        url: "blob:x",
      },
    });
    const openOptions = (name = "Image options") =>
      fireEvent.click(screen.getByRole("button", { name }));

    it("keeps the options out of the side panel until the menu is opened", () => {
      renderInspector(uploaded());

      expect(screen.queryByRole("dialog")).toBeNull();
      expect(screen.queryByRole("tab", { name: "Fit" })).toBeNull();
      expect(screen.getByRole("button", { name: "Image options" })).toHaveAttribute(
        "aria-expanded",
        "false",
      );
    });

    it("opens a floating panel with replace, the sub-tabs and remove", () => {
      renderInspector(uploaded());
      openOptions();

      const dialog = screen.getByRole("dialog", { name: "Image options" });

      expect(dialog).toBeInTheDocument();
      expect(screen.getByLabelText("Upload image")).toBeInTheDocument();
      expect(screen.getByRole("tab", { name: "Crop" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Remove image" })).toBeInTheDocument();
      // Segmentado: a primeira opção já vem selecionada.
      expect(screen.getByRole("tab", { name: "Fit" })).toHaveAttribute(
        "aria-selected",
        "true",
      );
      expect(screen.getByText("control:Zoom (%)")).toBeInTheDocument();
    });

    it("edits the framing from the panel", () => {
      const handlers = renderInspector(uploaded());

      openOptions();
      // O Control mockado sempre envia 12: 12% de posição vira 0.12.
      fireEvent.click(screen.getByText("control:Screen position X (%)"));

      expect(handlers.onUpdateScreenFit).toHaveBeenCalledWith({ panX: 0.12 });
    });

    it("always keeps one option selected, switching the panel content", () => {
      renderInspector(uploaded());
      openOptions();

      const fit = screen.getByRole("tab", { name: "Fit" });
      const crop = screen.getByRole("tab", { name: "Crop" });

      // Clicar de novo na selecionada não a desmarca...
      fireEvent.click(fit);
      expect(fit).toHaveAttribute("aria-selected", "true");

      // ...e escolher outra troca o conteúdo.
      fireEvent.click(crop);
      expect(crop).toHaveAttribute("aria-selected", "true");
      expect(fit).toHaveAttribute("aria-selected", "false");
      expect(screen.getByText("control:Crop top (%)")).toBeInTheDocument();
      expect(screen.queryByText("control:Zoom (%)")).toBeNull();
    });

    it("offers the background color in Crop too, bound to the same value", () => {
      const handlers = renderInspector(uploaded());

      openOptions();
      fireEvent.click(screen.getByRole("tab", { name: "Crop" }));
      // O ColorRow mockado envia #123456 ao ser clicado.
      fireEvent.click(screen.getByText("color-row:Screen background"));

      expect(handlers.onUpdateScreenFit).toHaveBeenCalledWith({
        background: "#123456",
      });
    });

    it("moves the selection with the arrow keys", () => {
      renderInspector(uploaded());
      openOptions();

      fireEvent.keyDown(screen.getByRole("tab", { name: "Fit" }), {
        key: "ArrowRight",
      });

      expect(screen.getByRole("tab", { name: "Crop" })).toHaveAttribute(
        "aria-selected",
        "true",
      );
    });

    it("removes the file from the panel footer", () => {
      const handlers = renderInspector(uploaded());

      openOptions();
      fireEvent.click(screen.getByRole("button", { name: "Remove image" }));

      expect(handlers.onRemoveImage).toHaveBeenCalled();
    });

    it("closes on Escape and on a click outside", () => {
      renderInspector(uploaded());

      openOptions();
      fireEvent.keyDown(document, { key: "Escape" });
      expect(screen.queryByRole("dialog")).toBeNull();

      openOptions();
      fireEvent.mouseDown(document.body);
      expect(screen.queryByRole("dialog")).toBeNull();
    });

    it("offers only Fit and Crop for a video, whose time is the timeline's", () => {
      renderInspector(video(), { motionTab: "motion" });
      openOptions("Video options");

      const options = within(screen.getByRole("dialog"));

      expect(options.getAllByRole("tab").map((tab) => tab.textContent)).toEqual([
        "Fit",
        "Crop",
      ]);
    });
  });

  describe("switches", () => {
    it("reflects the object state on each switch", () => {
      renderInspector({
        ...createSceneObject({ id: "object-1", name: "Object 1" }),
        matteColors: false,
        showDeviceShell: true,
      });

      expect(screen.getByRole("switch", { name: "Device body" })).toHaveAttribute(
        "aria-checked",
        "true",
      );
      expect(screen.getByRole("switch", { name: "Matte finish" })).toHaveAttribute(
        "aria-checked",
        "false",
      );
    });

    it("toggles from the switch and from its label text", () => {
      const handlers = renderInspector();

      fireEvent.click(screen.getByRole("switch", { name: "Device body" }));
      fireEvent.click(screen.getByText("Matte finish"));

      expect(handlers.onToggleDeviceShell).toHaveBeenCalledTimes(1);
      expect(handlers.onToggleMatteColors).toHaveBeenCalledTimes(1);
    });
  });

  describe("uploaded file row", () => {
    it("replaces the upload card with the file name and the options menu", () => {
      renderInspector({
        ...createSceneObject({ id: "object-1", name: "Object 1" }),
        imageName: "a-very-long-screenshot-name-from-the-app.png",
        imageUrl: "data:image/png;base64,AAAA",
      });

      expect(screen.queryByLabelText("Choose image")).toBeNull();
      // O nome inteiro fica no title: o visual corta com reticências.
      expect(
        screen.getByTitle("a-very-long-screenshot-name-from-the-app.png"),
      ).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Image options" })).toBeInTheDocument();
    });

    it("keeps the upload card while the screen shows the placeholder", () => {
      renderInspector();

      expect(screen.getByLabelText("Choose image")).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Image options" })).toBeNull();
    });
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
      showNotebookKeyboard: false,
    };

    renderInspector(notebook);
    fireEvent.click(screen.getByRole("button", { name: "Custom" }));

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
      showNotebookKeyboard: false,
    };

    const handlers = renderInspector(notebook);

    fireEvent.click(screen.getByRole("button", { name: "Custom" }));
    fireEvent.click(screen.getByText("color-row:Tampa traseira"));

    expect(handlers.onThemeColorChange).toHaveBeenCalledWith(
      "screenBackCover",
      "#123456",
    );
  });
});
