"use client";

import type { ThemeName } from "../components/Smartphone";

export type Locale = "pt-BR" | "en-US";
export type UiTheme = "dark" | "light";

export type AppCopy = {
  appTitle: string;
  appSubtitle: string;
  addObject: string;
  baseObject: string;
  languageLabel: string;
  themeLabel: string;
  darkMode: string;
  lightMode: string;
  portuguese: string;
  english: string;
  layersSectionTitle: string;
  deleteObject: string;
  modelLabel: string;
  objectSectionTitle: string;
  objectNameLabel: string;
  resetCameraButton: string;
  resetObjectButton: string;
  deviceSectionTitle: string;
  activeDevice: string;
  deviceSectionHint: string;
  sceneSectionTitle: string;
  shellOn: string;
  screenOnly: string;
  sceneSectionHint: string;
  screenSectionTitle: string;
  uploadImage: string;
  screenSectionHintLine1: string;
  screenSectionHintLine2: string;
  themesSectionTitle: string;
  bodyColorSectionTitle: string;
  bodyColorLabel: string;
  debugSectionTitle: string;
  transformSectionTitle: string;
  resetButton: string;
  positionX: string;
  positionY: string;
  rotationX: string;
  rotationY: string;
  rotationZ: string;
  transformSectionHint: string;
  exportSectionTitle: string;
  exportSectionHint: string;
  debugOn: string;
  debugOff: string;
  uploadImageError: string;
  exportImageError: string;
  themeNames: Record<ThemeName, string>;
};

export const APP_COPY: Record<Locale, AppCopy> = {
  "pt-BR": {
    appTitle: "Mockup Studio",
    appSubtitle: "MVP de 1 objeto com export transparente",
    addObject: "Adicionar objeto",
    baseObject: "Objeto base",
    languageLabel: "Idioma",
    themeLabel: "Interface",
    darkMode: "Dark",
    lightMode: "Light",
    portuguese: "PT-BR",
    english: "EN-US",
    layersSectionTitle: "Camadas",
    deleteObject: "Excluir",
    modelLabel: "Modelo",
    objectSectionTitle: "Objeto",
    objectNameLabel: "Nome",
    resetCameraButton: "Reset camera",
    resetObjectButton: "Reset objeto",
    deviceSectionTitle: "Dispositivo",
    activeDevice: "Ativo",
    deviceSectionHint:
      "A base agora suporta catalogo de dispositivos, mesmo com apenas um modelo ativo por enquanto.",
    sceneSectionTitle: "Cena",
    shellOn: "Casca ligada",
    screenOnly: "So tela",
    sceneSectionHint:
      "Desligue a casca para trabalhar apenas com a textura da tela, sem moldura de dispositivo ao redor.",
    screenSectionTitle: "Tela do App",
    uploadImage: "Upload imagem",
    screenSectionHintLine1: "Proporcao recomendada: 9:19.3.",
    screenSectionHintLine2: "Export final sempre em PNG com fundo transparente.",
    themesSectionTitle: "Temas",
    bodyColorSectionTitle: "Cor do Body",
    bodyColorLabel: "Body",
    debugSectionTitle: "Debug",
    transformSectionTitle: "Transform",
    resetButton: "Reset camera + objeto",
    positionX: "Posicao X",
    positionY: "Posicao Y",
    rotationX: "Rotacao X",
    rotationY: "Rotacao Y",
    rotationZ: "Rotacao Z",
    transformSectionHint:
      "Ajuste a posicao do objeto no canvas e refine a rotacao sem mover a camera.",
    exportSectionTitle: "Export PNG",
    exportSectionHint:
      "O arquivo sai sem fundo e com supersampling pelo resize do render.",
    debugOn: "Debug interativo: ON",
    debugOff: "Debug interativo: OFF",
    uploadImageError: "Nao foi possivel preparar essa imagem.",
    exportImageError: "Nao foi possivel exportar o PNG.",
    themeNames: {
      gray: "Cinza",
      black: "Preto",
      white: "Branco",
    },
  },
  "en-US": {
    appTitle: "Mockup Studio",
    appSubtitle: "Single-object MVP with transparent export",
    addObject: "Add object",
    baseObject: "Base object",
    languageLabel: "Language",
    themeLabel: "Interface",
    darkMode: "Dark",
    lightMode: "Light",
    portuguese: "PT-BR",
    english: "EN-US",
    layersSectionTitle: "Layers",
    deleteObject: "Delete",
    modelLabel: "Model",
    objectSectionTitle: "Object",
    objectNameLabel: "Name",
    resetCameraButton: "Reset camera",
    resetObjectButton: "Reset object",
    deviceSectionTitle: "Device",
    activeDevice: "Active",
    deviceSectionHint:
      "The foundation now supports a device catalog, even with only one active model for now.",
    sceneSectionTitle: "Scene",
    shellOn: "Shell on",
    screenOnly: "Screen only",
    sceneSectionHint:
      "Turn the shell off to work only with the screen texture, without the device frame around it.",
    screenSectionTitle: "App Screen",
    uploadImage: "Upload image",
    screenSectionHintLine1: "Recommended ratio: 9:19.3.",
    screenSectionHintLine2: "Final export is always a PNG with transparent background.",
    themesSectionTitle: "Themes",
    bodyColorSectionTitle: "Body Color",
    bodyColorLabel: "Body",
    debugSectionTitle: "Debug",
    transformSectionTitle: "Transform",
    resetButton: "Reset camera + object",
    positionX: "Position X",
    positionY: "Position Y",
    rotationX: "Rotation X",
    rotationY: "Rotation Y",
    rotationZ: "Rotation Z",
    transformSectionHint:
      "Adjust the object's position on the canvas and refine rotation without moving the camera.",
    exportSectionTitle: "Export PNG",
    exportSectionHint:
      "The file is exported without background and uses supersampling via render resize.",
    debugOn: "Interactive debug: ON",
    debugOff: "Interactive debug: OFF",
    uploadImageError: "Could not prepare this image.",
    exportImageError: "Could not export the PNG.",
    themeNames: {
      gray: "Gray",
      black: "Black",
      white: "White",
    },
  },
};
