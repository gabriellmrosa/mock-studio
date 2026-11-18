import type { Locale } from "./i18n";

/**
 * As novidades de cada versão, para quem abrir "Novidades" no menu de
 * preferências. É curadoria dos commits (`git log vX..vY`): só o que mudou para
 * quem usa, em linguagem de quem usa e em poucas palavras — um título e uma
 * descrição por item. Ajuste fino, refatoração e o que só serviu de passo para
 * outro commit ficam de fora; a história completa e o porquê estão nos commits.
 *
 * A mais nova primeiro. Versão nova: uma entrada aqui, nos dois idiomas
 * (`patch-notes.test.ts` falha sem ela). O texto é de produto: propor ao
 * usuário e esperar o ok, como a própria versão.
 */
type Text = Record<Locale, string>;

export type PatchNoteItem = {
  description: Text;
  title: Text;
};

export type PatchNote = {
  /** AAAA-MM-DD, o dia da tag. */
  date: string;
  items: PatchNoteItem[];
  version: string;
};

export const PATCH_NOTES: PatchNote[] = [
  {
    date: "2026-11-17",
    version: "2.4.0",
    items: [
      {
        title: {
          "pt-BR": "A câmera também anima",
          "en-US": "The camera animates too",
        },
        description: {
          "pt-BR":
            "A câmera virou um objeto da lista, com keyframes no modo Vídeo: gire, aproxime e mude a lente ao longo do tempo. No Foto, ajuste a vista pelos campos e use o reset para enquadrar a cena de novo.",
          "en-US":
            "The camera is now an object in the list, with keyframes in Video mode: orbit, move in and change the lens over time. In Photo, adjust the view with the fields and use reset to frame the scene again.",
        },
      },
    ],
  },
  {
    date: "2026-11-17",
    version: "2.3.1",
    items: [
      {
        title: { "pt-BR": "Sombra à parte", "en-US": "Shadow on its own" },
        description: {
          "pt-BR":
            "Stickers e imagens ganharam um interruptor de sombra, separado do contorno.",
          "en-US":
            "Stickers and images have a shadow switch, apart from the outline.",
        },
      },
    ],
  },
  {
    date: "2026-11-17",
    version: "2.3.0",
    items: [
      {
        title: { "pt-BR": "Veja o que mudou", "en-US": "See what changed" },
        description: {
          "pt-BR":
            "Um histórico das versões, com o que mudou em cada uma, no menu ⋮ do painel de objetos.",
          "en-US":
            "A history of the versions, with what changed in each one, in the ⋮ menu of the objects panel.",
        },
      },
      {
        title: {
          "pt-BR": "Imagem direto do computador",
          "en-US": "Image straight from your computer",
        },
        description: {
          "pt-BR":
            "Ao adicionar uma imagem, o seletor de arquivos abre na hora, e a imagem só entra na cena depois de escolhida.",
          "en-US":
            "When you add an image, the file picker opens right away, and the image enters the scene only once you pick it.",
        },
      },
      {
        title: { "pt-BR": "Objetos novos à parte", "en-US": "New objects stand apart" },
        description: {
          "pt-BR":
            "Imagens e stickers novos entram deslocados na diagonal, para ficar claro que não fazem parte do aparelho.",
          "en-US":
            "New images and stickers enter offset on a diagonal, so it is clear they are not part of the device.",
        },
      },
      {
        title: {
          "pt-BR": "Cor e opacidade da grade",
          "en-US": "Grid color and opacity",
        },
        description: {
          "pt-BR":
            "O botão de fundo agora abre um painel: além da cor de fundo, você escolhe a cor e a opacidade das linhas do chão, que saem na exportação com fundo.",
          "en-US":
            "The background button now opens a panel: besides the background color, you choose the color and opacity of the floor lines, which show in an export with a background.",
        },
      },
      {
        title: { "pt-BR": "Menu corrigido", "en-US": "Menu fixed" },
        description: {
          "pt-BR":
            "O submenu de idioma agora fecha ao descer para outro item do menu.",
          "en-US":
            "The language submenu now closes when you move down to another menu item.",
        },
      },
    ],
  },
  {
    date: "2026-11-17",
    version: "2.2.0",
    items: [
      {
        title: { "pt-BR": "Imagens soltas", "en-US": "Loose images" },
        description: {
          "pt-BR":
            "Adicione um PNG, SVG ou GIF e posicione, gire e anime como qualquer objeto. O GIF toca em loop no Vídeo.",
          "en-US":
            "Add a PNG, SVG or GIF and move, rotate and animate it like any object. A GIF loops in Video mode.",
        },
      },
      {
        title: { "pt-BR": "Stickers", "en-US": "Stickers" },
        description: {
          "pt-BR":
            "Mais de 320 stickers em categorias, com busca. Eles voltam com a arte quando você abre um template ou um link.",
          "en-US":
            "Over 320 stickers in categories, with search. They come back with their art when you open a template or a link.",
        },
      },
      {
        title: { "pt-BR": "Stickers animados", "en-US": "Animated stickers" },
        description: {
          "pt-BR":
            "46 stickers que se mexem, em loop no Vídeo, com controle de velocidade.",
          "en-US":
            "46 stickers that move, looping in Video mode, with a speed control.",
        },
      },
      {
        title: { "pt-BR": "Contorno de adesivo", "en-US": "Sticker outline" },
        description: {
          "pt-BR":
            "Um contorno branco e uma sombra suave em qualquer imagem ou sticker, com um interruptor no painel.",
          "en-US":
            "A white outline and a soft shadow on any image or sticker, with a switch in the panel.",
        },
      },
      {
        title: { "pt-BR": "Um convite ao upload", "en-US": "An invitation to upload" },
        description: {
          "pt-BR":
            "Uma imagem sem arquivo é um círculo branco que pede o upload, e ele não sai na exportação.",
          "en-US":
            "An image with no file is a white circle asking for an upload, and it is left out of the export.",
        },
      },
    ],
  },
  {
    date: "2026-11-17",
    version: "2.1.0",
    items: [
      {
        title: { "pt-BR": "Texto na cena", "en-US": "Text in the scene" },
        description: {
          "pt-BR":
            "Crie textos com cinco fontes, todos os pesos, alinhamento, entrelinha e largura. Eles entram nos templates e na exportação.",
          "en-US":
            "Create text with five fonts, every weight, alignment, line height and width. It goes into templates and the export.",
        },
      },
      {
        title: { "pt-BR": "Texto animado", "en-US": "Animated text" },
        description: {
          "pt-BR":
            "No Vídeo, a cor e o espaço entre as letras mudam de um keyframe para o outro.",
          "en-US":
            "In Video mode, the color and the letter spacing change from one keyframe to the next.",
        },
      },
      {
        title: { "pt-BR": "Painel mais compacto", "en-US": "A more compact panel" },
        description: {
          "pt-BR":
            "Campos numéricos menores e com a mesma altura e os mesmos cantos em todo o painel de propriedades.",
          "en-US":
            "Smaller number fields, with the same height and corners across the properties panel.",
        },
      },
      {
        title: { "pt-BR": "Atualização de segurança", "en-US": "Security update" },
        description: {
          "pt-BR": "O Next.js foi atualizado para incluir correções de segurança.",
          "en-US": "Next.js was updated to include security fixes.",
        },
      },
    ],
  },
  {
    date: "2026-11-16",
    version: "2.0.0",
    items: [
      {
        title: { "pt-BR": "Foto e Vídeo", "en-US": "Photo and Video" },
        description: {
          "pt-BR":
            "Os modos do canvas passaram a se chamar Foto e Vídeo, o que cada um exporta.",
          "en-US":
            "The canvas modes are now called Photo and Video, after what each one exports.",
        },
      },
      {
        title: { "pt-BR": "Nova paleta escura", "en-US": "A new dark palette" },
        description: {
          "pt-BR":
            "Os painéis ficaram mais claros que o fundo, como nos editores de design. O tema claro está desligado por enquanto.",
          "en-US":
            "Panels are now lighter than the background, as in design editors. The light theme is off for now.",
        },
      },
      {
        title: { "pt-BR": "Abas para a tela", "en-US": "Tabs for the screen" },
        description: {
          "pt-BR":
            "A tela do aparelho ganhou abas de pasta para escolher entre Imagem e Vídeo.",
          "en-US":
            "The device screen has folder tabs to choose between Image and Video.",
        },
      },
      {
        title: { "pt-BR": "Transições legíveis", "en-US": "Readable transitions" },
        description: {
          "pt-BR":
            "O nome da transição entre keyframes ficou legível e ganhou um botão ⋮ para trocá-la.",
          "en-US":
            "The name of the transition between keyframes is readable and has a ⋮ button to change it.",
        },
      },
    ],
  },
  {
    date: "2026-11-12",
    version: "1.9.0",
    items: [
      {
        title: { "pt-BR": "Duo, o celular dobrável", "en-US": "Duo, the foldable phone" },
        description: {
          "pt-BR":
            "Um celular que abre e fecha, com a tela de dentro e a de fora, cada uma com a sua imagem ou vídeo, e todas as peças editáveis.",
          "en-US":
            "A phone that opens and closes, with an inner and an outer screen, each with its own image or video, and every part editable.",
        },
      },
      {
        title: { "pt-BR": "Aparelho em uma faixa", "en-US": "Device in a row" },
        description: {
          "pt-BR":
            "A escolha do aparelho virou uma faixa, como a tela e a cor, e o Duo e o tablet ganharam o interruptor da moldura.",
          "en-US":
            "The device choice is now a row, like the screen and the color, and the Duo and the tablet got a bezel switch.",
        },
      },
      {
        title: { "pt-BR": "Abre mais rápido", "en-US": "Opens faster" },
        description: {
          "pt-BR":
            "O primeiro aparelho carrega antes; os outros modelos são baixados depois, quando o navegador está livre.",
          "en-US":
            "The first device loads sooner; the other models download later, when the browser is idle.",
        },
      },
      {
        title: { "pt-BR": "Janelas menores", "en-US": "Smaller windows" },
        description: {
          "pt-BR": "O app funciona em janelas a partir de 1200 × 520, o que inclui notebooks comuns.",
          "en-US": "The app works in windows from 1200 × 520, which includes ordinary laptops.",
        },
      },
      {
        title: { "pt-BR": "Imagens verificadas", "en-US": "Checked images" },
        description: {
          "pt-BR":
            "Uma imagem que o navegador não abre (como HEIC no Chrome) mostra um aviso em vez de travar o editor.",
          "en-US":
            "An image the browser can't open (like HEIC in Chrome) shows a note instead of crashing the editor.",
        },
      },
    ],
  },
  {
    date: "2026-11-09",
    version: "1.8.0",
    items: [
      {
        title: { "pt-BR": "Posição da imagem na tela", "en-US": "Image position on the screen" },
        description: {
          "pt-BR":
            "O X e o Y da imagem são uma fração do tamanho dela: ±100% a tira da tela, sem estourar.",
          "en-US":
            "The image's X and Y are a fraction of its size: ±100% takes it fully off the screen.",
        },
      },
      {
        title: { "pt-BR": "Painéis arrastáveis", "en-US": "Draggable panels" },
        description: {
          "pt-BR": "Os painéis flutuantes se arrastam pela barra do topo.",
          "en-US": "Floating panels can be dragged by their top bar.",
        },
      },
    ],
  },
];

/** Compara duas versões "x.y.z": negativo se a < b, 0 se iguais, positivo se a > b. */
export function compareVersions(a: string, b: string) {
  const left = a.split(".").map(Number);
  const right = b.split(".").map(Number);

  for (let index = 0; index < 3; index += 1) {
    const difference = (left[index] ?? 0) - (right[index] ?? 0);

    if (difference !== 0) {
      return difference;
    }
  }

  return 0;
}
