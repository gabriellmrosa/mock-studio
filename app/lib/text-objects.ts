import { cloneKeyframes } from "./scene-motion";
import type { TextObject } from "./scene-objects";
import {
  DEFAULT_TEXT_FONT_ID,
  TEXT_WEIGHTS,
  isTextFontId,
  type TextFontId,
  type TextWeight,
} from "./text-fonts";

/**
 * O texto da cena: um objeto como os aparelhos (mesma pose, opacidade e
 * keyframes), mas sem modelo 3D — o que ele diz e como se vê ficam em
 * `SceneText`. Diferente das imagens e vídeos, é leve (bytes), então entra em
 * templates e links de projeto.
 *
 * Os tamanhos estão em unidades da cena, as mesmas dos aparelhos. Os limites
 * abaixo protegem o app (um texto de 500 mil letras travaria o worker do
 * troika). O padrão (64) é cerca de 15% da altura de um celular na cena.
 */

export type TextAlign = "left" | "center" | "right";

export const TEXT_ALIGNS: readonly TextAlign[] = ["left", "center", "right"];

export type SceneText = {
  align: TextAlign;
  /** Cor do preenchimento, `#rrggbb`. */
  color: string;
  content: string;
  fontId: TextFontId;
  /** Em unidades da cena. */
  fontSize: number;
  /** Em frações do tamanho da fonte (em), como no CSS. */
  letterSpacing: number;
  /** Múltiplo do tamanho da fonte. */
  lineHeight: number;
  /**
   * Largura máxima, em unidades da cena, a partir da qual o texto quebra a
   * linha. `null`: a caixa cresce com o texto, sem quebrar (modo "Fit" dos
   * editores de design).
   */
  maxWidth: number | null;
  weight: TextWeight;
};

export const MAX_TEXT_LENGTH = 500;
export const MIN_TEXT_FONT_SIZE = 8;
export const MAX_TEXT_FONT_SIZE = 600;
export const MIN_TEXT_LINE_HEIGHT = 0.8;
export const MAX_TEXT_LINE_HEIGHT = 3;
export const MIN_TEXT_LETTER_SPACING = -0.1;
export const MAX_TEXT_LETTER_SPACING = 0.5;
export const MIN_TEXT_MAX_WIDTH = 20;
export const MAX_TEXT_MAX_WIDTH = 4000;

export const DEFAULT_TEXT: SceneText = {
  align: "left",
  color: "#ffffff",
  content: "",
  fontId: DEFAULT_TEXT_FONT_ID,
  fontSize: 64,
  letterSpacing: 0,
  // 1.2 é o padrão dos editores para títulos; para corpo de texto, 1.4 a 1.6.
  lineHeight: 1.2,
  maxWidth: null,
  weight: "regular",
};

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;
const SHORT_HEX_COLOR = /^#([0-9a-fA-F])([0-9a-fA-F])([0-9a-fA-F])$/;

/** `#rgb` vira `#rrggbb` (é o que o campo de cor aceita), em minúsculas; senão `null`. */
function normalizeHexColor(value: unknown): string | null {
  if (typeof value !== "string") return null;

  if (HEX_COLOR.test(value)) return value.toLowerCase();

  const short = SHORT_HEX_COLOR.exec(value);

  return short
    ? `#${short[1]}${short[1]}${short[2]}${short[2]}${short[3]}${short[3]}`.toLowerCase()
    : null;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function finite(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

/**
 * O texto dentro dos limites, completando o que falta com os padrões. Vale
 * para tudo que vem de fora — template salvo, link de projeto, campo digitado
 * —, que pode estar corrompido ou ser de uma versão que não tinha o campo.
 */
export function normalizeSceneText(value: Partial<SceneText> | undefined): SceneText {
  const input = value ?? {};

  return {
    align: TEXT_ALIGNS.includes(input.align as TextAlign)
      ? (input.align as TextAlign)
      : DEFAULT_TEXT.align,
    color: normalizeHexColor(input.color) ?? DEFAULT_TEXT.color,
    content:
      typeof input.content === "string"
        ? input.content.slice(0, MAX_TEXT_LENGTH)
        : DEFAULT_TEXT.content,
    fontId: isTextFontId(input.fontId) ? input.fontId : DEFAULT_TEXT.fontId,
    fontSize: clamp(
      finite(input.fontSize, DEFAULT_TEXT.fontSize),
      MIN_TEXT_FONT_SIZE,
      MAX_TEXT_FONT_SIZE,
    ),
    letterSpacing: clamp(
      finite(input.letterSpacing, DEFAULT_TEXT.letterSpacing),
      MIN_TEXT_LETTER_SPACING,
      MAX_TEXT_LETTER_SPACING,
    ),
    lineHeight: clamp(
      finite(input.lineHeight, DEFAULT_TEXT.lineHeight),
      MIN_TEXT_LINE_HEIGHT,
      MAX_TEXT_LINE_HEIGHT,
    ),
    maxWidth:
      typeof input.maxWidth === "number" && Number.isFinite(input.maxWidth)
        ? clamp(input.maxWidth, MIN_TEXT_MAX_WIDTH, MAX_TEXT_MAX_WIDTH)
        : null,
    weight: TEXT_WEIGHTS.includes(input.weight as TextWeight)
      ? (input.weight as TextWeight)
      : DEFAULT_TEXT.weight,
  };
}

/**
 * A pose com que o texto nasce. Não é a dos aparelhos: eles giram 180° em Y
 * (`DEFAULT_OBJECT_TRANSFORM`) porque os modelos olham para trás no arquivo, e
 * o texto, plano, já nasce virado para a câmera — herdar o 180 o mostraria de
 * costas. Também não tem a abertura, que é do dobrável.
 */
export const DEFAULT_TEXT_POSE = {
  opacity: 1,
  positionX: 0,
  positionY: 0,
  positionZ: 0,
  rotationX: 0,
  rotationY: 0,
  rotationZ: 0,
  scale: 1,
} as const;

export function createTextObject({
  content,
  deletable = true,
  id,
  name,
  text,
}: {
  /** O que o texto diz ao nascer (vem da interface, no idioma dela). */
  content: string;
  deletable?: boolean;
  id?: string;
  name: string;
  text?: Partial<SceneText>;
}): TextObject {
  return {
    kind: "text",
    deletable,
    id: id ?? crypto.randomUUID(),
    isVisible: true,
    keyframes: [],
    name,
    ...DEFAULT_TEXT_POSE,
    text: normalizeSceneText({ ...text, content }),
  };
}

/**
 * O que as cinco fontes desenham: o latim (ASCII e Latin-1, com acentos) e a
 * pontuação comum — travessões, aspas curvas, reticências — e o euro. Qualquer
 * outra letra (emoji, japonês, cirílico) faltaria na fonte e o troika iria
 * buscar uma de reserva numa CDN; como o app não faz essa busca, o texto
 * inteiro deixaria de aparecer. Então, no desenho, o que está fora vira "?".
 * O conteúdo guardado não muda: só o que vai para o render.
 */
const UNSUPPORTED_CHARACTERS =
  /[^\n\u0020-\u007E\u00A0-\u00FF\u2013\u2014\u2018\u2019\u201C\u201D\u2026\u20AC]/gu;

export function toRenderableText(content: string) {
  return content.replace(/\r\n?/g, "\n").replace(UNSUPPORTED_CHARACTERS, "?");
}

/** Uma cópia do texto, com os mesmos campos e sem compartilhar nada. */
export function cloneSceneText(text: SceneText): SceneText {
  return { ...text };
}

/** Quanto a cópia fica deslocada do original, em unidades de posição. */
const DUPLICATE_OFFSET = 0.15;

/**
 * Duplica um texto um pouco abaixo e à direita do original: no mesmo lugar, a
 * cópia pareceria não ter sido feita. Os keyframes ganham ids novos — a
 * seleção da timeline os procura na cena toda.
 */
export function duplicateTextObject({
  id,
  name,
  source,
}: {
  id?: string;
  name: string;
  source: TextObject;
}): TextObject {
  return {
    ...source,
    deletable: true,
    id: id ?? crypto.randomUUID(),
    keyframes: cloneKeyframes(source.keyframes),
    name,
    positionX: source.positionX + DUPLICATE_OFFSET,
    positionY: source.positionY - DUPLICATE_OFFSET,
    text: cloneSceneText(source.text),
  };
}

type PoseFields = Pick<
  TextObject,
  | "opacity"
  | "positionX"
  | "positionY"
  | "positionZ"
  | "rotationX"
  | "rotationY"
  | "rotationZ"
  | "scale"
>;

/** Se o texto já está na pose de partida — aí o reset não teria o que fazer. */
export function isDefaultTextPose(object: PoseFields) {
  return (Object.keys(DEFAULT_TEXT_POSE) as (keyof PoseFields)[]).every(
    (key) => object[key] === DEFAULT_TEXT_POSE[key],
  );
}

export function resetTextObject(object: TextObject): TextObject {
  return { ...object, ...DEFAULT_TEXT_POSE };
}
