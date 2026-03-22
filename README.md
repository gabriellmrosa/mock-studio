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
- `smartphone`, `smartphone2` e `smartwatch` iniciam no tema `gray`;
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
| smartphone2 | smartphone2.glb | [102.6, 102.6, 102.6] | [0, π, 0] | [115, 50, 180] | 1290x2848 |
| smartwatch | smartwatch.glb | [19.44, 19.44, 19.44] | [0, -π/2, 0] | [130, 40, 270] | 1290x1452 |
| notebook | notebook.glb | [2311, 2311, 2311] | [0, π, 0] | [120, 100, 0] | - |

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
- [app/components/Smartphone2.tsx](app/components/Smartphone2.tsx): modelo smartphone2 com correcao de UV atlas na tela.
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

Catalogo expandido para 4 dispositivos. Arquitetura multimodelo consolidada com `modelScale`, `baseRotation`, `pivotOffset` e `modelSpawnOffset` por modelo. `smartwatch` calibrado com tela texturizada funcional, placeholder proprio e material fisico preservado no casco. Placeholders agora sao definidos por modelo, sem troca por idioma. Recomendacao de upload exibida por modelo no inspector. Painel de debug de spawn removido da UI lateral.

**Bug conhecido pendente:** reset de camera restaura posicao e zoom corretamente, mas o azimute nao retorna ao estado inicial (`camera-controls` v3).

## Proximo Passo Sugerido

- implementar debug de cor real no `notebook`;
- confirmar malha da tela do `notebook` e substituir a textura original pela imagem do app;
- definir temas de cores do `notebook`;
- investigar bug de reset do azimute da camera;
- refinar UX de camadas (reorder, lock ou visibilidade).

## Aprendizados

- no `smartwatch`, `Object_11` nao e um `screen mesh` puro; ele faz parte do corpo frontal interno;
- aplicar a textura do app diretamente em `Object_11` vaza para o casco e gera aparencia incorreta;
- a solucao robusta para o `smartwatch` foi usar um plano separado para a tela e preservar o material original do GLB no casco;
- trocar `MeshPhysicalMaterial` original por `MeshLambertMaterial` no `smartwatch` fazia o corpo parecer oco; clonar o material original e trocar apenas a cor resolveu isso;
- no `notebook`, o debug de cor ainda nao existe de fato: o componente atual ignora `colors` e `debugPartColors`;
- o `notebook` parece ja vir com uma tela/material proprio no GLB, entao a proxima etapa deve ser identificar a malha correta antes de sobrescrever materiais.

## Observacoes Tecnicas

- `SkeletonUtils.clone` + `<primitive object={clone}/>` para modelos carregados via GLTF;
- nos com `scale=[0,0,0]` no GLTF sao ocultados para nao distorcer o bounding box;
- `Suspense` por objeto (nao global) evita re-fit da camera ao carregar texturas;
- `sceneFitKey` baseado apenas nos IDs dos objetos garante re-fit so em add/remove;
- `modelSpawnOffset` e somado ao `AUTO_OBJECT_POSITIONS` por indice;
- placeholders agora sao unicos por modelo e nao mudam com o idioma;
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
