export type Locale = "pt-BR" | "en-US";
export type UiTheme = "dark" | "light";

export type AppCopy = {
  appTitle: string;
  appSubtitle: string;
  addObject: string;
  baseObject: string;
  hideObject: string;
  showObject: string;
  hiddenObjectLabel: string;
  fitSceneButton: string;
  languageLabel: string;
  themeLabel: string;
  preferencesLabel: string;
  darkMode: string;
  lightMode: string;
  portuguese: string;
  english: string;
  resetCameraButton: string;
  takePhotoButton: string;
  deleteObject: string;
  duplicateObject: string;
  renameObject: string;
  layersSectionTitle: string;
  objectOptionsLabel: string;
  propertiesEyebrow: string;
  modelLabel: string;
  sceneSectionHint: string;
  keyboardToggleLabel: string;
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
  moveUpButton: string;
  moveDownButton: string;
  moveLeftButton: string;
  moveRightButton: string;
  zoomInButton: string;
  zoomOutButton: string;
  backgroundColorButton: string;
  debugOn: string;
  debugOff: string;
  canvasInitialLoadingLabel: string;
  canvasObjectLoadingLabel: string;
  canvasExportLoadingLabel: string;
  photoExportSuccess: string;
  photoExportError: string;
  dismissSnackbar: string;
  desktopOnlyTitle: string;
  desktopOnlyBody: string;
  desktopOnlyHint: string;
  uploadImageError: string;
  creditsLabel: string;
  creditsDescription: string;
  creditsEyebrow: string;
  creditsTitle: string;
  creditsCloseButton: string;
  creditsIntro: string;
  creditsAuthor: string;
  creditsSource: string;
  creditsLicense: string;
  creditsFooterThanks: string;
  creditsFooterRemoval: string;
  themeNames: Record<string, string>;
};

export const APP_COPY: Record<Locale, AppCopy> = {
  "pt-BR": {
    appTitle: "Mock Studio",
    appSubtitle: "Composição visual de mockups",
    addObject: "Adicionar camada",
    baseObject: "Camada base",
    hideObject: "Ocultar",
    showObject: "Mostrar",
    hiddenObjectLabel: "Oculto",
    fitSceneButton: "Enquadrar conteúdo",
    languageLabel: "Idioma",
    themeLabel: "Interface",
    preferencesLabel: "Preferências",
    darkMode: "Escuro",
    lightMode: "Claro",
    portuguese: "PT-BR",
    english: "EN-US",
    resetCameraButton: "Resetar visão",
    takePhotoButton: "Exportar PNG",
    deleteObject: "Excluir",
    duplicateObject: "Duplicar",
    renameObject: "Renomear",
    layersSectionTitle: "Camadas",
    objectOptionsLabel: "Opções da camada",
    propertiesEyebrow: "Propriedades",
    modelLabel: "Dispositivo",
    sceneSectionHint: "Corpo do dispositivo",
    keyboardToggleLabel: "Teclado",
    screenSectionTitle: "Tela",
    uploadImage: "Substituir imagem",
    screenSectionHintPrefix: "Tamanho ideal:",
    themesSectionTitle: "Aparência",
    bodyColorLabel: "Cores personalizadas",
    matteColorLabel: "Acabamento fosco",
    debugSectionTitle: "Debug",
    transformSectionTitle: "Transformação",
    resetObjectButton: "Resetar transformação",
    positionX: "Posição X",
    positionY: "Posição Y",
    positionZ: "Posição Z",
    rotationX: "Rotação X",
    rotationY: "Rotação Y",
    rotationZ: "Rotação Z",
    scale: "Escala",
    moveUpButton: "Mover para cima",
    moveDownButton: "Mover para baixo",
    moveLeftButton: "Mover para a esquerda",
    moveRightButton: "Mover para a direita",
    zoomInButton: "Aproximar",
    zoomOutButton: "Afastar",
    backgroundColorButton: "Cor de fundo",
    debugOn: "Debug interativo: ON",
    debugOff: "Debug interativo: OFF",
    canvasInitialLoadingLabel: "Preparando cena",
    canvasObjectLoadingLabel: "Atualizando visualização",
    canvasExportLoadingLabel: "Tirando a foto",
    photoExportSuccess:
      "Foto exportada com sucesso. Confira a pasta Downloads.",
    photoExportError: "Não foi possível exportar a foto. Tente novamente.",
    dismissSnackbar: "Fechar aviso",
    desktopOnlyTitle: "Disponível apenas em desktop",
    desktopOnlyBody:
      "Este app roda apenas em desktop ou notebook com janela de no mínimo {size}.",
    desktopOnlyHint: "Abra em uma tela maior ou aumente a janela do navegador.",
    uploadImageError: "Não foi possível carregar essa imagem.",
    creditsLabel: "CRÉDITOS",
    creditsDescription: "dos modelos 3D",
    creditsEyebrow: "Modelos 3D e licenças",
    creditsTitle: "Créditos e atribuições",
    creditsCloseButton: "Fechar créditos",
    creditsIntro:
      "Este é um projeto pessoal de estudo, sem finalidade comercial. Todos os modelos 3D são creditados conforme exigido por suas respectivas licenças.",
    creditsAuthor: "Autor",
    creditsSource: "Fonte",
    creditsLicense: "Licença",
    creditsFooterThanks:
      "Agradecimento especial aos artistas que compartilham seu trabalho com a comunidade.",
    creditsFooterRemoval:
      "Criadores: caso identifiquem qualquer uso inadequado dos assets, entre em contato para remoção imediata.",
    themeNames: {
      gray: "Cinza",
      black: "Preto",
      "light-gray": "Cinza Claro",
      blood: "Vermelho",
    },
  },
  "en-US": {
    appTitle: "Mock Studio",
    appSubtitle: "Visual mockup composition",
    addObject: "Add layer",
    baseObject: "Base layer",
    hideObject: "Hide",
    showObject: "Show",
    hiddenObjectLabel: "Hidden",
    fitSceneButton: "Fit to view",
    languageLabel: "Language",
    themeLabel: "Interface",
    preferencesLabel: "Preferences",
    darkMode: "Dark",
    lightMode: "Light",
    portuguese: "PT-BR",
    english: "EN-US",
    resetCameraButton: "Reset view",
    takePhotoButton: "Export PNG",
    deleteObject: "Delete",
    duplicateObject: "Duplicate",
    renameObject: "Rename",
    layersSectionTitle: "Layers",
    objectOptionsLabel: "Layer options",
    propertiesEyebrow: "Properties",
    modelLabel: "Device",
    sceneSectionHint: "Device body",
    keyboardToggleLabel: "Keyboard",
    screenSectionTitle: "Screen",
    uploadImage: "Replace image",
    screenSectionHintPrefix: "Ideal size:",
    themesSectionTitle: "Appearance",
    bodyColorLabel: "Custom colors",
    matteColorLabel: "Matte finish",
    debugSectionTitle: "Debug",
    transformSectionTitle: "Transform",
    resetObjectButton: "Reset transform",
    positionX: "Position X",
    positionY: "Position Y",
    positionZ: "Position Z",
    rotationX: "Rotation X",
    rotationY: "Rotation Y",
    rotationZ: "Rotation Z",
    scale: "Scale",
    moveUpButton: "Move up",
    moveDownButton: "Move down",
    moveLeftButton: "Move left",
    moveRightButton: "Move right",
    zoomInButton: "Zoom in",
    zoomOutButton: "Zoom out",
    backgroundColorButton: "Background color",
    debugOn: "Interactive debug: ON",
    debugOff: "Interactive debug: OFF",
    canvasInitialLoadingLabel: "Preparing scene",
    canvasObjectLoadingLabel: "Refreshing preview",
    canvasExportLoadingLabel: "Taking photo",
    photoExportSuccess:
      "Photo exported successfully. Check your Downloads folder.",
    photoExportError: "Could not export the photo. Please try again.",
    dismissSnackbar: "Dismiss notice",
    desktopOnlyTitle: "Desktop only",
    desktopOnlyBody:
      "This app works only on desktop or laptop screens with a minimum viewport of {size}.",
    desktopOnlyHint: "Open it on a larger screen or make the browser window bigger.",
    uploadImageError: "Could not load this image.",
    creditsLabel: "CREDITS",
    creditsDescription: "for 3D models",
    creditsEyebrow: "3D models and licensing",
    creditsTitle: "Credits and attributions",
    creditsCloseButton: "Close credits",
    creditsIntro:
      "This is a personal study project with no commercial intent. All 3D models are credited as required by their respective licenses.",
    creditsAuthor: "Author",
    creditsSource: "Source",
    creditsLicense: "License",
    creditsFooterThanks:
      "Special thanks to the artists who share their work with the community.",
    creditsFooterRemoval:
      "Creators: if you identify any improper use of your assets, please reach out for immediate removal.",
    themeNames: {
      gray: "Gray",
      black: "Black",
      "light-gray": "Light Gray",
      blood: "Red",
    },
  },
};
