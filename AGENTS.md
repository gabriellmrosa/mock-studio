# AGENTS.md — Mock Studio

Regras para quem muda o código deste projeto, gente ou agente. Aqui fica o
que fazer e o que não pode quebrar, com uma linha de porquê; o detalhe
técnico está em [docs/technical-notes.md](docs/technical-notes.md) e a
história de cada decisão em [POST-V1-ISSUES.md](POST-V1-ISSUES.md). O
[README](README.md) é a vitrine do produto.

Mock Studio é um editor de mockups 3D no navegador: aparelhos (celulares,
relógio, notebook, tablet) numa cena, com imagem ou gravação de tela na tela
de cada um, exportados como PNG ou, no modo Movimento, como vídeo animado por
keyframes. Next.js 16 (App Router, Turbopack), React 19, three r183 com
React Three Fiber e drei, Jest + Testing Library. Tudo roda no cliente; não
há backend, e o que o usuário salva fica no `localStorage` dele.

## Comandos

```bash
npm run dev          # localhost:3000
npm test             # Jest
npx tsc --noEmit     # tipos
npx eslint app       # lint
npm run build        # build de produção
```

**Pronto** quer dizer: testes, `tsc` e eslint passando, e a mudança vista
funcionando no navegador, com print para o usuário quando é visual. Antes de
levar para a `main`, também `npm run build`.

## Fluxo de trabalho

- **Idioma:** conversa com o usuário, este arquivo e comentários de código em
  pt-BR. O README, o POST-V1-ISSUES e as mensagens de commit são em inglês.
- **Branch:** o trabalho é na `motion-timeline` — não apagar. Conferir
  `git branch --show-current` antes de cada commit: o usuário faz checkout da
  `main` para dar push, e um commit já caiu direto nela e foi publicado.
- **`main`:** só recebe fast-forward, quando o usuário pede para publicar:
  `git checkout main && git merge --ff-only motion-timeline`, e voltar para a
  `motion-timeline`. **O push é sempre do usuário** (`git push --follow-tags`).
- **Commits:** só quando o usuário pede. "Documente e commite" quer dizer:
  atualizar o README (o que mudou para quem usa) e o POST-V1-ISSUES (um item
  novo com as decisões), e então commitar.
- **Arquivos do usuário:** nunca commitar nem apagar o que ele deixou na
  pasta (ex.: `public/teste-video.mov`, vídeos de teste). `promo-studio/` é
  um projeto dele, fora do git — não mexer.
- **Decisões de produto são do usuário.** Na dúvida sobre comportamento ou
  visual, propor e perguntar antes; ele costuma pedir "reflita e proponha".

### Versão e releases

A versão vem do `package.json` e aparece no painel de objetos. Cada release
publicado ganha uma tag (`v1.5.1`). Subir a versão é decisão de produto: o
agente nota e pergunta, nunca sobe sozinho.

Perguntar:

- ao preparar um merge para a `main`;
- ao começar uma sessão ou fazer um commit, se já houver 5 commits ou mais
  desde a última tag (`git describe --tags --abbrev=0` e
  `git rev-list --count <tag>..HEAD`).

Sugerir o número pelo que entrou desde a última tag, resumindo em poucas
linhas: **patch** só correções e refinos; **minor** funcionalidade nova sem
quebrar nada (templates salvos continuam abrindo); **major** algo deixa de
funcionar ou muda de forma incompatível. Se o usuário recusar, não perguntar
de novo na mesma sessão. Depois do "sim": `npm version <patch|minor|major>`
(atualiza o `package.json`, commita e cria a tag).

## Antes de escrever código

Ler o código que a mudança toca e o que depende dele. Então, parar no
primeiro degrau que resolve:

1. Não fazer o que ninguém pediu — nem opção, abstração ou configuração
   "para depois".
2. Reusar o que o projeto tem: as primitivas da tabela abaixo, os tokens, as
   funções de `app/lib/`.
3. Usar a plataforma (APIs do navegador, three, drei) ou uma dependência já
   instalada. Dependência nova só com motivo, e perguntando.
4. Só então, escrever o mínimo que funciona.

- **Preguiça na solução, não na mudança:** atualizar quem chama, os testes, as
  cópias de `copy` nos testes e a documentação que a mudança afeta.
- Num bug, achar todos os usos e corrigir a causa uma vez. Ao mover código,
  manter a validação e o tratamento de erro.
- Nunca cortar acessibilidade (rótulos, foco, contraste) nem o que o usuário
  pediu.
- Os comentários deste projeto explicam o porquê, em pt-BR, quantas linhas
  precisar. Seguir esse estilo.

## Interface e design system

- **Tokens sempre.** Cor, espaço, raio e tipografia vêm de
  [app/styles/tokens.css](app/styles/tokens.css) e
  [app/globals.css](app/globals.css), definidos para os temas escuro e claro.
  Token novo só se não houver outro jeito — e avisar o usuário. O mesmo vale
  para ícone novo. Nada de valor solto "porque funciona".
- **Ícones:** `lucide-react`.
- **Textos:** todo texto de interface vai em [app/lib/i18n.ts](app/lib/i18n.ts),
  em `pt-BR` e `en-US`. Ao criar uma chave nova, acrescentá-la também às cópias
  de `copy` em `InspectorPanel.test.tsx` e `LayersPanel.test.tsx`, senão o
  `tsc` falha.
- **Primitivas antes de componente novo.** Estão em
  [EditorPrimitives.tsx](app/components/EditorPrimitives/EditorPrimitives.tsx)
  e em `app/components/`:

| Para | Use |
|---|---|
| liga/desliga de verdade | `Switch` |
| escolha exclusiva, sempre uma selecionada | `SegmentedTabs` |
| grupos de sub-opções que nascem fechados | `SubTabs` / `SubTabPanel` |
| ação extra que acompanha outra ("Salvar como template") | `Checkbox` |
| escolha numa lista | `CustomSelect` |
| painel de opções ao lado do Inspector | `SidePopover` |
| menu de ações (`⋮`) | `ContextMenu` |
| decisão central com máscara (Exportar) | `Dialog` |
| confirmação que interrompe um fluxo | `AlertDialog` (é um `Dialog`) |
| trabalho longo que não pode ser interrompido por acidente | `Dialog` com `dismissible={false}` |
| aviso que informa sem alarmar | `Callout` |
| nome de um botão só de ícone, na barra do canvas | `Tooltip` |
| voltar ao padrão | `ResetButton` (`normal` ou `small`) |

- **Superfícies flutuantes** (menus, listas, popovers) usam `--sidebar-bg`,
  a mesma dos painéis.
- **Selecionado** é marcado por fundo e cor, nunca por negrito.
- **Gatilhos `⋮` e o ✕ de fechar** são discretos, sem fundo no hover
  (`context-menu-trigger-quiet`, `editor-icon-button-no-hover-bg`).
- **Contraste é medido:** texto secundário (`--sidebar-muted`) com 5,1:1 ou
  mais sobre `--surface-subtle`, nos dois temas; ação destrutiva em
  `--danger-fg`.
- **Tooltip só fora dos painéis:** os painéis têm rolagem e cortariam o balão;
  lá dentro, `title`.
- **Teclado:** `Space` é do play; ele nunca aciona botões (o `Enter` aciona).
  Todo controle tem `aria-label` e anel de `:focus-visible`.

## Arquitetura: o que não pode quebrar

Onde está cada coisa: [README › Project Structure](README.md#project-structure).

**Cena e modos**

- Estático e Movimento são ambientes independentes, cada um com a sua cena,
  câmera e lista de templates. O transform do objeto é a pose do Estático e só
  o Estático escreve nele; cada keyframe tem a sua cópia da pose, e só o
  Movimento escreve nelas. Não criar atalhos que liguem um ao outro: o
  primeiro keyframe já foi um alias da pose estática, e reordenar keyframes
  passou a reescrever o objeto.
- No Movimento o canvas mostra a cena no instante do playhead. É uma
  sobreposição de exibição: olhar um keyframe nunca muda o objeto.
- Campos aninhados do objeto (enquadramento, vídeo) são atualizados a partir
  do estado atual, `updateSceneObject(id, (object) => patch)`. Montar a partir
  do `selectedObject` do render fazia duas edições rápidas se desfazerem.
- Todo modelo é centrado no próprio pivô (`pivotOffset` = negativo do centro
  do bounding box visível), para girar no centro visual e alinhar com os
  outros. Checklist de modelo novo: [README](README.md#adding-a-new-3d-model).

**Templates**

- Guardam composição, fundo, câmera e, no Movimento, os keyframes — **nunca**
  as imagens ou vídeos das telas: são arquivos inteiros e estourariam os ~5 MB
  do `localStorage`.
- O schema fica na versão 1, com campos novos sempre opcionais. Subir a
  versão faria uma cópia antiga do app em cache (PWA) ler zero templates e
  sobrescrever a lista ao salvar.
- Aplicar um template é objetos primeiro, câmera por último
  (`pendingCameraPose`, no lugar do auto-enquadramento).

**Canvas (React Three Fiber)**

- **Callbacks que entram em efeitos dentro do `<Canvas>` precisam ser
  estáveis** (`useCallback`), e um setter de lista devolve o mesmo array
  quando nada muda. Uma função nova por render já desligou o auto-enquadramento
  em silêncio e já fez o canvas renderizar ~740 vezes por segundo parado.
  Parado, o canvas deve renderizar zero vezes.
- O R3F compara props de objeto por referência: `userData={{ opacity }}` é
  reaplicado a cada render. Passar números (`userData-opacity`).
- Animação e export escrevem direto nos grupos 3D (`useFrame`), sem passar
  pelo estado do React.
- O export de vídeo avança os quadros com `advance()`, não com
  `requestAnimationFrame`, que congela com a aba em segundo plano.
- `camera-controls`: não usar `saveState()`/`reset()`; a promise do
  `setLookAt` só resolve quando a transição seguinte começa. O enquadramento de
  origem fica guardado explicitamente.

**Telas e vídeo**

- Imagem e vídeo de tela passam sempre por `useScreenTexture` e pelo
  compositor ([screen-compositor.ts](app/lib/screen-compositor.ts)), que
  aplica enquadramento, fundo, corte e conversão HDR. O modelo nunca recebe a
  fonte direto.
- Corte de borda é máscara, não reenquadramento.
- Vídeos ficam como blob URL, nunca base64. O `<video>` fica no documento,
  invisível: fora dele o Chrome para de entregar quadros.
- Um shader próprio que lê `VideoTexture` decodifica sRGB ele mesmo.
- O tempo do vídeo pertence à timeline (o clipe tem trilha própria); fora do
  clipe, a tela mostra só o fundo.

**Exportação**

- PNG renderiza fora da tela com supersampling 2×.
- Vídeo é quadro a quadro, codificado com `mediabunny` (WebCodecs), carregado
  só no primeiro export. WebM transparente funciona no Chrome, Edge e Firefox.
  O Safari ainda não mostra a transparência: o dialog avisa e oferece o
  link do projeto para abrir em outro navegador.
- **Link do projeto** ([scene-link.ts](app/lib/scene-link.ts)): a cena vai
  comprimida no hash da URL, com formato versionado à parte dos templates
  (`v: 1`); campo novo de template entra no link sem mudar nada. Ao abrir,
  vira template do navegador. Copiar usa `copyPendingText`, porque o Safari
  só deixa escrever na área de transferência durante o clique.
- O dialog Exportar é: escolher tudo, depois um botão Exportar. O rótulo é
  "Exportar", não "Download", e não há seletor de pasta (decisões do usuário).

**Analytics**

- Vercel Web Analytics e Microsoft Clarity ([analytics.ts](app/lib/analytics.ts)).
  O Clarity só carrega depois do "Aceitar" do cartão de consentimento, e só no
  deploy de produção. Não inicie nada que grave ou use cookies antes disso.
- Todo texto sai mascarado nas gravações (`data-clarity-mask` no `<body>`):
  nomes de objetos, templates e arquivos são do usuário. Não tirar.
- Quem lê a URL chama `clearSceneLinkFromUrl()` antes: a cena de um link de
  projeto nunca pode sair do computador.
- Para testar o cartão localmente, rodar o dev com
  `NEXT_PUBLIC_VERCEL_ENV=production` — e não clicar em "Aceitar", que mandaria
  uma sessão de `localhost` para o projeto real.

## Verificar no navegador

- Usar o servidor `dev` de `.claude/launch.json` e conferir no navegador do
  app. Para mudança visual, tirar print. Para geometria e cor, medir por script
  (`getBoundingClientRect`, estilos computados).
- **Painel do navegador escondido:** o rAF para, a cena fica em "Preparing
  scene", cliques de câmera não surtem efeito e transições CSS não avançam.
  Para testar câmera ou animação, manter o painel visível.
- **Estado velho do Fast Refresh** já deu falso resultado várias vezes
  (detecção de alterações não salvas, opacidade, closures do export).
  Recarregar a página antes de concluir que algo quebrou.
- **Pixel do WebGL:** ler o canvas sem `preserveDrawingBuffer` devolve um
  quadro velho. Validar o instrumento contra uma mudança conhecida antes de
  confiar no número.
- **Turbopack** às vezes serve o `globals.css` antigo, e um token novo resolve
  vazio. Conferir o chunk CSS servido e fazer uma segunda alteração no arquivo.
- **Vídeo exportado:** interceptar o download na página e conferir com
  `ffprobe` (quadros, fps, canal alfa).
- Uma cena de exemplo mexida durante o teste é do usuário: dizer o que foi
  alterado.

## Testes

- Jest + Testing Library; o teste fica ao lado do arquivo (`*.test.ts(x)`).
  Lógica sem DOM vai para `app/lib/` como função pura, com teste próprio.
- O jsdom não tem `scrollIntoView` nem WebGL: stub no teste quando um
  componente precisa (ex.: `CustomSelect` abrindo a lista).
- Corrigir um bug é reproduzi-lo primeiro e, quando der, conferir que o
  código antigo falha no mesmo teste.
