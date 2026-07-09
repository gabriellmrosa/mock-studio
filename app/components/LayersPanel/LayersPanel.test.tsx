import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import LayersPanel from "./LayersPanel";
import { createSceneObject } from "../../lib/scene-objects";
import type { AppCopy } from "../../lib/i18n";

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
  fitSceneButton: "Fit to view",
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
  takePhotoButton: "Export",
  exportBackgroundLabel: "Background",
  exportWithBackground: "With background",
  exportTransparent: "Transparent",
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
