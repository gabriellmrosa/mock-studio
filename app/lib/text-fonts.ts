/**
 * As fontes do texto da cena: uma lista curada, auto-hospedada em
 * `public/fonts/` (todas com licença OFL, que permite embutir). O troika lê
 * `.ttf`, `.otf` e `.woff` — `.woff2` não — e carrega os arquivos sob demanda.
 *
 * Aqui só o catálogo e as regras; os arquivos entram junto com o render do
 * texto. Cada família tem o peso normal e o negrito: os dois bastam para a
 * hierarquia de títulos e corpo, e cada peso extra é um arquivo a mais.
 */
export const TEXT_FONT_IDS = [
  "inter",
  "poppins",
  "playfair-display",
  "oswald",
  "jetbrains-mono",
] as const;

export type TextFontId = (typeof TEXT_FONT_IDS)[number];

export const DEFAULT_TEXT_FONT_ID: TextFontId = "inter";

/** Pesos como no CSS: 100 (Thin) a 900 (Black). Cada fonte tem os seus. */
export type TextWeight = 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900;

export const DEFAULT_TEXT_WEIGHT: TextWeight = 400;

/** Os nomes do mercado (os mesmos nos dois idiomas, como os nomes das fontes). */
export const TEXT_WEIGHT_NAMES: Record<TextWeight, string> = {
  100: "Thin",
  200: "Extra Light",
  300: "Light",
  400: "Regular",
  500: "Medium",
  600: "Semi Bold",
  700: "Bold",
  800: "Extra Bold",
  900: "Black",
};

export type TextFontInfo = {
  /** O nome que aparece na lista. */
  label: string;
  /** Para que serve, em poucas palavras — só documentação do catálogo. */
  role: "sans" | "geometric" | "serif" | "display" | "mono";
  /** Um arquivo por peso em `public/fonts/`: só os que a família tem. */
  weights: readonly TextWeight[];
};

export const TEXT_FONTS: Record<TextFontId, TextFontInfo> = {
  inter: {
    label: "Inter",
    role: "sans",
    weights: [100, 200, 300, 400, 500, 600, 700, 800, 900],
  },
  poppins: {
    label: "Poppins",
    role: "geometric",
    weights: [100, 200, 300, 400, 500, 600, 700, 800, 900],
  },
  "playfair-display": {
    label: "Playfair Display",
    role: "serif",
    weights: [400, 500, 600, 700, 800, 900],
  },
  oswald: {
    label: "Oswald",
    role: "display",
    weights: [200, 300, 400, 500, 600, 700],
  },
  "jetbrains-mono": {
    label: "JetBrains Mono",
    role: "mono",
    weights: [100, 200, 300, 400, 500, 600, 700, 800],
  },
};

/** Templates e links de antes dos pesos guardavam "regular" ou "bold". */
const LEGACY_WEIGHTS: Record<string, TextWeight> = { bold: 700, regular: 400 };

/**
 * O peso que a fonte tem mais perto do pedido — ao trocar de fonte, o peso que
 * ela não tem (Thin na Playfair) vai para o vizinho, em vez de quebrar. Aceita
 * também o "regular" e o "bold" de antes. Em empate, o mais pesado.
 */
export function getNearestWeight(fontId: TextFontId, weight: unknown): TextWeight {
  const requested =
    typeof weight === "string" && Object.hasOwn(LEGACY_WEIGHTS, weight)
      ? LEGACY_WEIGHTS[weight]
      : typeof weight === "number" && Number.isFinite(weight)
        ? weight
        : DEFAULT_TEXT_WEIGHT;

  return TEXT_FONTS[fontId].weights.reduce((nearest, candidate) => {
    const gap = Math.abs(candidate - requested);
    const best = Math.abs(nearest - requested);

    return gap < best || (gap === best && candidate > nearest)
      ? candidate
      : nearest;
  });
}

/** Onde o arquivo da fonte está (`public/fonts/`): `inter-400.woff`, `inter-700.woff`. */
export function getTextFontUrl(fontId: TextFontId, weight: TextWeight) {
  return `/fonts/${fontId}-${getNearestWeight(fontId, weight)}.woff`;
}

export function isTextFontId(value: unknown): value is TextFontId {
  return (
    typeof value === "string" &&
    (TEXT_FONT_IDS as readonly string[]).includes(value)
  );
}
