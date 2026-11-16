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

export type TextWeight = "regular" | "bold";

export const TEXT_WEIGHTS: readonly TextWeight[] = ["regular", "bold"];

export type TextFontInfo = {
  /** O nome que aparece na lista. */
  label: string;
  /** Para que serve, em poucas palavras — só documentação do catálogo. */
  role: "sans" | "geometric" | "serif" | "display" | "mono";
};

export const TEXT_FONTS: Record<TextFontId, TextFontInfo> = {
  inter: { label: "Inter", role: "sans" },
  poppins: { label: "Poppins", role: "geometric" },
  "playfair-display": { label: "Playfair Display", role: "serif" },
  oswald: { label: "Oswald", role: "display" },
  "jetbrains-mono": { label: "JetBrains Mono", role: "mono" },
};

export function isTextFontId(value: unknown): value is TextFontId {
  return (
    typeof value === "string" &&
    (TEXT_FONT_IDS as readonly string[]).includes(value)
  );
}
