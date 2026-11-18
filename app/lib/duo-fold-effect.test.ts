import { DUO_FOLD_FX, getDuoFoldFx } from "./duo-fold-effect";

describe("getDuoFoldFx", () => {
  it("leaves the open device sharp and at full brightness", () => {
    const fx = getDuoFoldFx(180);

    expect(fx.inner.blurPx).toBe(0);
    expect(fx.inner.baseDarken).toBe(0);
    expect(fx.inner.freeEdgeDarken).toBe(0);
    expect(fx.base.baseDarken).toBe(0);
    // De costas, aberto, a tela de fora também fica como sempre foi.
    expect(fx.outer.blurPx).toBe(0);
    expect(fx.outer.darken).toBe(0);
  });

  it("blurs the free edge by the measured amount at the reference angle", () => {
    const fx = getDuoFoldFx(DUO_FOLD_FX.referenceAngle);

    expect(fx.inner.blurPx).toBe(DUO_FOLD_FX.blurPx);
    expect(fx.inner.freeEdgeDarken).toBe(DUO_FOLD_FX.freeEdgeDarken);
  });

  it("does not blur more once past the reference angle", () => {
    expect(getDuoFoldFx(5).inner.blurPx).toBe(DUO_FOLD_FX.blurPx);
  });

  it("blurs less the more open the device is", () => {
    const blurs = [95, 110, 140, 160, 175].map((angle) => getDuoFoldFx(angle).inner.blurPx);

    for (let i = 1; i < blurs.length; i += 1) {
      expect(blurs[i]).toBeLessThan(blurs[i - 1]);
    }
  });

  it("keeps the outer screen sharp closed, frosted at its peak and sharp open", () => {
    expect(getDuoFoldFx(0).outer.blurPx).toBe(0);
    expect(getDuoFoldFx(DUO_FOLD_FX.outerPeakAngle).outer.blurPx).toBeCloseTo(
      DUO_FOLD_FX.blurPx * DUO_FOLD_FX.outerBlurShare,
    );
    expect(getDuoFoldFx(180).outer.blurPx).toBe(0);
  });

  it("turns the outer screen off by the black angle and brings it back when open", () => {
    expect(getDuoFoldFx(0).outer.darken).toBe(0);
    const total = (angle: number) => {
      const { outer } = getDuoFoldFx(angle);

      // O escuro que chega à borda livre soma o parado com o do degradê.
      return outer.darken + outer.darkenEdge;
    };

    expect(total(DUO_FOLD_FX.outerBlackAngle)).toBeCloseTo(DUO_FOLD_FX.outerDarken);
    expect(total(DUO_FOLD_FX.outerHoldEnd)).toBeCloseTo(DUO_FOLD_FX.outerDarken);
    expect(getDuoFoldFx(180).outer.darken).toBe(0);
    expect(getDuoFoldFx(180).outer.darkenEdge).toBe(0);
  });

  it("clamps the angle to what the hinge allows", () => {
    expect(getDuoFoldFx(400)).toEqual(getDuoFoldFx(180));
    expect(getDuoFoldFx(-30)).toEqual(getDuoFoldFx(0));
  });
});
