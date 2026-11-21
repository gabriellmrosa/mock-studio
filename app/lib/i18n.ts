import { STICKER_LABELS_PT_BR } from "./sticker-labels";
import {
  STICKER_CATEGORY_NAMES_EN_US,
  STICKER_CATEGORY_NAMES_PT_BR,
} from "./stickers";

export type Locale = "pt-BR" | "en-US";
export type UiTheme = "dark" | "light";

export type AppCopy = {
  appTitle: string;
  appSubtitle: string;
  addObject: string;
  addDeviceObject: string;
  addTextObject: string;
  textObjectName: string;
  addImageObject: string;
  imageObjectName: string;
  imageSectionTitle: string;
  imageObjectHint: string;
  addMusicObject: string;
  musicObjectName: string;
  musicSectionTitle: string;
  musicOptions: string;
  uploadMusic: string;
  screenUploadMusic: string;
  musicFileHint: string;
  musicVolumeLabel: string;
  musicFadeInLabel: string;
  musicFadeOutLabel: string;
  uploadMusicError: string;
  muteObject: string;
  unmuteObject: string;
  motionMusicTrimStart: string;
  motionMusicTrimEnd: string;
  imageEmptyLabel: string;
  addStickerObject: string;
  stickerObjectName: string;
  stickerSectionTitle: string;
  stickerChange: string;
  stickerOutlineLabel: string;
  imageShadowLabel: string;
  imageSpeedLabel: string;
  stickerPickerTitle: string;
  stickerSearchLabel: string;
  stickerCategoryLabel: string;
  stickerCount: string;
  stickerCategoryNames: Record<string, string>;
  stickerNone: string;
  stickerLabels: Record<string, string> | null;
  textDefaultContent: string;
  textSectionTitle: string;
  textContentLabel: string;
  textFontLabel: string;
  textWeightLabel: string;
  textSizeLabel: string;
  textColorLabel: string;
  textAlignLabel: string;
  textAlignLeft: string;
  textAlignCenter: string;
  textAlignRight: string;
  textLineHeightLabel: string;
  textLetterSpacingLabel: string;
  textWidthAuto: string;
  textMaxWidthLabel: string;
  textUnsupportedHint: string;
  baseObject: string;
  hideObject: string;
  showObject: string;
  hiddenObjectLabel: string;
  fitObjectButton: string;
  fitSceneButton: string;
  restoreTemplateView: string;
  languageLabel: string;
  patchNotesTitle: string;
  patchNotesEyebrow: string;
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
  saveAsTemplate: string;
  shareTemplate: string;
  shareTemplateIntro: string;
  shareTemplateNote: string;
  shareTemplateNext: string;
  shareTemplateCodeLabel: string;
  shareTemplateCopy: string;
  templateCodeCopied: string;
  templateCodeCopyError: string;
  templateCodeCreateError: string;
  importTemplateInvalid: string;
  importTemplate: string;
  templateOverwriteTitle: string;
  templateOverwriteDescription: string;
  templateOverwrite: string;
  templateSaveAsNew: string;
  templateOverwrittenMessage: string;
  importTemplateIntro: string;
  importTemplateNote: string;
  importTemplateFieldLabel: string;
  importTemplatePlaceholder: string;
  importTemplateSubmit: string;
  templateImported: string;
  templateImportedIn: string;
  exportFormatLabel: string;
  exportSizeLabel: string;
  dialogCancel: string;
  templatesSectionTitle: string;
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
  /** Só no Duo, o único em que o acabamento muda o que se vê. */
  matteFinishToggleLabel: string;
  screenSectionTitle: string;
  uploadImage: string;
  screenUploadImage: string;
  removeImage: string;
  removeVideo: string;
  imageOptions: string;
  videoOptions: string;
  closeLabel: string;
  screenSourceImage: string;
  screenSourceVideo: string;
  uploadVideo: string;
  replaceVideo: string;
  screenVideoHint: string;
  /** Linha da tela ainda sem arquivo: convida a adicionar um. */
  screenAddImage: string;
  screenAddVideo: string;
  screenReupload: string;
  screenMissingTitle: string;
  screenMissingHint: string;
  screenMissingHintVideo: string;
  /** Nome da cor do aparelho quando alguma parte foi editada à mão. */
  themeCustomName: string;
  uploadVideoError: string;
  screenTabsLabel: string;
  screenTabFit: string;
  screenTabCrop: string;
  screenCropReset: string;
  screenFitZoom: string;
  screenFitX: string;
  screenFitY: string;
  screenFitReset: string;
  screenFitBackground: string;
  screenCropTop: string;
  screenCropBottom: string;
  screenCropLeft: string;
  screenCropRight: string;
  screenSectionHintPrefix: string;
  themesSectionTitle: string;
  appearanceTabsLabel: string;
  appearanceTabCustom: string;
  debugSectionTitle: string;
  transformSectionTitle: string;
  canvasModePhoto: string;
  canvasModeVideo: string;
  canvasModeLabel: string;
  motionTimeline: string;
  motionZoomLabel: string;
  motionZoomIn: string;
  motionZoomOut: string;
  motionVideoTrimStart: string;
  motionVideoTrimEnd: string;
  motionVideoHold: string;
  screenFitKeyframeNote: string;
  screenCropKeyframeNote: string;
  timelineResizeLabel: string;
  timelineResizeHint: string;
  motionFrameLabel: string;
  motionFrameWidth: string;
  motionFrameHeight: string;
  motionFrameKeepRatio: string;
  motionFrameRatio: string;
  exportTabImage: string;
  exportTabVideo: string;
  videoExportUnavailable: string;
  videoExportFps: string;
  videoExportResolution: string;
  videoExportCancel: string;
  /** `{done}` e `{total}` são trocados pelos números. */
  videoExportProgress: string;
  videoExportProgressTitle: string;
  videoExportEstimating: string;
  /** `{time}` é trocado pelo tempo, já com a unidade. */
  videoExportRemaining: string;
  videoExportFinishing: string;
  videoExportHint: string;
  videoExportUnsupported: string;
  videoExportSafariTransparent: string;
  videoExportNoAudio: string;
  projectLinkCopy: string;
  projectLinkCopied: string;
  projectLinkCopyError: string;
  projectLinkTemplateName: string;
  projectLinkOpened: string;
  projectLinkInvalid: string;
  analyticsConsentTitle: string;
  analyticsConsentText: string;
  analyticsConsentAccept: string;
  analyticsConsentDecline: string;
  videoExportSuccess: string;
  videoExportError: string;
  motionTimelineEmpty: string;
  motionModeToggle: string;
  motionEmptyHint: string;
  motionAddKeyframe: string;
  motionKeyframeLabel: string;
  motionRemoveKeyframe: string;
  motionCopyPreviousKeyframe: string;
  motionCopyNextKeyframe: string;
  motionPlay: string;
  motionStop: string;
  motionEasing: string;
  motionEasingLabels: Record<string, string>;
  motionBezierTitle: string;
  motionBezierReset: string;
  motionBezierDone: string;
  resetObjectButton: string;
  resetCameraButton: string;
  alignmentLabel: string;
  alignmentHorizontal: string;
  alignmentVertical: string;
  alignLeft: string;
  alignCenter: string;
  alignRight: string;
  alignTop: string;
  alignMiddle: string;
  alignBottom: string;
  positionX: string;
  positionY: string;
  positionZ: string;
  rotationX: string;
  rotationY: string;
  rotationZ: string;
  scale: string;
  opacity: string;
  /** Abertura do dobrável, em graus. */
  foldAngle: string;
  /** As duas telas do dobrável, no Inspector. */
  innerScreenLabel: string;
  outerScreenLabel: string;
  moveUpButton: string;
  moveDownButton: string;
  moveLeftButton: string;
  moveRightButton: string;
  zoomInButton: string;
  zoomOutButton: string;
  backgroundColorButton: string;
  cameraObjectName: string;
  backgroundObjectName: string;
  cameraSectionTitle: string;
  cameraAzimuthLabel: string;
  cameraElevationLabel: string;
  cameraDistanceLabel: string;
  cameraTargetXLabel: string;
  cameraTargetYLabel: string;
  cameraTargetZLabel: string;
  cameraFovLabel: string;
  canvasBackgroundSection: string;
  canvasBackgroundStyleLabel: string;
  canvasBackgroundFloor: string;
  canvasBackgroundFlat: string;
  canvasGradientLabel: string;
  canvasGradientColorLabel: string;
  canvasGradientAngleLabel: string;
  canvasGridSection: string;
  canvasGridColorLabel: string;
  canvasGridOpacityLabel: string;
  canvasGridResetLabel: string;
  canvasColorLabel: string;
  hideUiButton: string;
  showUiButton: string;
  debugOn: string;
  debugOff: string;
  canvasInitialLoadingLabel: string;
  canvasObjectLoadingLabel: string;
  canvasExportLoadingLabel: string;
  canvasWebglLostTitle: string;
  canvasWebglLostBody: string;
  canvasReloadViewer: string;
  canvasErrorTitle: string;
  canvasErrorBody: string;
  canvasRetryViewer: string;
  canvasReloadPage: string;
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
    addDeviceObject: "Aparelho",
    addTextObject: "Texto",
    textObjectName: "Texto",
    addImageObject: "Imagem",
    imageObjectName: "Imagem",
    imageSectionTitle: "Imagem",
    imageObjectHint: "GIF, PNG ou SVG",
    addMusicObject: "Música",
    musicObjectName: "Música",
    musicSectionTitle: "Música",
    musicOptions: "Opções da música",
    uploadMusic: "Substituir música",
    screenUploadMusic: "Enviar música",
    musicFileHint: "MP3, M4A, AAC ou WAV",
    musicVolumeLabel: "Volume",
    musicFadeInLabel: "Fade-in",
    musicFadeOutLabel: "Fade-out",
    uploadMusicError: "Não foi possível ler esse áudio. Use MP3, M4A, AAC ou WAV de até 100 MB.",
    muteObject: "Silenciar",
    unmuteObject: "Ativar som",
    motionMusicTrimStart: "Arraste para cortar o começo da música",
    motionMusicTrimEnd: "Arraste para cortar o fim da música",
    imageEmptyLabel: "Envie seu GIF, PNG ou SVG",
    addStickerObject: "Sticker",
    stickerObjectName: "Sticker",
    stickerSectionTitle: "Sticker",
    stickerChange: "Trocar sticker",
    stickerOutlineLabel: "Contorno",
    imageShadowLabel: "Sombra",
    imageSpeedLabel: "Velocidade",
    stickerPickerTitle: "Escolher sticker",
    stickerSearchLabel: "Buscar sticker",
    stickerCategoryLabel: "Categoria",
    stickerCount: "stickers",
    stickerCategoryNames: STICKER_CATEGORY_NAMES_PT_BR,
    stickerNone: "Nenhum sticker encontrado.",
    stickerLabels: STICKER_LABELS_PT_BR,
    textDefaultContent: "Seu texto",
    textSectionTitle: "Texto",
    textContentLabel: "Conteúdo",
    textFontLabel: "Fonte",
    textWeightLabel: "Peso",
    textSizeLabel: "Tamanho",
    textColorLabel: "Cor",
    textAlignLabel: "Alinhar",
    textAlignLeft: "Esquerda",
    textAlignCenter: "Centro",
    textAlignRight: "Direita",
    textLineHeightLabel: "Entrelinha",
    textLetterSpacingLabel: "Espaço entre letras",
    textWidthAuto: "Auto",
    textMaxWidthLabel: "Largura",
    textUnsupportedHint: "Letras fora do alfabeto latino aparecem como ?",
    baseObject: "Objeto base",
    hideObject: "Ocultar",
    showObject: "Mostrar",
    hiddenObjectLabel: "Oculto",
    fitObjectButton: "Enquadrar objeto",
    fitSceneButton: "Enquadrar cena",
    restoreTemplateView: "Restaurar enquadramento",
    languageLabel: "Idioma",
    patchNotesTitle: "Novidades",
    patchNotesEyebrow: "Histórico de versões",
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
    saveAsTemplate: "Salvar como template",
    shareTemplate: "Compartilhar template",
    shareTemplateIntro:
      "Copie o código deste template e envie para quem quiser. Ele leva a composição, o fundo, a câmera e os keyframes.",
    shareTemplateNote:
      "As imagens e os vídeos das telas não vão no código: quem receber precisa enviá-los de novo.",
    shareTemplateNext:
      "Para usar, a pessoa abre o Mock Studio, clica em “Importar template” e cola o código.",
    shareTemplateCodeLabel: "Código do template",
    shareTemplateCopy: "Copiar código",
    templateCodeCopied: "Código copiado",
    templateCodeCopyError: "Não foi possível copiar o código.",
    templateCodeCreateError: "Não foi possível gerar o código.",
    importTemplateInvalid: "Este código está incompleto ou corrompido.",
    importTemplate: "Importar template",
    templateOverwriteTitle: "Salvar template",
    templateOverwriteDescription:
      "Esta cena veio do template “{name}”. Você pode atualizar esse template com as mudanças ou salvar como um template novo.",
    templateOverwrite: "Sobrepor “{name}”",
    templateSaveAsNew: "Salvar como novo",
    templateOverwrittenMessage: "Template “{name}” atualizado.",
    importTemplateIntro:
      "Cole o código de um template que alguém compartilhou com você. Ele entra na sua lista de templates, sem mexer na cena que está aberta, e você aplica quando quiser.",
    importTemplateNote:
      "O código leva a composição, o fundo, a câmera e os keyframes. As imagens e os vídeos das telas não vão nele: depois de aplicar, envie-os de novo.",
    importTemplateFieldLabel: "Código do template",
    importTemplatePlaceholder: "Cole o código aqui",
    importTemplateSubmit: "Importar",
    templateImported: "Template importado.",
    templateImportedIn: "Template importado na lista de",
    exportFormatLabel: "Formato",
    exportSizeLabel: "Tamanho",
    dialogCancel: "Cancelar",
    templatesSectionTitle: "Templates",
    modeSwitchTitle: "Sair sem salvar template?",
    modeSwitchBodyStatic: "A cena do modo Foto tem alterações que não estão salvas em nenhum template.",
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
    matteFinishToggleLabel: "Acabamento fosco",
    screenSectionTitle: "Tela",
    uploadImage: "Substituir imagem",
    screenUploadImage: "Enviar imagem",
    removeImage: "Remover imagem",
    removeVideo: "Remover vídeo",
    imageOptions: "Opções da imagem",
    videoOptions: "Opções do vídeo",
    closeLabel: "Fechar",
    screenSourceImage: "Imagem",
    screenSourceVideo: "Vídeo",
    uploadVideo: "Enviar vídeo",
    replaceVideo: "Substituir vídeo",
    screenVideoHint: "MP4, MOV ou WebM",
    screenAddImage: "Adicionar imagem",
    screenAddVideo: "Adicionar vídeo",
    screenReupload: "Reenviar “{name}”",
    screenMissingTitle: "Envie de novo “{name}”",
    screenMissingHint: "O enquadramento e o corte já estão salvos.",
    screenMissingHintVideo:
      "O enquadramento, o corte e o tempo do clipe já estão salvos.",
    themeCustomName: "Personalizada",
    screenTabsLabel: "Opções da tela",
    screenTabFit: "Ajuste",
    screenTabCrop: "Corte",
    screenCropReset: "Resetar corte",
    screenFitZoom: "Zoom (%)",
    screenFitX: "Posição X (%)",
    screenFitY: "Posição Y (%)",
    screenFitReset: "Resetar ajuste",
    screenFitBackground: "Fundo",
    screenCropTop: "Topo (%)",
    screenCropBottom: "Base (%)",
    screenCropLeft: "Esquerda (%)",
    screenCropRight: "Direita (%)",
    uploadVideoError: "Este navegador não consegue reproduzir esse vídeo. Gravações de iPhone costumam usar HEVC: tente o Safari ou exporte em H.264.",
    screenSectionHintPrefix: "Tamanho ideal:",
    themesSectionTitle: "Aparência",
    appearanceTabsLabel: "Opções de aparência",
    appearanceTabCustom: "Personalizar",
    debugSectionTitle: "Debug",
    transformSectionTitle: "Transformação",
    canvasModePhoto: "Foto",
    canvasModeVideo: "Vídeo",
    canvasModeLabel: "Modo da cena",
    motionTimeline: "Linha do tempo",
    motionZoomLabel: "Zoom da linha do tempo",
    motionZoomIn: "Aproximar (ou faça pinça no trackpad)",
    motionZoomOut: "Afastar (ou faça pinça no trackpad)",
    motionVideoTrimStart: "Arraste para cortar o começo do vídeo",
    motionVideoTrimEnd: "Arraste para cortar o fim do vídeo",
    motionVideoHold: "Congelado",
    screenFitKeyframeNote: "Zoom, posição e fundo valem para o keyframe de {time}.",
    screenCropKeyframeNote: "O corte vale para o arquivo inteiro; o fundo, para o keyframe de {time}.",
    timelineResizeLabel: "Altura da linha do tempo",
    timelineResizeHint: "Arraste para mudar a altura. Clique duplo volta ao padrão.",
    motionFrameLabel: "Tamanho do vídeo",
    motionFrameWidth: "Largura",
    motionFrameHeight: "Altura",
    motionFrameKeepRatio: "Manter proporção",
    motionFrameRatio: "Proporção",
    exportTabImage: "Imagem",
    exportTabVideo: "Vídeo",
    videoExportUnavailable: "Anime algo na timeline para exportar vídeo.",
    videoExportFps: "Quadros por segundo",
    videoExportResolution: "Resolução",
    videoExportCancel: "Cancelar",
    videoExportProgress: "Quadro {done} de {total}",
    videoExportProgressTitle: "Exportando vídeo",
    videoExportEstimating: "Calculando o tempo restante…",
    videoExportRemaining: "Cerca de {time} restantes",
    videoExportFinishing: "Finalizando o arquivo…",
    videoExportHint:
      "Pode usar outra aba enquanto isso. Ao terminar, o vídeo vai para a sua pasta de downloads.",
    videoExportUnsupported: "Este navegador não exporta esse formato. Use o Chrome ou o Edge.",
    videoExportNoAudio: "Este navegador não consegue pôr a música nesse formato: o vídeo vai sair sem som. No Chrome ou no Edge, sai com a música.",
    videoExportSafariTransparent:
      "O Safari ainda não mostra vídeos sem fundo. Para exportar com transparência, copie o link do projeto e abra no Chrome, Edge ou Firefox — as imagens e vídeos das telas não vão no link.",
    projectLinkCopy: "Copiar link do projeto",
    projectLinkCopied: "Link copiado",
    projectLinkCopyError: "Não foi possível copiar o link.",
    projectLinkTemplateName: "Projeto do link",
    projectLinkOpened:
      "Projeto aberto do link e salvo nos templates. Envie de novo as imagens e vídeos das telas.",
    projectLinkInvalid: "Este link de projeto está incompleto ou corrompido.",
    analyticsConsentTitle: "Ajude a melhorar o Mock Studio",
    analyticsConsentText:
      "Com sua permissão, usamos o Microsoft Clarity, com cookies, para ver como o editor é usado: cliques e rolagem, com os textos mascarados. Suas imagens, vídeos e cenas não são gravados.",
    analyticsConsentAccept: "Aceitar",
    analyticsConsentDecline: "Recusar",
    videoExportSuccess: "Vídeo exportado.",
    videoExportError: "Não foi possível exportar o vídeo.",
    motionTimelineEmpty: "Nenhum objeto visível na cena.",
    motionModeToggle: "Modo movimento",
    motionEmptyHint: "Selecione um keyframe na linha do tempo para editar a pose dele, ou crie um no instante do playhead com o ◆+ da trilha.",
    motionAddKeyframe: "Adicionar keyframe",
    motionKeyframeLabel: "Keyframe",
    motionRemoveKeyframe: "Remover keyframe",
    motionCopyPreviousKeyframe: "Copiar do keyframe anterior",
    motionCopyNextKeyframe: "Copiar do próximo keyframe",
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
    resetCameraButton: "Resetar câmera",
    alignmentLabel: "Alinhamento",
    alignmentHorizontal: "Alinhamento horizontal",
    alignmentVertical: "Alinhamento vertical",
    alignLeft: "Alinhar à esquerda",
    alignCenter: "Centralizar na horizontal",
    alignRight: "Alinhar à direita",
    alignTop: "Alinhar ao topo",
    alignMiddle: "Centralizar na vertical",
    alignBottom: "Alinhar à base",
    positionX: "Posição X",
    positionY: "Posição Y",
    positionZ: "Posição Z",
    rotationX: "Rotação X",
    rotationY: "Rotação Y",
    rotationZ: "Rotação Z",
    scale: "Escala",
    opacity: "Opacidade (%)",
    foldAngle: "Abertura (°)",
    innerScreenLabel: "Tela interna",
    outerScreenLabel: "Tela externa",
    moveUpButton: "Mover para cima",
    moveDownButton: "Mover para baixo",
    moveLeftButton: "Mover para a esquerda",
    moveRightButton: "Mover para a direita",
    zoomInButton: "Aproximar",
    zoomOutButton: "Afastar",
    backgroundColorButton: "Fundo e grade",
    cameraObjectName: "Câmera",
    backgroundObjectName: "Fundo",
    cameraSectionTitle: "Câmera",
    cameraAzimuthLabel: "Órbita horizontal (°)",
    cameraElevationLabel: "Órbita vertical (°)",
    cameraDistanceLabel: "Distância",
    cameraTargetXLabel: "Alvo X",
    cameraTargetYLabel: "Alvo Y",
    cameraTargetZLabel: "Alvo Z",
    cameraFovLabel: "Lente (campo de visão °)",
    canvasBackgroundSection: "Fundo",
    canvasBackgroundStyleLabel: "Estilo do fundo",
    canvasBackgroundFloor: "Chão 3D",
    canvasBackgroundFlat: "Liso",
    canvasGradientLabel: "Degradê",
    canvasGradientColorLabel: "Segunda cor do degradê",
    canvasGradientAngleLabel: "Ângulo do degradê",
    canvasGridSection: "Grade do chão",
    canvasGridColorLabel: "Cor da grade",
    canvasGridOpacityLabel: "Opacidade da grade",
    canvasGridResetLabel: "Voltar a grade ao automático",
    canvasColorLabel: "Cor",
    hideUiButton: "Ocultar interface",
    showUiButton: "Mostrar interface",
    debugOn: "Debug interativo: ON",
    debugOff: "Debug interativo: OFF",
    canvasInitialLoadingLabel: "Preparando cena",
    canvasObjectLoadingLabel: "Atualizando visualização",
    canvasExportLoadingLabel: "Tirando a foto",
    canvasWebglLostTitle: "O visualizador 3D foi interrompido",
    canvasWebglLostBody:
      "Isso costuma acontecer quando o computador suspende ou falta memória de vídeo. Sua cena continua aqui — recarregue o visualizador para voltar.",
    canvasReloadViewer: "Recarregar visualizador",
    canvasErrorTitle: "Algo deu errado na visualização 3D",
    canvasErrorBody:
      "Tente recarregar o visualizador. Se o problema continuar, recarregue a página.",
    canvasRetryViewer: "Tentar novamente",
    canvasReloadPage: "Recarregar página",
    photoExportSuccess:
      "Foto exportada com sucesso. Confira a pasta Downloads.",
    photoExportError: "Não foi possível exportar a foto. Tente novamente.",
    dismissSnackbar: "Fechar aviso",
    desktopOnlyTitle: "Disponível apenas em desktop",
    desktopOnlyBody:
      "Este app roda apenas em desktop ou notebook com janela de no mínimo {size}.",
    desktopOnlyHint: "Abra em uma tela maior ou aumente a janela do navegador.",
    uploadImageError: "Este navegador não consegue abrir essa imagem. Use PNG, JPEG ou WebP — fotos HEIC do iPhone abrem só no Safari; em outro navegador, converta antes.",
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
      "night-sky": "Night Sky",
      "star-white": "Star White",
      blue: "Azul",
      green: "Verde",
      pink: "Rosa",
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
      bezel: "Moldura",
      // Duo
      frameHighlight: "Filetes",
      grooves: "Sulcos",
      logo: "Logo",
      lens: "Lentes",
    },
  },
  "en-US": {
    appTitle: "Mock Studio",
    appSubtitle: "Visual mockup composition",
    addObject: "Add object",
    addDeviceObject: "Device",
    addTextObject: "Text",
    textObjectName: "Text",
    addImageObject: "Image",
    imageObjectName: "Image",
    imageSectionTitle: "Image",
    imageObjectHint: "GIF, PNG or SVG",
    addMusicObject: "Music",
    musicObjectName: "Music",
    musicSectionTitle: "Music",
    musicOptions: "Music options",
    uploadMusic: "Replace music",
    screenUploadMusic: "Upload music",
    musicFileHint: "MP3, M4A, AAC or WAV",
    musicVolumeLabel: "Volume",
    musicFadeInLabel: "Fade in",
    musicFadeOutLabel: "Fade out",
    uploadMusicError: "Couldn't read that audio. Use MP3, M4A, AAC or WAV up to 100 MB.",
    muteObject: "Mute",
    unmuteObject: "Unmute",
    motionMusicTrimStart: "Drag to trim the start of the music",
    motionMusicTrimEnd: "Drag to trim the end of the music",
    imageEmptyLabel: "Upload your GIF, PNG or SVG",
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
    stickerCategoryNames: STICKER_CATEGORY_NAMES_EN_US,
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
    baseObject: "Base object",
    hideObject: "Hide",
    showObject: "Show",
    hiddenObjectLabel: "Hidden",
    fitObjectButton: "Frame object",
    fitSceneButton: "Fit scene",
    restoreTemplateView: "Restore framing",
    languageLabel: "Language",
    patchNotesTitle: "What's new",
    patchNotesEyebrow: "Version history",
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
    saveAsTemplate: "Save as template",
    shareTemplate: "Share template",
    shareTemplateIntro:
      "Copy this template's code and send it to whoever you want. It carries the layout, the background, the camera and the keyframes.",
    shareTemplateNote:
      "Screen images and videos don't travel in the code: whoever receives it has to upload them again.",
    shareTemplateNext:
      "To use it, they open Mock Studio, click “Import template” and paste the code.",
    shareTemplateCodeLabel: "Template code",
    shareTemplateCopy: "Copy code",
    templateCodeCopied: "Code copied",
    templateCodeCopyError: "Couldn't copy the code.",
    templateCodeCreateError: "Couldn't create the code.",
    importTemplateInvalid: "This code is incomplete or corrupted.",
    importTemplate: "Import template",
    templateOverwriteTitle: "Save template",
    templateOverwriteDescription:
      "This scene came from the template “{name}”. You can update that template with the changes or save a new one.",
    templateOverwrite: "Overwrite “{name}”",
    templateSaveAsNew: "Save as new",
    templateOverwrittenMessage: "Template “{name}” updated.",
    importTemplateIntro:
      "Paste the code of a template someone shared with you. It joins your list of templates without touching the scene that is open, and you apply it whenever you want.",
    importTemplateNote:
      "The code carries the layout, the background, the camera and the keyframes. Screen images and videos don't travel in it: upload them again after applying.",
    importTemplateFieldLabel: "Template code",
    importTemplatePlaceholder: "Paste the code here",
    importTemplateSubmit: "Import",
    templateImported: "Template imported.",
    templateImportedIn: "Template imported into the list of",
    exportFormatLabel: "Format",
    exportSizeLabel: "Size",
    dialogCancel: "Cancel",
    templatesSectionTitle: "Templates",
    modeSwitchTitle: "Leave without saving a template?",
    modeSwitchBodyStatic: "The Photo scene has changes that are not saved in any template.",
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
    matteFinishToggleLabel: "Matte finish",
    screenSectionTitle: "Screen",
    uploadImage: "Replace image",
    screenUploadImage: "Upload image",
    removeImage: "Remove image",
    removeVideo: "Remove video",
    imageOptions: "Image options",
    videoOptions: "Video options",
    closeLabel: "Close",
    screenSourceImage: "Image",
    screenSourceVideo: "Video",
    uploadVideo: "Upload video",
    replaceVideo: "Replace video",
    screenVideoHint: "MP4, MOV or WebM",
    screenAddImage: "Add image",
    screenAddVideo: "Add video",
    screenReupload: "Upload “{name}” again",
    screenMissingTitle: "Upload “{name}” again",
    screenMissingHint: "The framing and the crop are already saved.",
    screenMissingHintVideo:
      "The framing, the crop and the clip timing are already saved.",
    themeCustomName: "Custom",
    screenTabsLabel: "Screen options",
    screenTabFit: "Fit",
    screenTabCrop: "Crop",
    screenCropReset: "Reset crop",
    screenFitZoom: "Zoom (%)",
    screenFitX: "Position X (%)",
    screenFitY: "Position Y (%)",
    screenFitReset: "Reset fit",
    screenFitBackground: "Background",
    screenCropTop: "Top (%)",
    screenCropBottom: "Bottom (%)",
    screenCropLeft: "Left (%)",
    screenCropRight: "Right (%)",
    uploadVideoError: "This browser can't play that video. iPhone recordings often use HEVC: try Safari or export as H.264.",
    screenSectionHintPrefix: "Ideal size:",
    themesSectionTitle: "Appearance",
    appearanceTabsLabel: "Appearance options",
    appearanceTabCustom: "Custom",
    debugSectionTitle: "Debug",
    transformSectionTitle: "Transform",
    canvasModePhoto: "Photo",
    canvasModeVideo: "Video",
    canvasModeLabel: "Scene mode",
    motionTimeline: "Timeline",
    motionZoomLabel: "Timeline zoom",
    motionZoomIn: "Zoom in (or pinch on the trackpad)",
    motionZoomOut: "Zoom out (or pinch on the trackpad)",
    motionVideoTrimStart: "Drag to trim the start of the video",
    motionVideoTrimEnd: "Drag to trim the end of the video",
    motionVideoHold: "Frozen",
    screenFitKeyframeNote: "Zoom, position and background apply to the {time} keyframe.",
    screenCropKeyframeNote: "The crop applies to the whole file; the background, to the {time} keyframe.",
    timelineResizeLabel: "Timeline height",
    timelineResizeHint: "Drag to change the height. Double-click resets it.",
    motionFrameLabel: "Video size",
    motionFrameWidth: "Width",
    motionFrameHeight: "Height",
    motionFrameKeepRatio: "Keep aspect ratio",
    motionFrameRatio: "Aspect ratio",
    exportTabImage: "Image",
    exportTabVideo: "Video",
    videoExportUnavailable: "Animate something on the timeline to export a video.",
    videoExportFps: "Frame rate",
    videoExportResolution: "Resolution",
    videoExportCancel: "Cancel",
    videoExportProgress: "Frame {done} of {total}",
    videoExportProgressTitle: "Exporting video",
    videoExportEstimating: "Estimating time left…",
    videoExportRemaining: "About {time} left",
    videoExportFinishing: "Finishing the file…",
    videoExportHint:
      "You can use another tab meanwhile. When it's done, the video goes to your downloads folder.",
    videoExportUnsupported: "This browser can't export this format. Use Chrome or Edge.",
    videoExportNoAudio: "This browser can't add the music in this format: the video will have no sound. In Chrome or Edge, it comes with the music.",
    videoExportSafariTransparent:
      "Safari doesn't show transparent videos yet. To export with transparency, copy the project link and open it in Chrome, Edge or Firefox — screen images and videos don't travel in the link.",
    projectLinkCopy: "Copy project link",
    projectLinkCopied: "Link copied",
    projectLinkCopyError: "Couldn't copy the link.",
    projectLinkTemplateName: "Project from link",
    projectLinkOpened:
      "Project opened from the link and saved to templates. Upload the screen images and videos again.",
    projectLinkInvalid: "This project link is incomplete or corrupted.",
    analyticsConsentTitle: "Help improve Mock Studio",
    analyticsConsentText:
      "With your permission, we use Microsoft Clarity, with cookies, to see how the editor is used: clicks and scrolling, with text masked. Your images, videos and scenes aren't recorded.",
    analyticsConsentAccept: "Accept",
    analyticsConsentDecline: "Decline",
    videoExportSuccess: "Video exported.",
    videoExportError: "Couldn't export the video.",
    motionTimelineEmpty: "No visible objects in the scene.",
    motionModeToggle: "Motion mode",
    motionEmptyHint: "Select a keyframe in the timeline to edit its pose, or create one at the playhead with the track's ◆+ button.",
    motionAddKeyframe: "Add keyframe",
    motionKeyframeLabel: "Keyframe",
    motionRemoveKeyframe: "Remove keyframe",
    motionCopyPreviousKeyframe: "Copy from previous keyframe",
    motionCopyNextKeyframe: "Copy from next keyframe",
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
    resetCameraButton: "Reset camera",
    alignmentLabel: "Alignment",
    alignmentHorizontal: "Horizontal alignment",
    alignmentVertical: "Vertical alignment",
    alignLeft: "Align left",
    alignCenter: "Center horizontally",
    alignRight: "Align right",
    alignTop: "Align top",
    alignMiddle: "Center vertically",
    alignBottom: "Align bottom",
    positionX: "Position X",
    positionY: "Position Y",
    positionZ: "Position Z",
    rotationX: "Rotation X",
    rotationY: "Rotation Y",
    rotationZ: "Rotation Z",
    scale: "Scale",
    opacity: "Opacity (%)",
    foldAngle: "Opening (°)",
    innerScreenLabel: "Inner screen",
    outerScreenLabel: "Outer screen",
    moveUpButton: "Move up",
    moveDownButton: "Move down",
    moveLeftButton: "Move left",
    moveRightButton: "Move right",
    zoomInButton: "Zoom in",
    zoomOutButton: "Zoom out",
    backgroundColorButton: "Background and grid",
    cameraObjectName: "Camera",
    backgroundObjectName: "Background",
    cameraSectionTitle: "Camera",
    cameraAzimuthLabel: "Horizontal orbit (°)",
    cameraElevationLabel: "Vertical orbit (°)",
    cameraDistanceLabel: "Distance",
    cameraTargetXLabel: "Target X",
    cameraTargetYLabel: "Target Y",
    cameraTargetZLabel: "Target Z",
    cameraFovLabel: "Lens (field of view °)",
    canvasBackgroundSection: "Background",
    canvasBackgroundStyleLabel: "Background style",
    canvasBackgroundFloor: "3D floor",
    canvasBackgroundFlat: "Flat",
    canvasGradientLabel: "Gradient",
    canvasGradientColorLabel: "Gradient second color",
    canvasGradientAngleLabel: "Gradient angle",
    canvasGridSection: "Floor grid",
    canvasGridColorLabel: "Grid color",
    canvasGridOpacityLabel: "Grid opacity",
    canvasGridResetLabel: "Back to automatic grid",
    canvasColorLabel: "Color",
    hideUiButton: "Hide UI",
    showUiButton: "Show UI",
    debugOn: "Interactive debug: ON",
    debugOff: "Interactive debug: OFF",
    canvasInitialLoadingLabel: "Preparing scene",
    canvasObjectLoadingLabel: "Refreshing preview",
    canvasExportLoadingLabel: "Taking photo",
    canvasWebglLostTitle: "The 3D viewer was interrupted",
    canvasWebglLostBody:
      "This usually happens when the computer sleeps or runs low on graphics memory. Your scene is still here — reload the viewer to continue.",
    canvasReloadViewer: "Reload viewer",
    canvasErrorTitle: "Something went wrong in the 3D view",
    canvasErrorBody:
      "Try reloading the viewer. If the problem persists, reload the page.",
    canvasRetryViewer: "Try again",
    canvasReloadPage: "Reload page",
    photoExportSuccess:
      "Photo exported successfully. Check your Downloads folder.",
    photoExportError: "Could not export the photo. Please try again.",
    dismissSnackbar: "Dismiss notice",
    desktopOnlyTitle: "Desktop only",
    desktopOnlyBody:
      "This app works only on desktop or laptop screens with a minimum viewport of {size}.",
    desktopOnlyHint: "Open it on a larger screen or make the browser window bigger.",
    uploadImageError: "This browser can't open that image. Use PNG, JPEG or WebP — iPhone HEIC photos only open in Safari; elsewhere, convert them first.",
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
      "night-sky": "Night Sky",
      "star-white": "Star White",
      blue: "Blue",
      green: "Green",
      pink: "Pink",
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
      bezel: "Bezel",
      // Duo
      frameHighlight: "Highlights",
      grooves: "Grooves",
      logo: "Logo",
      lens: "Lenses",
    },
  },
};
