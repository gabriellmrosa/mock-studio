import type { Locale } from "./i18n";

/**
 * As novidades de cada versão, para quem abrir "Novidades" no menu de
 * preferências. É curadoria dos commits (`git log vX..vY`): só o que mudou para
 * quem usa, em linguagem de quem usa e em poucas palavras — um título e uma
 * descrição por item. Ajuste fino, refatoração e o que só serviu de passo para
 * outro commit ficam de fora; a história completa e o porquê estão nos commits.
 *
 * A mais nova primeiro. Versão nova: uma entrada aqui, nos dois idiomas
 * (`patch-notes.test.ts` falha sem ela), escrita pelo agente antes do
 * `npm version`.
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
    date: "2026-11-23",
    version: "3.5.0",
    items: [
      {
        title: {
          "pt-BR": "Novo tema padrão e tema Legacy",
          "en-US": "New Default and Legacy themes",
        },
        description: {
          "pt-BR":
            "O visual cinza escuro neutro passou a ser o novo Default. O tema quente original continua disponível em ⋮ → Tema como Legacy, ao lado do Drácula.",
          "en-US":
            "The neutral dark gray palette is now the new Default theme. The original warm dark theme remains available under ⋮ → Theme as Legacy, alongside Dracula.",
        },
      },
    ],
  },
  {
    date: "2026-11-23",
    version: "3.4.2",
    items: [
      {
        title: {
          "pt-BR": "Seletor Foto | Vídeo no Drácula",
          "en-US": "Photo | Video toggle in Dracula",
        },
        description: {
          "pt-BR":
            "No tema Drácula, a opção ativa de Foto | Vídeo agora usa superfície neutra de seleção com texto claro, deixando o roxo exclusivo para o botão Exportar.",
          "en-US":
            "In Dracula theme, the active Photo | Video option now uses the neutral selection surface with light text, keeping purple reserved for the Export CTA.",
        },
      },
    ],
  },
  {
    date: "2026-11-23",
    version: "3.4.1",
    items: [
      {
        title: {
          "pt-BR": "Telas preservadas ao trocar de template",
          "en-US": "Screens kept when switching templates",
        },
        description: {
          "pt-BR":
            "Enquanto a aba estiver aberta, cada template lembra as telas, imagens e música que você enviou nele — olhar outro template e voltar não faz mais você subir tudo de novo.",
          "en-US":
            "While the browser tab stays open, each template remembers the screens, images, and music you uploaded to it — previewing another template and coming back no longer requires re-uploading.",
        },
      },
    ],
  },
  {
    date: "2026-11-23",
    version: "3.4.0",
    items: [
      {
        title: {
          "pt-BR": "Tema Drácula",
          "en-US": "Dracula theme",
        },
        description: {
          "pt-BR":
            "O menu ⋮ → Tema agora oferece as opções Default e Drácula, aplicando a paleta oficial do Dracula na interface e na timeline de vídeo.",
          "en-US":
            "The ⋮ → Theme menu now offers Default and Dracula, applying the official Dracula palette across the interface and video timeline.",
        },
      },
    ],
  },
  {
    date: "2026-11-23",
    version: "3.3.1",
    items: [
      {
        title: {
          "pt-BR": "Nomes mais claros nos templates padrão",
          "en-US": "Clearer names for starter templates",
        },
        description: {
          "pt-BR":
            "Os templates padrão agora se chamam “Exemplo de foto” e “Exemplo de vídeo” para deixar claro que vêm prontos do app.",
          "en-US":
            "The starter templates are now named “Photo example” and “Video example” so it is clear they come built into the app.",
        },
      },
    ],
  },
  {
    date: "2026-11-23",
    version: "3.3.0",
    items: [
      {
        title: {
          "pt-BR": "Templates prontos para começar",
          "en-US": "Starter templates included",
        },
        description: {
          "pt-BR":
            "O Mock Studio agora já vem com um template de Foto (“Vitrine de produto”) e um de Vídeo (“Lançamento de produto”). Você pode aplicar, editar, renomear ou apagar como qualquer outro.",
          "en-US":
            "Mock Studio now comes with a Photo template (“Product Showcase”) and a Video template (“Product Launch”). Apply, edit, rename, or delete them like any other.",
        },
      },
      {
        title: {
          "pt-BR": "Salvar template mais claro",
          "en-US": "Clearer save template dialog",
        },
        description: {
          "pt-BR":
            "Ao salvar uma cena que veio de um template, “Salvar como novo” agora é a ação principal e “Sobrepor” fica como opção secundária.",
          "en-US":
            "When saving a scene that came from a template, “Save as new” is now the primary action and “Overwrite” is the secondary option.",
        },
      },
    ],
  },
  {
    date: "2026-11-21",
    version: "3.2.1",
    items: [
      {
        title: {
          "pt-BR": "Seções mais claras em Propriedades",
          "en-US": "Clearer sections in Properties",
        },
        description: {
          "pt-BR":
            "Uma divisória sutil separa os grupos de ajustes no painel de Propriedades.",
          "en-US":
            "A subtle divider now separates the groups of settings in the Properties panel.",
        },
      },
    ],
  },
  {
    date: "2026-11-20",
    version: "3.2.0",
    items: [
      {
        title: {
          "pt-BR": "Música no vídeo",
          "en-US": "Music in your video",
        },
        description: {
          "pt-BR":
            "No Vídeo, “+ Música” põe uma trilha na cena. Corte o começo e ela toca dali; ajuste o volume e os fades. Ela toca no play e sai no MP4 e no WebM.",
          "en-US":
            "In Video mode, “+ Music” adds a soundtrack. Trim the start and it plays from there; set the volume and fades. It plays with the scene and goes into the MP4 and WebM.",
        },
      },
      {
        title: {
          "pt-BR": "Exportação de vídeo mais estável",
          "en-US": "Steadier video export",
        },
        description: {
          "pt-BR":
            "Um vídeo de tela que demora a responder não interrompe mais a exportação.",
          "en-US":
            "A screen video that is slow to respond no longer stops the export.",
        },
      },
    ],
  },
  {
    date: "2026-11-20",
    version: "3.1.1",
    items: [
      {
        title: {
          "pt-BR": "Templates começam fechados",
          "en-US": "Templates start closed",
        },
        description: {
          "pt-BR":
            "A seção de templates abre sempre fechada, deixando mais espaço para a lista de objetos. Um clique no título a abre.",
          "en-US":
            "The templates section always opens closed, leaving more room for the object list. One click on its title opens it.",
        },
      },
      {
        title: {
          "pt-BR": "Arquivos com o nome do app",
          "en-US": "Files named after the app",
        },
        description: {
          "pt-BR":
            "PNGs e vídeos exportados agora saem como mock-studio-…, e não mais mock-photo-….",
          "en-US":
            "Exported PNGs and videos are now named mock-studio-… instead of mock-photo-….",
        },
      },
    ],
  },
  {
    date: "2026-11-19",
    version: "3.1.0",
    items: [
      {
        title: {
          "pt-BR": "Fundo liso e degradê",
          "en-US": "Flat and gradient backgrounds",
        },
        description: {
          "pt-BR":
            "No botão Fundo e grade, troque o chão 3D por um fundo liso: uma cor só ou um degradê entre duas cores, no ângulo que quiser. Ele sai igual no PNG e no vídeo.",
          "en-US":
            "In the Background and grid button, swap the 3D floor for a flat background: one color or a gradient between two, at any angle. It comes out the same in the PNG and the video.",
        },
      },
      {
        title: {
          "pt-BR": "O fundo também anima",
          "en-US": "The background animates too",
        },
        description: {
          "pt-BR":
            "O Fundo ganhou uma faixa na timeline: cada keyframe guarda cores, degradê e grade, e a cena desliza de um para o outro — até do chão 3D para o fundo liso.",
          "en-US":
            "The Background has its own timeline track: each keyframe keeps colors, gradient and grid, and the scene slides from one to the next — even from the 3D floor to a flat background.",
        },
      },
      {
        title: {
          "pt-BR": "Zoom e posição da tela animam",
          "en-US": "Screen zoom and position animate",
        },
        description: {
          "pt-BR":
            "Com um keyframe do aparelho selecionado, o zoom, a posição e o fundo da tela ficam nele: role um print comprido ou aproxime um detalhe ao longo do vídeo.",
          "en-US":
            "With a device keyframe selected, the screen's zoom, position and background are saved to it: scroll a long screenshot or push in on a detail across the video.",
        },
      },
      {
        title: {
          "pt-BR": "Desfazer e refazer",
          "en-US": "Undo and redo",
        },
        description: {
          "pt-BR":
            "Cmd+Z (ou Ctrl+Z) desfaz a última mudança da cena, e Cmd+Shift+Z (ou Ctrl+Y) refaz. Foto e Vídeo têm históricos separados.",
          "en-US":
            "Cmd+Z (or Ctrl+Z) undoes the last change to the scene, and Cmd+Shift+Z (or Ctrl+Y) redoes it. Photo and Video keep separate histories.",
        },
      },
      {
        title: {
          "pt-BR": "O 3D se recupera sozinho",
          "en-US": "The 3D view recovers on its own",
        },
        description: {
          "pt-BR":
            "Se a visualização 3D parar (ao suspender o computador, por exemplo), ela volta sem perder a cena, e você continua de onde estava.",
          "en-US":
            "If the 3D view stops (when the computer sleeps, for example), it comes back without losing the scene, and you pick up where you left off.",
        },
      },
    ],
  },
  {
    date: "2026-11-18",
    version: "3.0.0",
    items: [
      {
        title: {
          "pt-BR": "Cada objeto aparece só na sua faixa",
          "en-US": "Each object shows only on its track",
        },
        description: {
          "pt-BR":
            "Um objeto animado entra no primeiro keyframe e sai depois do último, então a timeline mostra exatamente o que vai para o vídeo. Para manter um objeto até o fim, estenda a faixa dele.",
          "en-US":
            "An animated object enters at its first keyframe and leaves after its last one, so the timeline shows exactly what goes into the video. To keep an object until the end, extend its track.",
        },
      },
      {
        title: {
          "pt-BR": "Último quadro congelado",
          "en-US": "Freeze the last frame",
        },
        description: {
          "pt-BR":
            "Estique o fim de um clipe de vídeo além do arquivo e a tela fica parada no último quadro. O trecho aparece como “Congelado” na timeline.",
          "en-US":
            "Stretch the end of a video clip past the file and the screen holds its last frame. That stretch shows as “Frozen” on the timeline.",
        },
      },
      {
        title: {
          "pt-BR": "Ímã na timeline",
          "en-US": "Timeline snapping",
        },
        description: {
          "pt-BR":
            "Keyframes, clipes e as bordas deles grudam em outros keyframes, nas pontas dos clipes e no playhead. Segure Alt para arrastar livre.",
          "en-US":
            "Keyframes, clips and their edges snap to other keyframes, clip ends and the playhead. Hold Alt to drag freely.",
        },
      },
      {
        title: {
          "pt-BR": "Copie a pose do keyframe vizinho",
          "en-US": "Copy a neighboring keyframe's pose",
        },
        description: {
          "pt-BR":
            "Clique com o botão direito num keyframe para copiar a pose do anterior ou do próximo.",
          "en-US":
            "Right-click a keyframe to copy the pose of the previous or the next one.",
        },
      },
      {
        title: {
          "pt-BR": "Templates lembram as telas",
          "en-US": "Templates remember the screens",
        },
        description: {
          "pt-BR":
            "Enquadramento, corte e tempo do clipe ficam salvos, e o template pede cada arquivo de novo pelo nome.",
          "en-US":
            "Framing, crop and clip timing are saved, and the template asks for each file again by name.",
        },
      },
      {
        title: {
          "pt-BR": "Sobrepor ou salvar novo",
          "en-US": "Overwrite or save new",
        },
        description: {
          "pt-BR":
            "Ao salvar uma cena que veio de um template, você escolhe sobrepor o template ou criar outro.",
          "en-US":
            "When saving a scene that came from a template, you choose to overwrite it or create a new one.",
        },
      },
      {
        title: {
          "pt-BR": "Câmera sob seu controle",
          "en-US": "The camera follows you",
        },
        description: {
          "pt-BR":
            "A câmera não se reenquadra mais sozinha. Com um keyframe dela selecionado, o que você faz na vista fica gravado nele.",
          "en-US":
            "The camera no longer reframes on its own. With one of its keyframes selected, what you do in the view is saved to it.",
        },
      },
    ],
  },
  {
    date: "2026-11-17",
    version: "2.5.0",
    items: [
      {
        title: {
          "pt-BR": "O Duo desfoca ao dobrar",
          "en-US": "The Duo blurs as it folds",
        },
        description: {
          "pt-BR":
            "As telas do Duo desfocam e escurecem enquanto ele abre e fecha, como no aparelho de verdade, no editor e no vídeo exportado.",
          "en-US":
            "The Duo's screens blur and darken while it opens and closes, like the real phone, in the editor and in the exported video.",
        },
      },
      {
        title: {
          "pt-BR": "Compartilhe templates",
          "en-US": "Share templates",
        },
        description: {
          "pt-BR":
            "No menu de cada template, copie um código para enviar a quem quiser; quem recebe usa “Importar template” e cola.",
          "en-US":
            "From each template's menu, copy a code to send to anyone; they use “Import template” and paste it.",
        },
      },
    ],
  },
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
