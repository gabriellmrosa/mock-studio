/**
 * O desfoque e o escurecimento das telas do Duo ao abrir e fechar: o conteúdo
 * "congela" (vira vidro fosco) enquanto a dobradiça se move e volta nítido
 * quando o aparelho assenta. É função só do ângulo (`foldAngle`), como a pose:
 * o preview, o play e a exportação de vídeo dão o mesmo resultado, e nada vai
 * para o template.
 *
 * A Apple não publica o efeito. O ponto de partida foi a análise por quadros
 * de um vídeo de referência (empirical.health, "Why the iPhone Duo fold
 * animation works": ~48 px de desfoque na borda livre a 30°, queda cúbica em
 * direção à dobradiça, escuro que clareia ao abrir), mas os números finais
 * (`DUO_FOLD_FX`) foram afinados contra prints de um vídeo real do aparelho
 * abrindo, onde o desfoque cobre a metade inteira e a tela de fora desfoca e
 * apaga bem mais cedo do que na fonte.
 */
export type DuoFoldFxParams = {
  /** Desfoque (desvio do gaussiano), em px da imagem de origem, na borda livre, na abertura de referência. */
  blurPx: number;
  /** A abertura (graus) em que `blurPx` foi medido: dali para baixo ele não cresce. */
  referenceAngle: number;
  /** Quão rápido o desfoque some até a abertura plena (1 = reta, 2 = curva). */
  openingCurve: number;
  /** O quanto a distância à dobradiça pesa no desfoque da tela de dentro (1 = reto, <1 = chega perto da dobradiça). */
  falloffPower: number;
  /** O mesmo, na tela de fora (3 = cúbico, o da fonte). */
  outerFalloffPower: number;
  /** Escurecimento máximo da borda livre da metade que gira (0 a 1). */
  freeEdgeDarken: number;
  /** Escurecimento da metade de dentro que gira, por igual, na vista de referência. */
  panelDarken: number;
  /** Escurecimento da metade de dentro que fica parada (nos prints, ela não escurece). */
  baseDarken: number;
  /** Abertura em que a tela de fora já está no máximo do fosco. */
  outerPeakAngle: number;
  /** Abertura em que a tela de fora já está no máximo do escuro (a tela "apaga"). */
  outerBlackAngle: number;
  /** Abertura a partir da qual a tela de fora volta a ficar nítida e clara, até 180°. */
  outerHoldEnd: number;
  /** Quanto a tela de fora desfoca no pico, em relação a `blurPx` (0 a 2). */
  outerBlurShare: number;
  /** Quanto a tela de fora escurece no máximo (0 a 1). */
  outerDarken: number;
  /**
   * Quanto desse escuro vem como degradê a partir da borda livre (0 a 1): no
   * vídeo real o preto entra pela borda livre e só depois toma o lado da
   * dobradiça. 0 escurece a tela por igual.
   */
  outerEdgeShare: number;
};

/**
 * Os números afinados contra prints de um vídeo real do aparelho abrindo:
 *  - a tela de fora desfoca forte já aos ~15° (nítida junto à dobradiça),
 *    escurece até quase preta aos ~55° e some;
 *  - a de dentro entra bem fosca e escura a ~95° e vai clareando devagar: ainda
 *    há desfoque visível aos ~140°, e só perto dos ~170° ela assenta.
 */
export const DUO_FOLD_FX: Readonly<DuoFoldFxParams> = {
  blurPx: 80,
  referenceAngle: 95,
  openingCurve: 1,
  falloffPower: 0.5,
  outerFalloffPower: 1,
  freeEdgeDarken: 0.3,
  panelDarken: 0.2,
  baseDarken: 0,
  outerPeakAngle: 18,
  outerBlackAngle: 60,
  outerHoldEnd: 100,
  outerBlurShare: 0.75,
  outerDarken: 0.9,
  outerEdgeShare: 0.7,
};

export type DuoFoldFx = {
  /** Cada metade da tela de dentro: a que gira desfoca e escurece mais. */
  inner: {
    baseDarken: number;
    blurPx: number;
    falloffPower: number;
    freeEdgeDarken: number;
  };
  /** A de baixo (parada) só escurece, por igual. */
  base: { baseDarken: number };
  outer: {
    blurPx: number;
    darken: number;
    darkenEdge: number;
    falloffPower: number;
  };
};

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value));
}

/**
 * Quanto "em movimento" a dobra está para a tela de dentro: 1 na abertura de
 * referência (ou mais fechada), 0 aberta por completo.
 */
function getInnerMotion(foldAngle: number, params: Readonly<DuoFoldFxParams>) {
  const span = 180 - params.referenceAngle;
  const progress = clamp01((180 - foldAngle) / span);

  return Math.pow(progress, params.openingCurve);
}

/**
 * O efeito num ângulo, em unidades que o shader entende: desfoque em px da
 * origem na borda livre (o shader aplica a queda pela distância à
 * dobradiça) e escurecimentos de 0 a 1. `foldAngle` em graus, 180 aberto.
 */
export function getDuoFoldFx(
  foldAngle: number,
  params: Readonly<DuoFoldFxParams> = DUO_FOLD_FX,
): DuoFoldFx {
  const angle = Math.min(180, Math.max(0, foldAngle));
  const motion = getInnerMotion(angle, params);

  // A tela de fora: nítida fechada, fosca logo ao abrir, escura (apagada) por
  // volta dos 60° e, aberta, nítida e clara de novo — de costas ela segue
  // legível, e as exportações de antes não mudam.
  const outerFall = clamp01((180 - angle) / (180 - params.outerHoldEnd));
  const outerBlur = Math.min(clamp01(angle / params.outerPeakAngle), outerFall);
  const outerBlack = Math.min(clamp01(angle / params.outerBlackAngle), outerFall);

  return {
    inner: {
      falloffPower: params.falloffPower,
      baseDarken: params.panelDarken * motion,
      blurPx: params.blurPx * motion,
      freeEdgeDarken: params.freeEdgeDarken * motion,
    },
    base: { baseDarken: params.baseDarken * motion },
    outer: {
      blurPx: params.blurPx * params.outerBlurShare * outerBlur,
      darken: params.outerDarken * outerBlack * (1 - params.outerEdgeShare),
      darkenEdge: params.outerDarken * outerBlack * params.outerEdgeShare,
      falloffPower: params.outerFalloffPower,
    },
  };
}
