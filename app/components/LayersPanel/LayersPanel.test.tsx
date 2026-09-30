import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import LayersPanel from "./LayersPanel";
import { createSceneObject } from "../../lib/scene-objects";
import { APP_COPY, type AppCopy } from "../../lib/i18n";

jest.mock("../CreditsModal/CreditsModal", () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock("../ContextMenu/ContextMenu", () => ({
  __esModule: true,
  default: ({
    triggerAriaLabel,
    triggerIcon,
  }: {
    triggerAriaLabel: string;
    triggerIcon: ReactNode;
  }) => (
    <button type="button" aria-label={triggerAriaLabel}>
      {triggerIcon}
    </button>
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
  matteColorLabel: "Matte",
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
  motionFrameLabel: "Video size",
  motionFrameWidth: "Width",
  motionFrameHeight: "Height",
  motionFrameKeepRatio: "Keep aspect ratio",
  motionFrameRatio: "Aspect ratio",
  exportTabImage: APP_COPY["en-US"].exportTabImage,
  exportTabVideo: APP_COPY["en-US"].exportTabVideo,
  videoExportDestination: APP_COPY["en-US"].videoExportDestination,
  videoExportUnavailable: APP_COPY["en-US"].videoExportUnavailable,
  videoExportPresets: APP_COPY["en-US"].videoExportPresets,
  videoExportCustomize: APP_COPY["en-US"].videoExportCustomize,
  videoExportFps: APP_COPY["en-US"].videoExportFps,
  videoExportResolution: APP_COPY["en-US"].videoExportResolution,
  videoExportSubmit: APP_COPY["en-US"].videoExportSubmit,
  videoExportCancel: APP_COPY["en-US"].videoExportCancel,
  videoExportProgress: APP_COPY["en-US"].videoExportProgress,
  videoExportUnsupported: APP_COPY["en-US"].videoExportUnsupported,
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
        onDuplicateObject={jest.fn()}
        onLocaleChange={jest.fn()}
        onRenameObject={jest.fn()}
        onRemoveObject={jest.fn()}
        onSelectObject={jest.fn()}
        onToggleObjectVisibility={jest.fn()}
        onUiThemeChange={jest.fn()}
        selectedObjectId={object.id}
        uiTheme="dark"
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
        onDuplicateObject={jest.fn()}
        onLocaleChange={jest.fn()}
        onRenameObject={jest.fn()}
        onRemoveObject={jest.fn()}
        onSelectObject={jest.fn()}
        onToggleObjectVisibility={onToggleObjectVisibility}
        onUiThemeChange={jest.fn()}
        selectedObjectId={object.id}
        uiTheme="dark"
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
        onDuplicateObject={jest.fn()}
        onLocaleChange={jest.fn()}
        onRenameObject={onRenameObject}
        onRemoveObject={jest.fn()}
        onSelectObject={jest.fn()}
        onToggleObjectVisibility={jest.fn()}
        onUiThemeChange={jest.fn()}
        selectedObjectId={object.id}
        uiTheme="dark"
      />,
    );

    fireEvent.doubleClick(screen.getByText("Object 2"));

    const input = screen.getByDisplayValue("Object 2");
    fireEvent.change(input, { target: { value: "Homepage Mockup" } });
    fireEvent.blur(input);

    expect(onRenameObject).toHaveBeenCalledWith("object-2", "Homepage Mockup");
  });
});
