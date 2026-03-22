"use client";

export type Locale = "pt-BR" | "en-US";
export type UiTheme = "dark" | "light";

export type AppCopy = {
  appTitle: string;
  addObject: string;
  baseObject: string;
  fitSceneButton: string;
  languageLabel: string;
  themeLabel: string;
  darkMode: string;
  lightMode: string;
  portuguese: string;
  english: string;
  resetCameraButton: string;
  takePhotoButton: string;
  deleteObject: string;
  renameObject: string;
  modelLabel: string;
  sceneSectionHint: string;
  screenSectionTitle: string;
  uploadImage: string;
  screenSectionHintPrefix: string;
  themesSectionTitle: string;
  bodyColorLabel: string;
  matteColorLabel: string;
  debugSectionTitle: string;
  transformSectionTitle: string;
  resetObjectButton: string;
  positionX: string;
  positionY: string;
  positionZ: string;
  rotationX: string;
  rotationY: string;
  rotationZ: string;
  scale: string;
  debugOn: string;
  debugOff: string;
  uploadImageError: string;
  themeNames: Record<string, string>;
};

export const APP_COPY: Record<Locale, AppCopy> = {
  "pt-BR": {
    appTitle: "Mock Studio",
    addObject: "Adicionar objeto",
    baseObject: "Objeto base",
    fitSceneButton: "Enquadrar cena",
    languageLabel: "Idioma",
    themeLabel: "Tema",
    darkMode: "Dark",
    lightMode: "Light",
    portuguese: "PT-BR",
    english: "EN-US",
    resetCameraButton: "Reset camera",
    takePhotoButton: "Tirar foto",
    deleteObject: "Excluir",
    renameObject: "Renomear",
    modelLabel: "Modelo",
    sceneSectionHint:
      "Você pode ativar ou desativar a casca 3D",
    screenSectionTitle: "Tela do App",
    uploadImage: "Upload imagem",
    screenSectionHintPrefix: "Recommended",
    themesSectionTitle: "Temas",
    bodyColorLabel: "Customizar",
    matteColorLabel: "Cor fosca",
    debugSectionTitle: "Debug",
    transformSectionTitle: "Transform",
    resetObjectButton: "Reset objeto",
    positionX: "Posição X",
    positionY: "Posição Y",
    positionZ: "Posição Z",
    rotationX: "Rotação X",
    rotationY: "Rotação Y",
    rotationZ: "Rotação Z",
    scale: "Escala",
    debugOn: "Debug interativo: ON",
    debugOff: "Debug interativo: OFF",
    uploadImageError: "Nao foi possivel preparar essa imagem.",
    themeNames: {
      gray: "Cinza",
      black: "Preto",
      "light-gray": "Cinza Claro",
      blood: "Blood",
    },
  },
  "en-US": {
    appTitle: "Mock Studio",
    addObject: "Add object",
    baseObject: "Base object",
    fitSceneButton: "Fit scene",
    languageLabel: "Language",
    themeLabel: "Theme",
    darkMode: "Dark",
    lightMode: "Light",
    portuguese: "PT-BR",
    english: "EN-US",
    resetCameraButton: "Reset camera",
    takePhotoButton: "Take photo",
    deleteObject: "Delete",
    renameObject: "Rename",
    modelLabel: "Model",
    sceneSectionHint:
      "You can toggle the 3D shell",
    screenSectionTitle: "App Screen",
    uploadImage: "Upload image",
    screenSectionHintPrefix: "Recommended",
    themesSectionTitle: "Themes",
    bodyColorLabel: "Customize",
    matteColorLabel: "Matte finish",
    debugSectionTitle: "Debug",
    transformSectionTitle: "Transform",
    resetObjectButton: "Reset object",
    positionX: "Position X",
    positionY: "Position Y",
    positionZ: "Position Z",
    rotationX: "Rotation X",
    rotationY: "Rotation Y",
    rotationZ: "Rotation Z",
    scale: "Scale",
    debugOn: "Interactive debug: ON",
    debugOff: "Interactive debug: OFF",
    uploadImageError: "Could not prepare this image.",
    themeNames: {
      gray: "Gray",
      black: "Black",
      "light-gray": "Light Gray",
      blood: "Blood",
    },
  },
};
