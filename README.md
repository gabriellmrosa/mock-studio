# Mockup Studio

Editor de mockups em `Next.js` + `React Three Fiber` para compor telas de app em dispositivos 3D.

## Como Rodar

```bash
npm install
npm run dev
```

Build de validacao:

```bash
npm run build
```

Checks de qualidade:

```bash
npx tsc --noEmit
npm run lint
npm test -- --runInBand
```

## Catalogo de Modelos

| Modelo | Arquivo GLB | modelScale | baseRotation | modelSpawnOffset | Upload recomendado |
|---|---|---|---|---|---|
| smartphone | smartphone.glb | [1, 1, 1] | [0, 0, 0] | [0, 0, 0] | 1290x2755 |
| smartphone2 | apple_iphone_14_pro_orange.glb | [122.9, 122.9, 122.9] | [0, 90.5°, 0] | [0, 0, 0] | 1290x2748 |
| smartwatch | smartwatch.glb | [19.44, 19.44, 19.44] | [0, -π/2, 0] | [130, 40, 270] | 1290x1452 |
| notebook | notebook.glb | [2311, 2311, 2311] | [0, π, 0] | [120, 100, 0] | 2755x1684 |

## Recursos Principais

- composicao multiobjeto com catalogo de `smartphone`, `smartphone2`, `smartwatch` e `notebook`;
- upload de imagem por objeto com placeholder especifico por modelo;
- transformacoes por objeto: posicao, rotacao e escala;
- temas visuais e customizacao manual de cores por partes nomeadas;
- export PNG com transparencia real e menu de resolucao no canvas;
- selecao por painel de camadas e por interacao direta no canvas;
- novos objetos do mesmo modelo passam a nascer lado a lado para evitar sobreposicao imperceptivel;
- `Take photo` para captura do canvas sem grid nem fundo visivel;
- suporte a `pt-BR` e `en-US`;
- dark mode e light mode;
- base de testes com `Jest + Testing Library`.

## Estrutura Relevante

- [app/page.tsx](app/page.tsx): orquestra estado do editor, lista de objetos e selecao.
- [app/components/MockupCanvas/](app/components/MockupCanvas/): canvas 3D, camera, export e renderizacao.
- [app/components/LayersPanel/](app/components/LayersPanel/): painel de camadas e preferencias globais.
- [app/components/InspectorPanel/](app/components/InspectorPanel/): propriedades do objeto selecionado.
- [app/models/device-models.ts](app/models/device-models.ts): catalogo de dispositivos e metadados de escala/rotacao.
- [app/lib/scene-objects.ts](app/lib/scene-objects.ts): criacao, reset e troca de modelo dos objetos.
- [app/lib/3d-tokens/](app/lib/3d-tokens/): temas e tokens de cores por modelo.
- [app/lib/i18n.ts](app/lib/i18n.ts): textos da interface em `pt-BR` e `en-US`.

## Regras de Styling

- `app/styles/tokens.css` e a fonte de verdade para tokens de cor, tipografia, spacing e radius;
- `app/globals.css` concentra variaveis semanticas dependentes de tema;
- Tailwind deve ser usado principalmente para layout e composicao estrutural;
- CSS de componente deve cuidar de estados visuais e regras locais;
- evitar utilitarios arbitrarios quando houver token equivalente.

## Regras de Copy

- a interface deve soar como ferramenta criativa profissional;
- labels, menus, tooltips e modais devem passar por `app/lib/i18n.ts`;
- evitar misturar portugues e ingles no mesmo contexto visual;
- reutilizar os mesmos termos para a mesma acao em toda a UI.

## Adicionando Novos Modelos 3D

Checklist:

- colocar o `.glb` em `public/models/`;
- criar o componente React em `app/components/`;
- criar os tokens de cor em `app/lib/3d-tokens/`;
- adicionar entrada em `app/models/device-models.ts` com `modelScale`, `baseRotation`, `pivotOffset` e metadados;
- atualizar a union `DeviceModelId`;
- usar `debugPartColors`/`debugMode` para mapear as partes antes de expor o modelo na UI;
- definir placeholder e temas finais do modelo.

## Scripts de Asset

- [scripts/extract-orange-iphone.mjs](scripts/extract-orange-iphone.mjs): isola o node do iPhone usado pelo app a partir do GLB fonte.
- [scripts/extract-iphone-textures.mjs](scripts/extract-iphone-textures.mjs): exporta texturas selecionadas do GLB original para inspecao local em `tmp/`.

Esses scripts sao utilitarios de desenvolvimento para preparacao de assets e nao fazem parte do fluxo normal da aplicacao.

## Creditos e Licencas

Os creditos e licencas dos assets 3D usados no projeto estao expostos na UI pelo modal `Credits`.

## Notas de UX

- o menu de export no canvas deixa `1920x1080` disponivel hoje e antecipa presets de maior resolucao como `Em breve`;
- menus flutuantes e listas usam contraste reforcado no dark mode para hover e selecao;
- o grid do canvas permanece visivel por mais tempo em zoom-out antes de desaparecer gradualmente.
