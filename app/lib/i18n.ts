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
  fitObjectButton: string;
  fitSceneButton: string;
  restoreTemplateView: string;
  languageLabel: string;
  themeLabel: string;
  preferencesLabel: string;
  darkMode: string;
  lightMode: string;
  portuguese: string;
  english: string;
  takePhotoButton: string;
  exportBackgroundLabel: string;
  exportWithBackground: string;
  exportTransparent: string;
  exportTemplateLabel: string;
  saveAsTemplate: string;
  templatesSectionTitle: string;
  templatesEmptyHint: string;
  templatesEmptyHintMotion: string;
  modeSwitchTitle: string;
  modeSwitchBodyStatic: string;
  modeSwitchBodyMotion: string;
  modeSwitchSave: string;
  modeSwitchDiscard: string;
  modeSwitchCancel: string;
  templateOpenTitle: string;
  templateOpenSave: string;
  templateOpenDiscard: string;
  saveTemplate: string;
  templateOptionsLabel: string;
  templateSavedMessage: string;
  templateAppliedMessage: string;
  templateSaveError: string;
  canvasTemplateLoadingLabel: string;
  deleteObject: string;
  duplicateObject: string;
  renameObject: string;
  layersSectionTitle: string;
  objectOptionsLabel: string;
  propertiesEyebrow: string;
  modelLabel: string;
  sceneSectionHint: string;
  keyboardToggleLabel: string;
  tabletBezelToggleLabel: string;
  screenSectionTitle: string;
  uploadImage: string;
  screenSourceImage: string;
  screenSourceVideo: string;
  uploadVideo: string;
  replaceVideo: string;
  screenVideoHint: string;
  uploadVideoError: string;
  screenVideoFrame: string;
  screenVideoStart: string;
  screenSectionHintPrefix: string;
  themesSectionTitle: string;
  bodyColorLabel: string;
  matteColorLabel: string;
  debugSectionTitle: string;
  transformSectionTitle: string;
  transformStaticTab: string;
  motionTimeline: string;
  motionTimelineEmpty: string;
  motionModeToggle: string;
  transformMotionTab: string;
  motionEmptyHint: string;
  motionAddKeyframe: string;
  motionKeyframeLabel: string;
  motionRemoveKeyframe: string;
  motionPlay: string;
  motionStop: string;
  motionEasing: string;
  motionEasingLabels: Record<string, string>;
  motionBezierTitle: string;
  motionBezierReset: string;
  motionBezierDone: string;
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
  hideUiButton: string;
  showUiButton: string;
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
  // Rótulos das partes de cor customizável (color picker do Inspector),
  // por chave de parte. As chaves são únicas entre modelos, então um mapa
  // plano por idioma cobre todos os dispositivos.
  colorPartLabels: Record<string, string>;
};

export const APP_COPY: Record<Locale, AppCopy> = {
  "pt-BR": {
    appTitle: "Mock Studio",
    appSubtitle: "Composição visual de mockups",
    addObject: "Adicionar objeto",
    baseObject: "Objeto base",
    hideObject: "Ocultar",
    showObject: "Mostrar",
    hiddenObjectLabel: "Oculto",
    fitObjectButton: "Enquadrar objeto",
    fitSceneButton: "Enquadrar cena",
    restoreTemplateView: "Restaurar enquadramento",
    languageLabel: "Idioma",
    themeLabel: "Interface",
    preferencesLabel: "Preferências",
    darkMode: "Escuro",
    lightMode: "Claro",
    portuguese: "PT-BR",
    english: "EN-US",
    takePhotoButton: "Exportar",
    exportBackgroundLabel: "Fundo",
    exportWithBackground: "Com fundo",
    exportTransparent: "Transparente",
    exportTemplateLabel: "Template",
    saveAsTemplate: "Salvar como template",
    templatesSectionTitle: "Templates",
    templatesEmptyHint: "Salve a cena atual para reutilizar depois.",
    templatesEmptyHintMotion: "Salve a animação atual para reutilizar depois.",
    modeSwitchTitle: "Sair sem salvar template?",
    modeSwitchBodyStatic: "A cena do modo Estático tem alterações que não estão salvas em nenhum template.",
    modeSwitchBodyMotion: "A animação tem alterações que não estão salvas em nenhum template.",
    modeSwitchSave: "Salvar template e sair",
    modeSwitchDiscard: "Sair sem salvar",
    modeSwitchCancel: "Cancelar",
    templateOpenTitle: "Abrir template sem salvar o trabalho atual?",
    templateOpenSave: "Salvar e abrir",
    templateOpenDiscard: "Abrir sem salvar",
    saveTemplate: "Salvar template",
    templateOptionsLabel: "Opções do template",
    templateSavedMessage: "Template salvo.",
    templateAppliedMessage: "Template aplicado.",
    templateSaveError: "Não foi possível salvar o template.",
    canvasTemplateLoadingLabel: "Aplicando template",
    deleteObject: "Excluir",
    duplicateObject: "Duplicar",
    renameObject: "Renomear",
    layersSectionTitle: "Objetos",
    objectOptionsLabel: "Opções do objeto",
    propertiesEyebrow: "Propriedades",
    modelLabel: "Dispositivo",
    sceneSectionHint: "Corpo do dispositivo",
    keyboardToggleLabel: "Teclado",
    tabletBezelToggleLabel: "Moldura da tela",
    screenSectionTitle: "Tela",
    uploadImage: "Substituir imagem",
    screenSourceImage: "Imagem",
    screenSourceVideo: "Vídeo",
    uploadVideo: "Enviar vídeo",
    replaceVideo: "Substituir vídeo",
    screenVideoHint: "MP4, MOV ou WebM. Uma gravação de tela do celular já vem no formato certo.",
    screenVideoFrame: "Quadro (s)",
    screenVideoStart: "Início na cena (s)",
    uploadVideoError: "Este navegador não consegue reproduzir esse vídeo. Gravações de iPhone costumam usar HEVC: tente o Safari ou exporte em H.264.",
    screenSectionHintPrefix: "Tamanho ideal:",
    themesSectionTitle: "Aparência",
    bodyColorLabel: "Cores personalizadas",
    matteColorLabel: "Acabamento fosco",
    debugSectionTitle: "Debug",
    transformSectionTitle: "Transformação",
    transformStaticTab: "Estático",
    motionTimeline: "Linha do tempo",
    motionTimelineEmpty: "Nenhum objeto visível na cena.",
    motionModeToggle: "Modo movimento",
    transformMotionTab: "Movimento",
    motionEmptyHint: "Selecione um keyframe na linha do tempo para editar a pose dele, ou crie um no instante do playhead com o ◆+ da trilha.",
    motionAddKeyframe: "Adicionar keyframe",
    motionKeyframeLabel: "Keyframe",
    motionRemoveKeyframe: "Remover keyframe",
    motionPlay: "Reproduzir",
    motionStop: "Parar",
    motionEasing: "Transição",
    motionBezierTitle: "Curva da transição",
    motionBezierReset: "Restaurar padrão",
    motionBezierDone: "Pronto",
    motionEasingLabels: {
      linear: "Linear",
      "ease-in": "Ease in",
      "ease-out": "Ease out",
      "ease-in-out": "Ease in-out",
      "cubic-bezier": "Cubic bezier",
    },
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
    hideUiButton: "Ocultar interface",
    showUiButton: "Mostrar interface",
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
    colorPartLabels: {
      // Smartphone / Smartphone 2
      body: "Corpo",
      sideCuts: "Recortes laterais",
      topCutout: "Recorte superior",
      frame: "Frame",
      rearInset: "Area traseira",
      cameraMicroPart: "Detalhe da camera",
      cameraBlock: "Bloco da camera",
      cameraBlockInner: "Miolo da camera",
      cameraLensHighlight: "Brilho da lente",
      cameraSideDetail: "Detalhe lateral",
      // Smartphone 3 (generico)
      gradientSound: "Alto-falante",
      smartphoneBody: "Corpo",
      rightBigSideButton: "Botao lateral direito",
      leftSmallSideButton: "Botao lateral esquerdo",
      CircleTopLeft: "Anel camera sup. esquerdo",
      CircleTopLeftMiddle: "Anel camera centro esquerdo",
      CircleTopRight: "Anel camera sup. direito",
      CircleTopRightMiddle: "Anel camera centro direito",
      // Smartwatch
      twoSideButtons: "Botoes laterais duplos",
      oneSideButton: "Botao lateral",
      bandClasp: "Fecho da pulseira",
      crownDetail: "Detalhe da coroa",
      bandTop: "Pulseira superior",
      bandBottom: "Pulseira inferior",
      bandDetails: "Detalhes da pulseira",
      bandDetails2: "Detalhes extras",
      bodyBackground: "Fundo interno",
      // Notebook
      keyboardBaseOuter: "Base do teclado",
      keyboardDeck: "Mesa do teclado",
      bodyBottom: "Base inferior",
      screenBackCover: "Tampa traseira",
      touchpad: "Touchpad",
      touchpadBorder: "Borda do touchpad",
      powerButtonInner: "Botao power",
      speakerGrilles: "Saidas de som",
      keyboardKeys: "Teclas",
      keyboardBacklight: "Backlight do teclado",
      laptopOpenNotch: "Recorte de abertura",
      screenBezel: "Moldura da tela",
      screenRubberSeal: "Borracha da tela",
      lowerHingeBar: "Barra da dobradica",
      hingeRubberSeal: "Borracha da dobradica",
      // Tablet
      bezel: "Moldura da tela",
    },
  },
  "en-US": {
    appTitle: "Mock Studio",
    appSubtitle: "Visual mockup composition",
    addObject: "Add object",
    baseObject: "Base object",
    hideObject: "Hide",
    showObject: "Show",
    hiddenObjectLabel: "Hidden",
    fitObjectButton: "Frame object",
    fitSceneButton: "Fit scene",
    restoreTemplateView: "Restore framing",
    languageLabel: "Language",
    themeLabel: "Interface",
    preferencesLabel: "Preferences",
    darkMode: "Dark",
    lightMode: "Light",
    portuguese: "PT-BR",
    english: "EN-US",
    takePhotoButton: "Export",
    exportBackgroundLabel: "Background",
    exportWithBackground: "With background",
    exportTransparent: "Transparent",
    exportTemplateLabel: "Template",
    saveAsTemplate: "Save as template",
    templatesSectionTitle: "Templates",
    templatesEmptyHint: "Save the current scene to reuse it later.",
    templatesEmptyHintMotion: "Save the current animation to reuse it later.",
    modeSwitchTitle: "Leave without saving a template?",
    modeSwitchBodyStatic: "The Static scene has changes that are not saved in any template.",
    modeSwitchBodyMotion: "The animation has changes that are not saved in any template.",
    modeSwitchSave: "Save template and leave",
    modeSwitchDiscard: "Leave without saving",
    modeSwitchCancel: "Cancel",
    templateOpenTitle: "Open the template without saving your current work?",
    templateOpenSave: "Save and open",
    templateOpenDiscard: "Open without saving",
    saveTemplate: "Save template",
    templateOptionsLabel: "Template options",
    templateSavedMessage: "Template saved.",
    templateAppliedMessage: "Template applied.",
    templateSaveError: "Could not save the template.",
    canvasTemplateLoadingLabel: "Applying template",
    deleteObject: "Delete",
    duplicateObject: "Duplicate",
    renameObject: "Rename",
    layersSectionTitle: "Objects",
    objectOptionsLabel: "Object options",
    propertiesEyebrow: "Properties",
    modelLabel: "Device",
    sceneSectionHint: "Device body",
    keyboardToggleLabel: "Keyboard",
    tabletBezelToggleLabel: "Screen bezel",
    screenSectionTitle: "Screen",
    uploadImage: "Replace image",
    screenSourceImage: "Image",
    screenSourceVideo: "Video",
    uploadVideo: "Upload video",
    replaceVideo: "Replace video",
    screenVideoHint: "MP4, MOV or WebM. A phone screen recording already has the right shape.",
    screenVideoFrame: "Frame (s)",
    screenVideoStart: "Scene start (s)",
    uploadVideoError: "This browser can't play that video. iPhone recordings often use HEVC: try Safari or export as H.264.",
    screenSectionHintPrefix: "Ideal size:",
    themesSectionTitle: "Appearance",
    bodyColorLabel: "Custom colors",
    matteColorLabel: "Matte finish",
    debugSectionTitle: "Debug",
    transformSectionTitle: "Transform",
    transformStaticTab: "Static",
    motionTimeline: "Timeline",
    motionTimelineEmpty: "No visible objects in the scene.",
    motionModeToggle: "Motion mode",
    transformMotionTab: "Motion",
    motionEmptyHint: "Select a keyframe in the timeline to edit its pose, or create one at the playhead with the track's ◆+ button.",
    motionAddKeyframe: "Add keyframe",
    motionKeyframeLabel: "Keyframe",
    motionRemoveKeyframe: "Remove keyframe",
    motionPlay: "Play",
    motionStop: "Stop",
    motionEasing: "Transition",
    motionBezierTitle: "Transition curve",
    motionBezierReset: "Reset to default",
    motionBezierDone: "Done",
    motionEasingLabels: {
      linear: "Linear",
      "ease-in": "Ease in",
      "ease-out": "Ease out",
      "ease-in-out": "Ease in-out",
      "cubic-bezier": "Cubic bezier",
    },
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
    hideUiButton: "Hide UI",
    showUiButton: "Show UI",
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
    colorPartLabels: {
      // Smartphone / Smartphone 2
      body: "Body",
      sideCuts: "Side cuts",
      topCutout: "Top cutout",
      frame: "Frame",
      rearInset: "Rear inset",
      cameraMicroPart: "Camera detail",
      cameraBlock: "Camera block",
      cameraBlockInner: "Camera core",
      cameraLensHighlight: "Lens highlight",
      cameraSideDetail: "Side detail",
      // Smartphone 3 (generic)
      gradientSound: "Speaker",
      smartphoneBody: "Body",
      rightBigSideButton: "Right side button",
      leftSmallSideButton: "Left side button",
      CircleTopLeft: "Top-left camera ring",
      CircleTopLeftMiddle: "Center-left camera ring",
      CircleTopRight: "Top-right camera ring",
      CircleTopRightMiddle: "Center-right camera ring",
      // Smartwatch
      twoSideButtons: "Dual side buttons",
      oneSideButton: "Side button",
      bandClasp: "Band clasp",
      crownDetail: "Crown detail",
      bandTop: "Top band",
      bandBottom: "Bottom band",
      bandDetails: "Band details",
      bandDetails2: "Extra details",
      bodyBackground: "Inner background",
      // Notebook
      keyboardBaseOuter: "Keyboard base",
      keyboardDeck: "Keyboard deck",
      bodyBottom: "Bottom base",
      screenBackCover: "Back cover",
      touchpad: "Touchpad",
      touchpadBorder: "Touchpad border",
      powerButtonInner: "Power button",
      speakerGrilles: "Speaker grilles",
      keyboardKeys: "Keys",
      keyboardBacklight: "Keyboard backlight",
      laptopOpenNotch: "Opening notch",
      screenBezel: "Screen bezel",
      screenRubberSeal: "Screen rubber seal",
      lowerHingeBar: "Hinge bar",
      hingeRubberSeal: "Hinge rubber seal",
      // Tablet
      bezel: "Screen bezel",
    },
  },
};
