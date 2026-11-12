import { fireEvent, render, screen, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { insertKeyframe } from "../../lib/scene-motion";
import InspectorPanel from "./InspectorPanel";
import {
  DEFAULT_SCREEN_FIT,
  createSceneObject,
} from "../../lib/scene-objects";
import { APP_COPY, type AppCopy } from "../../lib/i18n";

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
  ResetButton: jest.requireActual("../EditorPrimitives/EditorPrimitives")
    .ResetButton,
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
  matteFinishToggleLabel: "Matte finish",
  languageLabel: "Language",
  layersSectionTitle: "Objects",
  lightMode: "Light",
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
  alignmentLabel: "Alignment",
  alignmentHorizontal: "Horizontal alignment",
  alignmentVertical: "Vertical alignment",
  alignLeft: "Align left",
  alignCenter: "Center horizontally",
  alignRight: "Align right",
  alignTop: "Align top",
  alignMiddle: "Center vertically",
  alignBottom: "Align bottom",
  rotationX: "Rotation X",
  rotationY: "Rotation Y",
  rotationZ: "Rotation Z",
  scale: "Scale",
  opacity: "Opacity (%)",
  foldAngle: "Opening (°)",
  innerScreenLabel: "Inner screen",
  outerScreenLabel: "Outer screen",
  sceneSectionHint: "Device body",
  screenSectionHintPrefix: "Ideal size:",
  screenSectionTitle: "App Screen",
  showObject: "Show",
  takePhotoButton: "Export",
  exportBackgroundLabel: "Background",
  exportWithBackground: "With background",
  exportTransparent: "Transparent",
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
  canvasModeLabel: "Scene mode",
  motionTimeline: "Timeline",
  motionZoomLabel: APP_COPY["en-US"].motionZoomLabel,
  motionZoomIn: APP_COPY["en-US"].motionZoomIn,
  motionZoomOut: APP_COPY["en-US"].motionZoomOut,
  motionVideoTrimStart: APP_COPY["en-US"].motionVideoTrimStart,
  motionVideoTrimEnd: APP_COPY["en-US"].motionVideoTrimEnd,
  timelineResizeLabel: APP_COPY["en-US"].timelineResizeLabel,
  timelineResizeHint: APP_COPY["en-US"].timelineResizeHint,
  motionFrameLabel: "Video size",
  motionFrameWidth: "Width",
  motionFrameHeight: "Height",
  motionFrameKeepRatio: "Keep aspect ratio",
  motionFrameRatio: "Aspect ratio",
  exportTabImage: APP_COPY["en-US"].exportTabImage,
  exportFormatLabel: APP_COPY["en-US"].exportFormatLabel,
  exportSizeLabel: APP_COPY["en-US"].exportSizeLabel,
  dialogCancel: APP_COPY["en-US"].dialogCancel,
  exportTabVideo: APP_COPY["en-US"].exportTabVideo,
  videoExportUnavailable: APP_COPY["en-US"].videoExportUnavailable,
  videoExportFps: APP_COPY["en-US"].videoExportFps,
  videoExportResolution: APP_COPY["en-US"].videoExportResolution,
  videoExportCancel: APP_COPY["en-US"].videoExportCancel,
  videoExportProgress: APP_COPY["en-US"].videoExportProgress,
  videoExportProgressTitle: APP_COPY["en-US"].videoExportProgressTitle,
  videoExportEstimating: APP_COPY["en-US"].videoExportEstimating,
  videoExportRemaining: APP_COPY["en-US"].videoExportRemaining,
  videoExportFinishing: APP_COPY["en-US"].videoExportFinishing,
  videoExportHint: APP_COPY["en-US"].videoExportHint,
  videoExportUnsupported: APP_COPY["en-US"].videoExportUnsupported,
  videoExportSafariTransparent: APP_COPY["en-US"].videoExportSafariTransparent,
  projectLinkCopy: APP_COPY["en-US"].projectLinkCopy,
  projectLinkCopied: APP_COPY["en-US"].projectLinkCopied,
  projectLinkCopyError: APP_COPY["en-US"].projectLinkCopyError,
  projectLinkTemplateName: APP_COPY["en-US"].projectLinkTemplateName,
  projectLinkOpened: APP_COPY["en-US"].projectLinkOpened,
  projectLinkInvalid: APP_COPY["en-US"].projectLinkInvalid,
  analyticsConsentTitle: APP_COPY["en-US"].analyticsConsentTitle,
  analyticsConsentText: APP_COPY["en-US"].analyticsConsentText,
  analyticsConsentAccept: APP_COPY["en-US"].analyticsConsentAccept,
  analyticsConsentDecline: APP_COPY["en-US"].analyticsConsentDecline,
  videoExportSuccess: APP_COPY["en-US"].videoExportSuccess,
  videoExportError: APP_COPY["en-US"].videoExportError,
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
  screenAddImage: "Add image",
  screenAddVideo: "Add video",
  themeCustomName: "Custom",
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
    "star-white": "Star White",
    "night-sky": "Night Sky",
    blue: "Blue",
    green: "Green",
    pink: "Pink",
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

/** A cor do aparelho fica numa faixa; as opções abrem pelo "⋮" dela. */
function openAppearance() {
  fireEvent.click(screen.getByRole("button", { name: "Appearance options" }));
}

function renderInspector(
  object = createSceneObject({ id: "object-1", modelId: "smartphone", name: "Object 1" }),
  {
    motionTab = "static",
    selectedKeyframeId = "",
  }: { motionTab?: "static" | "motion"; selectedKeyframeId?: string } = {},
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
    onAlignObject: jest.fn(),
    onThemeColorChange: jest.fn(),
    onThemeChange: jest.fn(),
    onToggleDeviceShell: jest.fn(),
    onToggleNotebookKeyboard: jest.fn(),
    onToggleTabletBezel: jest.fn(),
    onToggleMatteFinish: jest.fn(),
    onUpdatePosition: jest.fn(),
    onUpdateRotation: jest.fn(),
    onUpdateScale: jest.fn(),
    onUpdateOpacity: jest.fn(),
    onUpdateFoldAngle: jest.fn(),
    onOuterImageUpload: jest.fn(),
    onOuterVideoUpload: jest.fn(),
    onRemoveOuterVideo: jest.fn(),
    onOuterScreenSourceChange: jest.fn(),
    onRemoveOuterImage: jest.fn(),
    onUpdateOuterScreenFit: jest.fn(),
  };

  render(
    <InspectorPanel
      copy={copy}
      object={object}
      uiTheme="dark"
      motionTab={motionTab}
      selectedKeyframeId={selectedKeyframeId}
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

    // Sem arquivo ainda, a faixa já está lá, com o "⋮".
    expect(screen.getByText("Add image")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Image options" })).toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: "Video" })).toBeNull();
  });

  it("switches the screen between image and video in Motion", () => {
    const handlers = renderInspector(undefined, { motionTab: "motion" });

    expect(screen.getByText("Add image")).toBeInTheDocument();

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
          trimEndMs: 0,
          trimStartMs: 0,
          url: "blob:x",
        },
      },
      { motionTab: "motion" },
    );

    expect(screen.getByRole("button", { name: "Video options" })).toBeInTheDocument();
    expect(screen.getByText("recording.mov")).toBeInTheDocument();
    expect(screen.getByText("12.4s")).toBeInTheDocument();
    expect(screen.queryByLabelText("Add image")).not.toBeInTheDocument();
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
        trimEndMs: 0,
        trimStartMs: 0,
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
        showDeviceShell: false,
      });

      expect(screen.getByRole("switch", { name: "Device body" })).toHaveAttribute(
        "aria-checked",
        "false",
      );
      // O "Acabamento fosco" saiu: não mudava nada na maioria dos aparelhos.
      expect(screen.queryByRole("switch", { name: "Matte finish" })).toBeNull();
    });

    it("toggles from the switch and from its label text", () => {
      const handlers = renderInspector();

      fireEvent.click(screen.getByRole("switch", { name: "Device body" }));
      fireEvent.click(screen.getByText("Device body"));

      expect(handlers.onToggleDeviceShell).toHaveBeenCalledTimes(2);
    });
  });

  describe("uploaded file row", () => {
    it("replaces the upload card with the file name and the options menu", () => {
      renderInspector({
        ...createSceneObject({ id: "object-1", name: "Object 1" }),
        imageName: "a-very-long-screenshot-name-from-the-app.png",
        imageUrl: "data:image/png;base64,AAAA",
      });

      expect(screen.queryByLabelText("Add image")).toBeNull();
      // O nome inteiro fica no title: o visual corta com reticências.
      expect(
        screen.getByTitle("a-very-long-screenshot-name-from-the-app.png"),
      ).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Image options" })).toBeInTheDocument();
    });

    it("shows the empty row, with the ideal size in its panel and not on the row", () => {
      renderInspector();

      const row = screen.getByText("Add image").closest(".screen-file-row")!;

      expect(row).toHaveTextContent("Add image");
      expect(row).not.toHaveTextContent("1290x2748");

      fireEvent.click(screen.getByText("Add image"));

      expect(screen.getByLabelText("Choose image")).toBeInTheDocument();
      expect(screen.getByText("1290x2748")).toBeInTheDocument();
    });

    it("opens and closes the panel from anywhere on a row, not only from its menu", () => {
      renderInspector();

      fireEvent.click(screen.getByText("Add image"));
      expect(screen.getByRole("dialog", { name: "Image options" })).toBeInTheDocument();

      // Um clique dentro do painel não é um clique na linha.
      fireEvent.click(screen.getByText("1290x2748"));
      expect(screen.getByRole("dialog", { name: "Image options" })).toBeInTheDocument();

      fireEvent.click(screen.getByText("Add image"));
      expect(screen.queryByRole("dialog")).toBeNull();
    });

    it("opens the panel once from the menu button too, not twice", () => {
      renderInspector();

      fireEvent.click(screen.getByRole("button", { name: "Image options" }));

      expect(screen.getByRole("dialog", { name: "Image options" })).toBeInTheDocument();
    });
  });
  it("no longer lists video as a device model", () => {
    renderInspector();
    fireEvent.click(screen.getByLabelText("Model"));

    expect(screen.queryByText("Video MP4")).not.toBeInTheDocument();
  });

  it("calls reset object from the reset action", () => {
    const handlers = renderInspector({
      ...createSceneObject({ id: "object-1", modelId: "smartphone", name: "Object 1" }),
      positionX: 0.5,
    });

    fireEvent.click(screen.getByLabelText("Reset transform"));

    expect(handlers.onResetObject).toHaveBeenCalled();
  });

  it("dims the reset while the object is already in the default pose", () => {
    renderInspector();

    expect(screen.getByLabelText("Reset transform")).toBeDisabled();
  });

  describe("alignment", () => {
    it("aligns on one axis per button, with Reset still in the header", () => {
      const handlers = renderInspector();

      fireEvent.click(screen.getByLabelText("Align left"));
      fireEvent.click(screen.getByLabelText("Center vertically"));

      expect(handlers.onAlignObject).toHaveBeenNthCalledWith(1, {
        axis: "x",
        edge: "start",
      });
      expect(handlers.onAlignObject).toHaveBeenNthCalledWith(2, {
        axis: "y",
        edge: "center",
      });
      expect(screen.getByLabelText("Reset transform")).toBeInTheDocument();
    });

    it("splits the buttons in a horizontal and a vertical group", () => {
      renderInspector();

      const horizontal = screen.getByRole("group", { name: "Horizontal alignment" });
      const vertical = screen.getByRole("group", { name: "Vertical alignment" });

      expect(horizontal.querySelectorAll("button")).toHaveLength(3);
      expect(vertical.querySelectorAll("button")).toHaveLength(3);
    });

    it("works on the selected keyframe in Motion, where Reset doesn't apply", () => {
      const base = createSceneObject({ id: "object-1", name: "Object 1" });
      const object = { ...base, keyframes: insertKeyframe(base, 0).keyframes };

      renderInspector(object, {
        motionTab: "motion",
        selectedKeyframeId: object.keyframes[0].id,
      });

      expect(screen.getByLabelText("Align top")).toBeInTheDocument();
      expect(screen.queryByLabelText("Reset transform")).toBeNull();
    });

    it("is hidden in Motion with no keyframe to edit", () => {
      renderInspector(undefined, { motionTab: "motion" });

      expect(screen.queryByLabelText("Align left")).toBeNull();
    });
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

  it("edits opacity in percent and stores it from 0 to 1", () => {
    const handlers = renderInspector();

    // O Control mockado sempre envia 12: 12% vira 0.12.
    fireEvent.click(screen.getByText("control:Opacity (%)"));

    expect(handlers.onUpdateOpacity).toHaveBeenCalledWith(0.12);
  });

  describe("Duo, the foldable", () => {
    const duo = createSceneObject({ id: "duo-1", modelId: "duo", name: "Duo" });

    it("has an opening control, which other devices don't", () => {
      const handlers = renderInspector(duo);

      // O Control mockado sempre envia 12.
      fireEvent.click(screen.getByText("control:Opening (°)"));

      expect(handlers.onUpdateFoldAngle).toHaveBeenCalledWith(12);
    });

    it("hides the opening control on a device that doesn't fold", () => {
      renderInspector();

      expect(screen.queryByText("control:Opening (°)")).toBeNull();
      expect(screen.queryByText("Outer screen")).toBeNull();
    });

    it("keeps the finish inside the appearance panel, starting matte", () => {
      const handlers = renderInspector(duo);

      // Fora do painel de aparência não há interruptor de acabamento.
      expect(screen.queryByRole("switch", { name: "Matte finish" })).toBeNull();

      openAppearance();

      const finish = screen.getByRole("switch", { name: "Matte finish" });

      expect(finish).toBeChecked();

      fireEvent.click(finish);

      expect(handlers.onToggleMatteFinish).toHaveBeenCalled();
    });

    it("uploads an image to the outer screen separately from the inner one", () => {
      const handlers = renderInspector(duo);

      expect(screen.getByText("Inner screen")).toBeInTheDocument();
      expect(screen.getByText("Outer screen")).toBeInTheDocument();

      fireEvent.click(
        screen.getByRole("button", { name: "Image options (Outer screen)" }),
      );
      fireEvent.change(screen.getByLabelText("Choose image (Outer screen)"), {
        target: { files: [new File(["x"], "cover.png", { type: "image/png" })] },
      });

      expect(handlers.onOuterImageUpload).toHaveBeenCalled();
      expect(handlers.onImageUpload).not.toHaveBeenCalled();
    });

    it("shows the outer screen's file once it has one", () => {
      renderInspector({
        ...duo,
        outerImageName: "cover.png",
        outerImageUrl: "data:image/png;base64,AAAA",
      });

      expect(screen.getByText("cover.png")).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Image options (Outer screen)" }),
      ).toBeInTheDocument();
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
    openAppearance();
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

    openAppearance();
    fireEvent.click(screen.getByRole("button", { name: "Custom" }));
    fireEvent.click(screen.getByText("color-row:Tampa traseira"));

    expect(handlers.onThemeColorChange).toHaveBeenCalledWith(
      "screenBackCover",
      "#123456",
    );
  });

  describe("Duo screens in Motion", () => {
    const duo = createSceneObject({ id: "duo-1", modelId: "duo", name: "Duo" });

    it("gives each screen its own Image | Video choice", () => {
      const handlers = renderInspector(duo, { motionTab: "motion" });
      const inner = screen.getByRole("tablist", { name: "App Screen" });
      const outer = screen.getByRole("tablist", { name: "App Screen (Outer screen)" });

      fireEvent.click(within(outer).getByRole("tab", { name: "Video" }));

      expect(handlers.onOuterScreenSourceChange).toHaveBeenCalledWith("video");
      expect(handlers.onScreenSourceChange).not.toHaveBeenCalled();

      fireEvent.click(within(inner).getByRole("tab", { name: "Video" }));

      expect(handlers.onScreenSourceChange).toHaveBeenCalledWith("video");
    });

    it("lets the outer screen take a video, from its own upload", () => {
      const handlers = renderInspector(
        { ...duo, outerScreenSource: "video" },
        { motionTab: "motion" },
      );

      fireEvent.click(
        screen.getByRole("button", { name: "Video options (Outer screen)" }),
      );
      fireEvent.change(screen.getByLabelText("Upload video (Outer screen)"), {
        target: { files: [new File(["x"], "cover.mov", { type: "video/quicktime" })] },
      });

      expect(handlers.onOuterVideoUpload).toHaveBeenCalled();
      expect(handlers.onVideoUpload).not.toHaveBeenCalled();
    });

    it("shows the outer video's file, not the inner one's", () => {
      renderInspector(
        {
          ...duo,
          outerScreenSource: "video",
          outerScreenVideo: {
            durationMs: 3000,
            fit: { ...DEFAULT_SCREEN_FIT },
            name: "cover.mov",
            startMs: 0,
            trimEndMs: 0,
            trimStartMs: 0,
            url: "blob:cover",
          },
        },
        { motionTab: "motion" },
      );

      expect(screen.getByText("cover.mov")).toBeInTheDocument();
      expect(screen.getByText("3.0s")).toBeInTheDocument();
    });

    it("has no video choice in Static, where both screens are images", () => {
      renderInspector(duo);

      expect(screen.queryByRole("tab", { name: "Video" })).toBeNull();
    });
  });

  describe("appearance row", () => {
    it("offers the finish on the watch too, and on no other device", () => {
      renderInspector(
        createSceneObject({ id: "w-1", modelId: "smartwatch", name: "Watch" }),
      );
      openAppearance();

      expect(screen.getByRole("switch", { name: "Matte finish" })).toBeInTheDocument();
    });

    it("has no finish option on a device whose materials ignore it", () => {
      renderInspector(
        createSceneObject({ id: "s-1", modelId: "smartphone", name: "Phone" }),
      );
      openAppearance();

      expect(screen.queryByRole("switch", { name: "Matte finish" })).toBeNull();
    });

    it("shows the chosen color on a row, with the others behind its menu", () => {
      renderInspector(
        createSceneObject({ id: "duo-1", modelId: "duo", name: "Duo" }),
      );

      // Star White é o padrão; as outras cores só aparecem ao abrir.
      expect(screen.getByText("Star White")).toBeInTheDocument();
      expect(screen.queryByTitle("Black")).toBeNull();

      openAppearance();

      expect(screen.getByTitle("Black")).toBeInTheDocument();
      expect(screen.getByTitle("Pink")).toBeInTheDocument();
    });

    it("changes the color from the panel", () => {
      const handlers = renderInspector(
        createSceneObject({ id: "duo-1", modelId: "duo", name: "Duo" }),
      );

      openAppearance();
      fireEvent.click(screen.getByTitle("Black"));

      expect(handlers.onThemeChange).toHaveBeenCalledWith("black");
    });

    it("calls the row Custom once a part was painted by hand", () => {
      const duo = createSceneObject({ id: "duo-1", modelId: "duo", name: "Duo" });

      renderInspector({ ...duo, colors: { ...duo.colors, frame: "#123456" } });

      expect(screen.getByText("Custom")).toBeInTheDocument();
      expect(screen.queryByText("Star White")).toBeNull();
    });
  });
});
