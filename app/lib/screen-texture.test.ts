import { getScreenLayout } from "./screen-texture";
import { DEFAULT_SCREEN_FIT, type ScreenFit } from "./scene-objects";

function fit(patch: Partial<ScreenFit>): ScreenFit {
  return { ...DEFAULT_SCREEN_FIT, ...patch };
}

// Fonte com a mesma proporção da tela: sem folga até dar zoom.
const matching = [1000, 2000, 500, 1000] as const;

describe("getScreenLayout", () => {
  describe("automatic cover crop", () => {
    it("keeps the full frame when the proportions already match", () => {
      const layout = getScreenLayout(1080, 1920, 540, 960);

      expect(layout.offset[0]).toBeCloseTo(0);
      expect(layout.offset[1]).toBeCloseTo(0);
      expect(layout.repeat[0]).toBeCloseTo(1);
      expect(layout.repeat[1]).toBeCloseTo(1);
      expect(layout.contentMin).toEqual([0, 0]);
      expect(layout.contentMax).toEqual([1, 1]);
    });

    it("crops the sides of a source wider than the screen, centered", () => {
      // 2000×1000 numa tela quadrada: sobra metade da largura.
      const { offset, repeat } = getScreenLayout(2000, 1000, 500, 500);

      expect(repeat[0]).toBeCloseTo(0.5);
      expect(repeat[1]).toBeCloseTo(1);
      expect(offset[0]).toBeCloseTo(0.25);
      expect(offset[1]).toBeCloseTo(0);
    });

    it("crops top and bottom of a source taller than the screen", () => {
      // Gravação de iPhone (1179×2556) na tela do Smartphone (421×896).
      const { offset, repeat } = getScreenLayout(1179, 2556, 421, 896);

      expect(repeat[0]).toBeCloseTo(1);
      expect(repeat[1]).toBeLessThan(1);
      expect(repeat[1]).toBeGreaterThan(0.97);
      expect(offset[1]).toBeCloseTo((1 - repeat[1]) / 2);
    });
  });

  describe("framing", () => {
    it("zooms around the center", () => {
      const { offset, repeat } = getScreenLayout(...matching, fit({ zoom: 2 }));

      expect(repeat[0]).toBeCloseTo(0.5);
      expect(repeat[1]).toBeCloseTo(0.5);
      expect(offset[0]).toBeCloseTo(0.25);
      expect(offset[1]).toBeCloseTo(0.25);
    });

    it("moves the content right and up by sliding the window the other way", () => {
      const { offset } = getScreenLayout(
        ...matching,
        fit({ panX: 1, panY: 1, zoom: 2 }),
      );

      // Conteúdo encostado à direita e ao topo: a janela vai para a esquerda
      // (U = 0) e, com flipY, para baixo (V = 0).
      expect(offset[0]).toBeCloseTo(0);
      expect(offset[1]).toBeCloseTo(0);
    });

    it("inverts the vertical direction on models without flipY", () => {
      const { offset } = getScreenLayout(
        ...matching,
        fit({ panY: 1, zoom: 2 }),
        false,
      );

      expect(offset[1]).toBeCloseTo(0.5);
    });

    it("pans a taller source even at 100% zoom", () => {
      // Screenshot comprido: sobra altura, então dá para mostrar o topo.
      const top = getScreenLayout(1000, 4000, 500, 1000, fit({ panY: -1 }));

      expect(top.repeat[1]).toBeCloseTo(0.5);
      expect(top.offset[1]).toBeCloseTo(0.5);
    });
  });

  describe("zoom below 100%", () => {
    it("shrinks the content into the middle, leaving room for the background", () => {
      const { contentMax, contentMin, offset, repeat } = getScreenLayout(
        ...matching,
        fit({ zoom: 0.5 }),
      );

      // A janela tem o dobro do conteúdo e começa meia largura antes dele:
      // o conteúdo ocupa a metade central da tela, o resto é fundo.
      expect(repeat[0]).toBeCloseTo(2);
      expect(offset[0]).toBeCloseTo(-0.5);
      expect(contentMin).toEqual([0, 0]);
      expect(contentMax).toEqual([1, 1]);
    });

    it("pins the shrunk content to an edge at ±100%", () => {
      const { offset } = getScreenLayout(
        ...matching,
        fit({ panX: -1, zoom: 0.5 }),
      );

      // Conteúdo encostado à esquerda: a janela começa no próprio conteúdo.
      expect(offset[0]).toBeCloseTo(-1);
    });
  });

  describe("edge crop", () => {
    it("masks the cropped edges without rescaling the content", () => {
      // Moldura gravada: 10% em cima e 10% embaixo.
      const cropped = getScreenLayout(
        ...matching,
        fit({ cropBottom: 0.1, cropTop: 0.1 }),
      );
      const plain = getScreenLayout(...matching);

      // Mesma janela de antes — cortar não amplia nem desloca o conteúdo...
      expect(cropped.offset).toEqual(plain.offset);
      expect(cropped.repeat).toEqual(plain.repeat);
      // ...só as faixas cortadas saem da área do conteúdo e viram fundo.
      expect(cropped.contentMin[1]).toBeCloseTo(0.1);
      expect(cropped.contentMax[1]).toBeCloseTo(0.9);
    });

    it("keeps top and bottom crops on the right edges without flipY", () => {
      const layout = getScreenLayout(
        ...matching,
        fit({ cropTop: 0.2 }),
        false,
      );

      // Sem flipY o V = 0 é o topo: é ali que o corte de cima fica.
      expect(layout.contentMin[1]).toBeCloseTo(0.2);
      expect(layout.contentMax[1]).toBeCloseTo(1);
    });

    it("masks the sides the same way", () => {
      const layout = getScreenLayout(
        ...matching,
        fit({ cropLeft: 0.1, cropRight: 0.05 }),
      );

      expect(layout.repeat[0]).toBeCloseTo(1);
      expect(layout.contentMin[0]).toBeCloseTo(0.1);
      expect(layout.contentMax[0]).toBeCloseTo(0.95);
    });
  });

  it("clamps zoom, pan and crop to their ranges", () => {
    const layout = getScreenLayout(
      ...matching,
      fit({ cropTop: 0.9, panX: 5, zoom: 0.1 }),
    );
    const same = getScreenLayout(
      ...matching,
      fit({ cropTop: 0.25, panX: 1, zoom: 0.5 }),
    );

    expect(layout).toEqual(same);
  });
});
