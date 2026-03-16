# Mockup Studio

Editor de mockups em Next.js + React Three Fiber para compor imagens de app em dispositivos 3D.

## Estado Atual

O projeto esta funcional como um MVP de composicao com multiobjeto basico em cena, ainda com apenas 1 modelo 3D real: `smartphone`.

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
- controles de rotacao X, Y e Z por objeto;
- reset do objeto selecionado;
- reset global de camera;
- export PNG transparente em `1920x1080` e `2560x1440`;
- modo debug de cores por parte por objeto;
- modo `So tela`, que remove a casca do dispositivo e deixa apenas a textura da tela;
- toggle global de `dark/light`;
- toggle global de idioma `pt-BR/en-US`;
- arquitetura inicial de catalogo de dispositivos.

## Decisoes de Produto Ja Tomadas

- foco atual: validar bem o fluxo multiobjeto antes de expandir o catalogo;
- export: somente PNG com fundo transparente;
- transformacoes liberadas nesta etapa: apenas rotacao por objeto;
- sem reposicionamento manual horizontal/vertical por enquanto;
- camera continua global da cena;
- cada objeto possui sua propria imagem e sua propria configuracao;
- o objeto inicial da cena nao pode ser deletado;
- novos objetos entram com leve deslocamento automatico para nao sobrepor totalmente o objeto base;
- ao trocar o modelo de um objeto, a imagem da tela deve ser resetada para placeholder;
- por enquanto, seguimos com apenas 1 modelo real para validar a arquitetura multiobjeto;
- multiobjeto, novos modelos e video serao tratados em etapas separadas.

## Estrutura Relevante

- [app/page.tsx](/Users/gabrielrosa/Desktop/dev/mock-photo/app/page.tsx): orquestra o estado do editor, lista de objetos da cena e selecao ativa.
- [app/components/LayersPanel.tsx](/Users/gabrielrosa/Desktop/dev/mock-photo/app/components/LayersPanel.tsx): painel esquerdo com camadas/objetos e preferencias globais.
- [app/components/InspectorPanel.tsx](/Users/gabrielrosa/Desktop/dev/mock-photo/app/components/InspectorPanel.tsx): painel direito com configuracoes do objeto selecionado.
- [app/components/MockupCanvas.tsx](/Users/gabrielrosa/Desktop/dev/mock-photo/app/components/MockupCanvas.tsx): canvas 3D, orbit controls, reset de camera, export e renderizacao de multiplos objetos.
- [app/components/Smartphone.tsx](/Users/gabrielrosa/Desktop/dev/mock-photo/app/components/Smartphone.tsx): modelo atual do smartphone, tela com textura e modo sem casca.
- [app/models/device-models.ts](/Users/gabrielrosa/Desktop/dev/mock-photo/app/models/device-models.ts): catalogo de dispositivos e metadados do modelo ativo.
- [app/lib/scene-objects.ts](/Users/gabrielrosa/Desktop/dev/mock-photo/app/lib/scene-objects.ts): helpers para criar, resetar e trocar o modelo de objetos da cena.
- [app/lib/mockup-image.ts](/Users/gabrielrosa/Desktop/dev/mock-photo/app/lib/mockup-image.ts): utilitarios da textura/imagem da tela.
- [app/lib/i18n.ts](/Users/gabrielrosa/Desktop/dev/mock-photo/app/lib/i18n.ts): copy da interface em `pt-BR` e `en-US`.

## Branch de Trabalho

As alteracoes recentes foram feitas na branch:

- `work-with-codex`

## Onde Paramos

A base de cena multiobjeto foi implementada e esta funcional, mas ainda estamos validando comportamento fino e UX antes de expandir o catalogo de devices.

A ultima feature implementada foi:

- separacao da interface em `LayersPanel + Canvas + InspectorPanel`, com multiplos smartphones simultaneos em cena e estado isolado por objeto.

## Proximo Passo Sugerido

Validar com calma o fluxo multiobjeto atual e, depois disso, escolher entre:

- adicionar o segundo modelo real ao catalogo, aproveitando a nova estrutura por objeto;
- liberar posicionamento manual por objeto para composicao mais flexivel;
- refinar UX de camadas, incluindo reorder, lock ou visibilidade.

## Observacoes Tecnicas

- a textura da tela ja foi corrigida e nao deve mais deformar sozinha;
- o reset de camera foi ajustado para restaurar corretamente o enquadramento da cena;
- o offset automatico entre objetos e temporario e serve apenas para validar multiobjeto antes de expor controles de posicao;
- existe apenas 1 modelo real no catalogo neste momento: `smartphone`;
- `npm run lint` passa;
- `npx next build --webpack` passa;
- o `next build` com Turbopack pode falhar no sandbox, entao usar `--webpack` para validacao local quando necessario.

## Como Rodar

```bash
npm install
npm run dev
```

Build de validacao:

```bash
npx next build --webpack
```
