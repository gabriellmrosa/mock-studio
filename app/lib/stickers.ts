/**
 * O acervo de stickers: o Fluent Emoji da Microsoft (MIT), no estilo "Color",
 * em `public/stickers/<id>.svg` — um arquivo por sticker, auto-hospedado como as
 * fontes. O id é o nome do arquivo e é o que um template ou link guarda: por
 * isso é único no acervo todo e nunca muda (a categoria é só a organização da
 * grade, e um sticker pode trocar de categoria sem quebrar nada salvo).
 *
 * Sticker novo: o arquivo em `public/stickers/`, o id aqui, o nome em pt-BR em
 * `sticker-labels.ts` e, se vier de outro autor, a licença em
 * `public/stickers/LICENSES.md` e em `CreditsModal`.
 */

export const STICKER_CATEGORY_IDS = ["classicos", "tematizados", "natureza", "comida", "objetos", "numerais", "animados"] as const;

export type StickerCategoryId = (typeof STICKER_CATEGORY_IDS)[number];

export const STICKERS: Record<StickerCategoryId, readonly string[]> = {
  animados: [
    "animated-alarm", "animated-alien", "animated-avocado",
    "animated-balloon", "animated-butterfly", "animated-camera",
    "animated-cherries", "animated-cherry-blossom", "animated-clap",
    "animated-coffee", "animated-confetti-ball", "animated-crown",
    "animated-crystal-ball", "animated-eyes", "animated-fire",
    "animated-flex", "animated-four-leaf-clover", "animated-fox",
    "animated-gem", "animated-ghost", "animated-hamburger",
    "animated-heart-eyes", "animated-hundred", "animated-joy",
    "animated-light-bulb", "animated-megaphone", "animated-ok",
    "animated-panda", "animated-party-popper", "animated-pizza",
    "animated-pray", "animated-rainbow", "animated-red-heart",
    "animated-rocket", "animated-skull", "animated-sparkles",
    "animated-star-struck", "animated-strawberry", "animated-sunglasses",
    "animated-thumbs-up", "animated-trophy", "animated-unicorn",
    "animated-victory", "animated-watermelon", "animated-wave",
    "animated-wink",
  ],
  classicos: [
    "grinning-face", "grinning-face-with-big-eyes",
    "beaming-face-with-smiling-eyes", "face-with-tears-of-joy",
    "rolling-on-the-floor-laughing", "smiling-face-with-smiling-eyes",
    "winking-face", "smiling-face-with-heart-eyes",
    "smiling-face-with-hearts", "star-struck", "face-blowing-a-kiss",
    "kissing-face", "smiling-face-with-sunglasses", "nerd-face",
    "thinking-face", "face-with-raised-eyebrow", "neutral-face",
    "unamused-face", "face-with-rolling-eyes", "smirking-face",
    "pleading-face", "loudly-crying-face", "crying-face",
    "face-screaming-in-fear", "exploding-head", "partying-face", "zany-face",
    "sleeping-face", "hugging-face", "face-with-hand-over-mouth",
    "shushing-face", "saluting-face", "melting-face",
    "face-holding-back-tears", "yawning-face", "smiling-face-with-halo",
    "smiling-face-with-horns", "angry-face", "pouting-face", "cold-face",
    "hot-face", "money-mouth-face", "cowboy-hat-face", "clown-face",
    "thumbs-up", "thumbs-down", "clapping-hands", "folded-hands",
    "waving-hand", "victory-hand", "crossed-fingers", "ok-hand",
    "raising-hands", "flexed-biceps", "handshake", "red-heart",
    "orange-heart", "yellow-heart", "green-heart", "blue-heart",
    "purple-heart", "black-heart", "white-heart", "brown-heart",
    "broken-heart", "sparkling-heart", "growing-heart", "beating-heart",
    "two-hearts", "revolving-hearts", "heart-with-arrow", "heart-on-fire",
    "fire", "sparkles", "star", "glowing-star", "collision", "dizzy",
    "high-voltage", "eyes", "speech-balloon", "thought-balloon",
    "check-mark-button", "cross-mark", "red-question-mark",
    "red-exclamation-mark", "warning",
  ],
  tematizados: [
    "party-popper", "confetti-ball", "balloon", "wrapped-gift",
    "birthday-cake", "fireworks", "sparkler", "christmas-tree", "santa-claus",
    "snowman", "snowflake", "bell", "jack-o-lantern", "ghost", "skull",
    "spider-web", "spider", "bat", "candy", "lollipop", "chocolate-bar",
    "reminder-ribbon", "four-leaf-clover", "rainbow", "sun", "sunflower",
    "cherry-blossom", "tulip", "hibiscus", "palm-tree", "beach-with-umbrella",
    "umbrella-on-ground", "rose", "heart-decoration", "love-letter", "egg",
    "carp-streamer", "japanese-dolls", "tanabata-tree", "pine-decoration",
    "firecracker", "ribbon", "candle", "crown", "trophy", "1st-place-medal",
    "sports-medal",
  ],
  natureza: [
    "cat-face", "dog-face", "panda", "unicorn", "fox", "butterfly",
    "hatching-chick", "baby-chick", "bear", "koala", "tiger-face", "lion",
    "monkey-face", "see-no-evil-monkey", "frog", "penguin", "owl", "flamingo",
    "peacock", "parrot", "dolphin", "spouting-whale", "octopus", "turtle",
    "honeybee", "lady-beetle", "snail", "rabbit-face", "hamster",
    "mouse-face", "pig-face", "cow-face", "horse-face", "llama", "giraffe",
    "elephant", "hedgehog", "otter", "sloth", "shark", "crab", "fish",
    "tropical-fish", "cactus", "seedling", "herb", "maple-leaf", "mushroom",
    "cloud", "crescent-moon", "full-moon-face", "globe-showing-europe-africa",
    "comet", "sun-behind-cloud", "cloud-with-rain", "water-wave",
  ],
  comida: [
    "pizza", "hamburger", "french-fries", "hot-dog", "taco", "burrito",
    "sushi", "steaming-bowl", "cooked-rice", "bento-box", "doughnut",
    "cookie", "cupcake", "ice-cream", "soft-ice-cream", "shaved-ice",
    "popcorn", "avocado", "strawberry", "watermelon", "cherries", "banana",
    "pineapple", "mango", "peach", "red-apple", "green-apple", "grapes",
    "lemon", "tangerine", "coconut", "kiwi-fruit", "tomato", "eggplant",
    "carrot", "ear-of-corn", "hot-pepper", "broccoli", "bread", "croissant",
    "baguette-bread", "cheese-wedge", "cooking", "bacon", "hot-beverage",
    "bubble-tea", "teacup-without-handle", "glass-of-milk", "pancakes",
    "waffle", "pretzel",
  ],
  objetos: [
    "rocket", "gem-stone", "light-bulb", "camera", "mobile-phone", "laptop",
    "desktop-computer", "keyboard", "headphone", "microphone", "musical-note",
    "musical-notes", "guitar", "video-game", "joystick", "game-die",
    "magic-wand", "crystal-ball", "paintbrush", "artist-palette", "money-bag",
    "dollar-banknote", "credit-card", "alarm-clock", "hourglass-not-done",
    "megaphone", "key", "locked", "hammer", "wrench", "gear",
    "magnifying-glass-tilted-left", "books", "open-book", "pencil", "memo",
    "calendar", "bar-chart", "chart-increasing", "pushpin", "paperclip",
    "package", "shopping-cart", "shopping-bags", "television",
    "clapper-board", "movie-camera", "telephone-receiver", "e-mail",
    "battery", "electric-plug", "magnet", "compass", "globe-with-meridians",
  ],
  numerais: [
    "keycap-0", "keycap-1", "keycap-2", "keycap-3", "keycap-4", "keycap-5",
    "keycap-6", "keycap-7", "keycap-8", "keycap-9", "keycap-10",
    "keycap-hashtag", "keycap-asterisk", "hundred-points", "input-numbers",
    "2nd-place-medal", "3rd-place-medal", "new-button", "free-button",
    "ok-button", "cool-button", "top-arrow", "soon-arrow", "plus", "minus",
    "multiply", "divide",
  ],
};

/** Os nomes das categorias, por idioma (ver `i18n.ts`). */
export const STICKER_CATEGORY_NAMES_PT_BR: Record<StickerCategoryId, string> = {
  classicos: "Clássicos",
  tematizados: "Tematizados",
  natureza: "Natureza e animais",
  comida: "Comida",
  objetos: "Objetos",
  numerais: "Numerais",
  animados: "Animados",
};

export const STICKER_CATEGORY_NAMES_EN_US: Record<StickerCategoryId, string> = {
  classicos: "Classics",
  tematizados: "Themed",
  natureza: "Nature & animals",
  comida: "Food",
  objetos: "Objects",
  numerais: "Numerals",
  animados: "Animated",
};

const STICKER_IDS: ReadonlySet<string> = new Set(Object.values(STICKERS).flat());

export function isStickerId(value: unknown): value is string {
  return typeof value === "string" && STICKER_IDS.has(value);
}

/** Todos os stickers cabem num quadrado (o Fluent é 32 × 32). */
export const STICKER_ASPECT = 1;

const ANIMATED_PREFIX = "animated-";

/**
 * Os animados são o Noto Animated do Google (CC BY 4.0, pede crédito), em
 * Lottie: um arquivo de ~80 KB que é vetor e que se posiciona num quadro
 * exato. A grade mostra o emoji parado (o SVG ao lado) — tocar 46 animações
 * ao mesmo tempo não é o que ela está ali para fazer.
 */
export function isAnimatedSticker(id: string) {
  return id.startsWith(ANIMATED_PREFIX);
}

/** O arquivo do sticker: o SVG, ou o Lottie de um animado. */
export function getStickerUrl(id: string) {
  return isAnimatedSticker(id)
    ? `/stickers/animated/${id.slice(ANIMATED_PREFIX.length)}.json`
    : `/stickers/${id}.svg`;
}

/** A imagem parada do sticker, para a grade e para a faixa do Inspector. */
export function getStickerThumbUrl(id: string) {
  return isAnimatedSticker(id)
    ? `/stickers/animated/${id.slice(ANIMATED_PREFIX.length)}.svg`
    : `/stickers/${id}.svg`;
}

export function getStickerCategory(id: string): StickerCategoryId | null {
  return (
    STICKER_CATEGORY_IDS.find((category) => STICKERS[category].includes(id)) ??
    null
  );
}

/**
 * O nome para quem lê: o do idioma da interface. Em inglês, o próprio id
 * ("red-heart" → "Red heart"), que vem do nome oficial do emoji.
 */
export function getStickerLabel(id: string, labels: Record<string, string> | null) {
  const label = labels?.[id];

  if (label) {
    return label;
  }

  const words = id.replace(/-/g, " ");

  return words.charAt(0).toUpperCase() + words.slice(1);
}
