# Mockup Studio

Editor de mockups em Next.js + React Three Fiber para compor imagens de app em dispositivos 3D.

## Estado Atual

O projeto esta funcional como um editor de composicao multiobjeto com catalogo de 4 modelos 3D reais.

Ja implementado:

- upload de imagem para a tela do app por objeto;
- textura aplicada corretamente na tela do dispositivo;
- suporte a multiplos objetos na mesma cena;
- objeto base inicial nao deletavel;
- botao para adicionar novos objetos na cena;
- remocao de objetos adicionados pelo usuario;
- selecao de objeto ativo por painel de camadas;
- inspector separado para editar apenas o objeto selecionado;
- selecao de tema base do device por objeto;
- ajuste manual da cor do body por objeto;
- toggle por objeto para acabamento `fosco` ou mais refletivo;
- controles de posicao X, Y e Z por objeto;
- controles de rotacao X, Y e Z por objeto;
- controle de escala uniforme por objeto;
- reset das transformacoes do objeto selecionado;
- reset global de camera;
- color picker de cor de fundo do canvas na toolbar flutuante;
- export PNG transparente em `1920x1080` e `2560x1440`;
- modo debug de cores por parte por objeto;
- modo `So tela`, que remove a casca do dispositivo e deixa apenas a textura da tela;
- toggle global de `dark/light`;
- toggle global de idioma `pt-BR/en-US`;
- placeholders por modelo, independentes de idioma;
- recomendacao de upload por modelo no inspector;
- catalogo com 4 modelos 3D: `smartphone`, `smartphone2`, `smartwatch` e `notebook`;
- arquitetura multimodelo com `modelScale`, `baseRotation`, `pivotOffset` e `modelSpawnOffset` por modelo;
- `smartwatch` com tela texturizada em plano separado, raio calibrado e casco preservando o material fisico do GLB;
- `notebook` com tela do app aplicada na malha correta do GLB, placeholder proprio, temas ativos e debug semantico inicial das partes mapeadas;
- `smartphone2` agora usa o asset recortado do iPhone 14, com tela aplicada no mesh real do GLB, placeholder proprio `1290x2748`, temas ativos e debug semantico inicial;
- modo `Cor fosca` reduz reflexo dos materiais fisicos e, no `smartphone2` atual, oculta o vidro frontal para privilegiar a leitura da tela;
- `smartphone`, `smartphone2`, `smartwatch` e `notebook` iniciam no tema `gray`;
- design system com tokens primitivos de cor (`--black-000` a `--black-980`, `--gray-*`, `--ink-*`), border-radius (`--radius-xs` a `--radius-full`) e font-weight (`--font-regular` a `--font-bold`) para dark e light mode;
- menu de preferencias com submenus cascata (Theme e Language) com checkmark no item ativo;
- menu de contexto por layer (3 pontos) com opcoes de Renomear e Deletar;
- `ContextMenu` renderizado via React Portal para evitar clipping por `overflow`;
- icones via `lucide-react`;
- controle de camera via `CameraControls` com pan programatico;
- botoes de seta no toolbar flutuante movem a camera (pan) proporcionalmente a distancia atual;
- setas do teclado tambem acionam o pan da camera;
- grid de profundidade infinito no canvas com cor adaptativa baseada em luminancia do fundo;
- input de hex no `ColorRow` com debounce, normalizacao e feedback visual de erro;
- `Suspense` por objeto para isolar o carregamento de textura sem disparar re-fit da camera;
- camera re-ajusta apenas quando objetos sao adicionados ou removidos (nao em mudancas de propriedade).

## Catalogo de Modelos

| Modelo | Arquivo GLB | modelScale | baseRotation | modelSpawnOffset | Upload recomendado |
|---|---|---|---|---|
| smartphone | smartphone.glb | [1, 1, 1] | [0, 0, 0] | [0, 0, 0] | 1290x2755 |
| smartphone2 | apple_iphone_14_pro_orange.glb | [122.9, 122.9, 122.9] | [0, 90.5°, 0] | [0, 0, 0] | 1290x2748 |
| smartwatch | smartwatch.glb | [19.44, 19.44, 19.44] | [0, -π/2, 0] | [130, 40, 270] | 1290x1452 |
| notebook | notebook.glb | [2311, 2311, 2311] | [0, π, 0] | [120, 100, 0] | 2755x1684 |

## Decisoes de Produto Ja Tomadas

- foco atual: catalogo de modelos e composicao multiobjeto;
- export: somente PNG com fundo transparente;
- transformacoes por objeto: posicao X/Y/Z, rotacao X/Y/Z e escala uniforme;
- camera continua global da cena;
- o giro com mouse no canvas atua na camera via `CameraControls`, nao no estado de rotacao do objeto;
- cada objeto possui sua propria imagem e sua propria configuracao;
- o objeto inicial da cena nao pode ser deletado;
- novos objetos entram com leve deslocamento automatico para nao sobrepor totalmente o objeto base;
- ao trocar o modelo de um objeto, a imagem da tela e resetada para placeholder.

## Estrutura Relevante

- [app/page.tsx](app/page.tsx): orquestra o estado do editor, lista de objetos da cena e selecao ativa.
- [app/styles/tokens.css](app/styles/tokens.css): tokens primitivos de cor, border-radius e font-weight.
- [app/globals.css](app/globals.css): tokens semanticos e resets globais.
- [app/components/LayersPanel/](app/components/LayersPanel/): painel esquerdo com camadas/objetos e preferencias globais.
- [app/components/InspectorPanel/](app/components/InspectorPanel/): painel direito com configuracoes do objeto selecionado (transform, temas, debug).
- [app/components/MockupCanvas/](app/components/MockupCanvas/): canvas 3D, CameraControls, grid, export e renderizacao de multiplos objetos.
- [app/components/Smartphone.tsx](app/components/Smartphone.tsx): modelo smartphone com tela texturizada.
- [app/components/Smartphone2.tsx](app/components/Smartphone2.tsx): modelo smartphone2 atual, baseado no iPhone 14 com tela aplicada no mesh real do GLB.
- [app/components/Smartwatch.tsx](app/components/Smartwatch.tsx): modelo smartwatch.
- [app/components/Notebook.tsx](app/components/Notebook.tsx): modelo notebook.
- [app/models/device-models.ts](app/models/device-models.ts): catalogo de dispositivos com metadados de escala, rotacao e offset.
- [app/lib/3d-tokens/](app/lib/3d-tokens/): tokens de cores e temas por modelo.
- [app/lib/scene-objects.ts](app/lib/scene-objects.ts): helpers para criar, resetar e trocar modelo de objetos da cena.
- [app/lib/scene-presets.ts](app/lib/scene-presets.ts): presets padrao de transformacao e posicoes automaticas da cena.
- [app/lib/mockup-image.ts](app/lib/mockup-image.ts): utilitarios da textura/imagem da tela.
- [app/lib/i18n.ts](app/lib/i18n.ts): copy da interface em `pt-BR` e `en-US`.
- [CLAUDE.md](CLAUDE.md): guia tecnico para adicionar novos modelos 3D ao catalogo.

## Branch de Trabalho

- `work-with-codex`

## Onde Paramos

Catalogo consolidado em 4 dispositivos. Arquitetura multimodelo com `modelScale`, `baseRotation`, `pivotOffset` e `modelSpawnOffset` por modelo. `smartwatch` segue com tela texturizada funcional e material fisico preservado no casco. `notebook` aceita a imagem do app na malha correta da tela, com placeholder proprio e debug semantico inicial. O `smartphone2` antigo foi substituido pelo asset recortado do iPhone 14, com placeholder `1290x2748`, temas ativos, mapeamento semantico inicial e tela aplicada no mesh real do GLB. Placeholders sao definidos por modelo, sem troca por idioma. O inspector continua com toggle por objeto para acabamento fosco.

**Bug conhecido pendente:** reset de camera restaura posicao e zoom corretamente, mas o azimute nao retorna ao estado inicial (`camera-controls` v3).

## Proximo Passo Sugerido

- investigar bug de reset do azimute da camera;
- revisar se os controles temporarios do `leva` para roughness do `notebook` devem virar tokens fixos por tema ou sair da codebase apos calibracao final;
- continuar o mapeamento semantico das malhas restantes do `notebook`;
- refinar UX de camadas (reorder, lock ou visibilidade).

## Aprendizados

- no `smartwatch`, `Object_11` nao e um `screen mesh` puro; ele faz parte do corpo frontal interno;
- aplicar a textura do app diretamente em `Object_11` vaza para o casco e gera aparencia incorreta;
- a solucao robusta para o `smartwatch` foi usar um plano separado para a tela e preservar o material original do GLB no casco;
- trocar `MeshPhysicalMaterial` original por `MeshLambertMaterial` no `smartwatch` fazia o corpo parecer oco; clonar o material original e trocar apenas a cor resolveu isso;
- no `notebook`, a malha de tela correta e `tfTbkkzhxqpKRgC`; o contorno preto da tela e `nAIWMiVEtSYdjdZ`, e a barra inferior da dobra e `WyuoVWKMOcOlXJM`;
- no `smartphone2` atual, a malha de tela correta e `Object_13`; o recorte superior preto e `Object_4`, o body principal e `Object_7`, e os pequenos cortes laterais seguem a cor do body via `Object_8`;
- `screenBezel` e `lowerHingeBar` do `notebook` devem permanecer sempre pretos; a borracha de tela/dobra tambem deve ser tratada como detalhe fixo escuro;
- o controle de `fosco` precisa atuar no material real de cada modelo, nao apenas existir na UI;
- no `smartphone2` atual, esconder o vidro frontal no modo fosco produz leitura melhor da textura do app;
- para depurar brilho/reflexo do `notebook`, expor roughness via `leva` foi mais eficiente do que entupir o inspector principal com controles temporarios.

## Observacoes Tecnicas

- `SkeletonUtils.clone` + `<primitive object={clone}/>` para modelos carregados via GLTF;
- nos com `scale=[0,0,0]` no GLTF sao ocultados para nao distorcer o bounding box;
- `Suspense` por objeto (nao global) evita re-fit da camera ao carregar texturas;
- `sceneFitKey` baseado apenas nos IDs dos objetos garante re-fit so em add/remove;
- `modelSpawnOffset` e somado ao `AUTO_OBJECT_POSITIONS` por indice;
- placeholders agora sao unicos por modelo e nao mudam com o idioma;
- `notebook` usa placeholder `/placeholder-2755x1684.png`;
- `leva` foi adicionado para calibracao local de materiais do `notebook`;
- `OBJECT_POSITION_MULTIPLIER = 140` (X/Y) e `OBJECT_POSITION_MULTIPLIER_Z = 420` (Z);
- grid em `y=-300` com `infiniteGrid`, `cellSize=50`, `sectionSize=200`;
- `npm run lint` deve passar;
- `npx next build --webpack` para validacao de build.

## Como Rodar

```bash
npm install
npm run dev
```

Build de validacao:

```bash
npx next build --webpack
```
