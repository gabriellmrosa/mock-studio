import { act, fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import LayersPanel from "./LayersPanel";
import { createCameraObject } from "../../lib/camera-objects";
import { createSceneObject } from "../../lib/scene-objects";
import { createSceneTemplate } from "../../lib/scene-templates";
import { APP_COPY, type AppCopy } from "../../lib/i18n";

jest.mock("../CreditsModal/CreditsModal", () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock("../ContextMenu/ContextMenu", () => ({
  __esModule: true,
  // Só os itens de ação, sempre à vista: o menu de verdade abre num portal.
  default: ({
    items = [],
    triggerAriaLabel,
    triggerIcon,
  }: {
    items?: { label?: string; onClick?: () => void; type: string }[];
    triggerAriaLabel: string;
    triggerIcon: ReactNode;
  }) => (
    <>
      <button type="button" aria-label={triggerAriaLabel}>
        {triggerIcon}
      </button>
      {items
        .filter((item) => item.type === "action")
        .map((item) => (
          <button key={item.label} type="button" onClick={item.onClick}>
            {item.label}
          </button>
        ))}
    </>
  ),
}));

const copy: AppCopy = {
  addObject: "Add object",
  addDeviceObject: "Device",
  addTextObject: "Text",
  textObjectName: "Text",
  addImageObject: "Image",
  imageObjectName: "Image",
  imageSectionTitle: "Image",
  imageObjectHint: "PNG or SVG",
  imageEmptyLabel: "Upload your PNG or SVG",
  addStickerObject: "Sticker",
  stickerObjectName: "Sticker",
  stickerSectionTitle: "Sticker",
  stickerChange: "Change sticker",
  stickerOutlineLabel: "Outline",
  imageShadowLabel: "Shadow",
  imageSpeedLabel: "Speed",
  stickerPickerTitle: "Choose a sticker",
  stickerSearchLabel: "Search stickers",
  stickerCategoryLabel: "Category",
  stickerCount: "stickers",
  stickerCategoryNames: {},
  stickerNone: "No sticker found.",
  stickerLabels: null,
  textDefaultContent: "Your text",
  textSectionTitle: "Text",
  textContentLabel: "Content",
  textFontLabel: "Font",
  textWeightLabel: "Weight",
  textSizeLabel: "Size",
  textColorLabel: "Color",
  textAlignLabel: "Align",
  textAlignLeft: "Left",
  textAlignCenter: "Center",
  textAlignRight: "Right",
  textLineHeightLabel: "Line height",
  textLetterSpacingLabel: "Letter spacing",
  textWidthAuto: "Auto",
  textMaxWidthLabel: "Width",
  textUnsupportedHint: "Letters outside the Latin alphabet show as ?",
  appTitle: "Mock Studio",
  appSubtitle: "Visual mockup editor",
  baseObject: "Base object",
  appearanceTabsLabel: "Appearance options",
  appearanceTabCustom: "Custom",
  backgroundColorButton: "Background color",
  cameraObjectName: "Camera",
  cameraSectionTitle: "Camera",
  cameraAzimuthLabel: "Horizontal orbit (°)",
  cameraElevationLabel: "Vertical orbit (°)",
  cameraDistanceLabel: "Distance",
  cameraTargetXLabel: "Target X",
  cameraTargetYLabel: "Target Y",
  cameraTargetZLabel: "Target Z",
  cameraFovLabel: "Lens (field of view °)",
  canvasBackgroundSection: "Background",
  canvasGridSection: "Floor grid",
  canvasGridColorLabel: "Grid color",
  canvasGridOpacityLabel: "Grid opacity",
  canvasGridResetLabel: "Back to automatic grid",
  canvasColorLabel: "Color",
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
  patchNotesTitle: "What's new",
  patchNotesEyebrow: "Version history",
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
  resetCameraButton: "Reset camera",
  shareTemplate: "Share template",
  shareTemplateIntro: "Copy the code.",
  shareTemplateNote: "Screens don't travel.",
  shareTemplateNext: "Import it.",
  shareTemplateCodeLabel: "Template code",
  shareTemplateCopy: "Copy code",
  templateCodeCopied: "Code copied",
  templateCodeCopyError: "Couldn't copy the code.",
  templateCodeCreateError: "Couldn't create the code.",
  importTemplateInvalid: "This code is incomplete or corrupted.",
  importTemplate: "Import template",
  importTemplateIntro: "Paste the link.",
  importTemplateNote: "Screens don't travel.",
  importTemplateFieldLabel: "Template link",
  importTemplatePlaceholder: "https://…/#scene=…",
  importTemplateSubmit: "Import",
  templateImported: "Template imported.",
  templateImportedIn: "Template imported into the list of",
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
  canvasModePhoto: "Photo",
  canvasModeVideo: "Video",
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
  colorPartLabels: {},
};

describe("LayersPanel", () => {
  it("renders a discreet GitHub link in the footer", () => {
    const object = createSceneObject({
      id: "object-1",
      name: "Object 1",
    });

    render(
      <LayersPanel
        appMeta="v1.0.0"
        copy={copy}
        locale="en-US"
        objects={[object]}
        onAddObject={jest.fn()}
        onAddImage={jest.fn()}
        onAddSticker={jest.fn()}
        onAddText={jest.fn()}
        onDuplicateObject={jest.fn()}
        onLocaleChange={jest.fn()}
        onRenameObject={jest.fn()}
        onRemoveObject={jest.fn()}
        onSelectObject={jest.fn()}
        onToggleObjectVisibility={jest.fn()}
        selectedObjectId={object.id}
      />,
    );

    expect(screen.getByLabelText("View source on GitHub")).toHaveAttribute(
      "href",
      "https://github.com/gabriellmrosa/mockup-studio",
    );
  });

  it("calls visibility toggle from the eye button", () => {
    const object = createSceneObject({
      id: "object-1",
      name: "Object 1",
    });
    const onToggleObjectVisibility = jest.fn();

    render(
      <LayersPanel
        appMeta="v1.0.0"
        copy={copy}
        locale="en-US"
        objects={[object]}
        onAddObject={jest.fn()}
        onAddImage={jest.fn()}
        onAddSticker={jest.fn()}
        onAddText={jest.fn()}
        onDuplicateObject={jest.fn()}
        onLocaleChange={jest.fn()}
        onRenameObject={jest.fn()}
        onRemoveObject={jest.fn()}
        onSelectObject={jest.fn()}
        onToggleObjectVisibility={onToggleObjectVisibility}
        selectedObjectId={object.id}
      />,
    );

    fireEvent.click(screen.getByTitle("Hide"));

    expect(onToggleObjectVisibility).toHaveBeenCalledWith("object-1");
  });

  it("allows renaming an object by double clicking its title", () => {
    const object = createSceneObject({
      id: "object-2",
      name: "Object 2",
    });
    const onRenameObject = jest.fn();

    render(
      <LayersPanel
        appMeta="v1.0.0"
        copy={copy}
        locale="en-US"
        objects={[object]}
        onAddObject={jest.fn()}
        onAddImage={jest.fn()}
        onAddSticker={jest.fn()}
        onAddText={jest.fn()}
        onDuplicateObject={jest.fn()}
        onLocaleChange={jest.fn()}
        onRenameObject={onRenameObject}
        onRemoveObject={jest.fn()}
        onSelectObject={jest.fn()}
        onToggleObjectVisibility={jest.fn()}
        selectedObjectId={object.id}
      />,
    );

    fireEvent.doubleClick(screen.getByText("Object 2"));

    const input = screen.getByDisplayValue("Object 2");
    fireEvent.change(input, { target: { value: "Homepage Mockup" } });
    fireEvent.blur(input);

    expect(onRenameObject).toHaveBeenCalledWith("object-2", "Homepage Mockup");
  });

  describe("template menu", () => {
    function renderWithTemplate(onCreateTemplateCode?: jest.Mock) {
      const object = createSceneObject({ id: "object-1", name: "Object 1" });
      const template = createSceneTemplate({
        id: "template-1",
        name: "My template",
        objects: [object],
      });

      render(
        <LayersPanel
          appMeta="v1.0.0"
          copy={copy}
          locale="en-US"
          objects={[object]}
          onAddObject={jest.fn()}
          onAddImage={jest.fn()}
          onAddSticker={jest.fn()}
          onAddText={jest.fn()}
          onCreateTemplateCode={onCreateTemplateCode}
          onDuplicateObject={jest.fn()}
          onLocaleChange={jest.fn()}
          onRenameObject={jest.fn()}
          onRemoveObject={jest.fn()}
          onSelectObject={jest.fn()}
          onToggleObjectVisibility={jest.fn()}
          selectedObjectId={object.id}
          templates={[template]}
        />,
      );
    }

    it("opens the share modal with the code of that template", async () => {
      const onCreateTemplateCode = jest.fn(() => Promise.resolve("CODE123"));

      renderWithTemplate(onCreateTemplateCode);
      fireEvent.click(screen.getByText("Share template"));
      await act(async () => {});

      expect(onCreateTemplateCode).toHaveBeenCalledWith("template-1");
      expect(screen.getByRole("dialog")).toBeInTheDocument();
      expect(screen.getByLabelText("Template code")).toHaveValue("CODE123");
    });

    it("stays closed when the code could not be made", async () => {
      renderWithTemplate(jest.fn(() => Promise.resolve(null)));
      fireEvent.click(screen.getByText("Share template"));
      await act(async () => {});

      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("offers no share action when nothing handles it", () => {
      renderWithTemplate();

      expect(screen.queryByText("Share template")).not.toBeInTheDocument();
    });
  });

  describe("import template", () => {
    function renderWithImport(onImportTemplate?: jest.Mock) {
      const object = createSceneObject({ id: "object-1", name: "Object 1" });

      render(
        <LayersPanel
          appMeta="v1.0.0"
          copy={copy}
          locale="en-US"
          objects={[object]}
          onAddObject={jest.fn()}
          onAddImage={jest.fn()}
          onAddSticker={jest.fn()}
          onAddText={jest.fn()}
          onDuplicateObject={jest.fn()}
          onImportTemplate={onImportTemplate}
          onLocaleChange={jest.fn()}
          onRenameObject={jest.fn()}
          onRemoveObject={jest.fn()}
          onSelectObject={jest.fn()}
          onToggleObjectVisibility={jest.fn()}
          selectedObjectId={object.id}
          templates={[]}
        />,
      );
    }

    it("opens the import modal from a button in the templates section", () => {
      renderWithImport(jest.fn(() => Promise.resolve(true)));

      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

      fireEvent.click(screen.getByRole("button", { name: "Import template" }));

      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    it("has no import button when nothing handles it", () => {
      renderWithImport();

      expect(
        screen.queryByRole("button", { name: "Import template" }),
      ).not.toBeInTheDocument();
    });
  });

  describe("camera", () => {
    function renderWithCamera(onSelectObject = jest.fn()) {
      const phone = createSceneObject({ id: "phone", name: "Object 1" });
      const camera = { ...createCameraObject({ id: "camera", name: "Camera" }), name: "Camera" };

      // A câmera vai no fim dos dados, e a lista a mostra primeiro.
      render(
        <LayersPanel
          appMeta="v1.0.0"
          copy={copy}
          locale="en-US"
          objects={[phone, camera]}
          onAddObject={jest.fn()}
          onAddImage={jest.fn()}
          onAddSticker={jest.fn()}
          onAddText={jest.fn()}
          onDuplicateObject={jest.fn()}
          onLocaleChange={jest.fn()}
          onRenameObject={jest.fn()}
          onRemoveObject={jest.fn()}
          onSelectObject={onSelectObject}
          onToggleObjectVisibility={jest.fn()}
          selectedObjectId="phone"
        />,
      );

      return onSelectObject;
    }

    it("is the first row of the list, before the objects", () => {
      renderWithCamera();

      expect(
        screen.getByText("Camera").compareDocumentPosition(screen.getByText("Object 1")) &
          Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
    });

    it("can be selected, like any object", () => {
      const onSelectObject = renderWithCamera();

      fireEvent.click(screen.getByText("Camera"));

      expect(onSelectObject).toHaveBeenCalledWith("camera");
    });

    it("has nothing to hide, duplicate, rename or delete: no eye and no menu", () => {
      renderWithCamera();

      const row = screen.getByText("Camera").closest('[role="button"]') as HTMLElement;

      expect(row.querySelector("[title='Hide']")).toBeNull();
      expect(row.querySelector("[aria-label='Object options']")).toBeNull();
      // Só o aparelho tem o olho e o menu.
      expect(screen.getAllByLabelText("Object options")).toHaveLength(1);
    });

    it("cannot be renamed by a double click", () => {
      renderWithCamera();

      fireEvent.doubleClick(screen.getByText("Camera"));

      expect(screen.queryByDisplayValue("Camera")).not.toBeInTheDocument();
    });
  });
});
