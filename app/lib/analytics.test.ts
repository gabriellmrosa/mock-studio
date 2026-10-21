import Clarity from "@microsoft/clarity";

jest.mock("@microsoft/clarity", () => ({
  __esModule: true,
  default: { consentV2: jest.fn(), init: jest.fn() },
}));

/** O analytics liga uma vez por página: cada teste carrega o módulo de novo. */
function loadAnalytics() {
  let analytics!: typeof import("./analytics");

  jest.isolateModules(() => {
    analytics = jest.requireActual("./analytics");
  });

  return analytics;
}

describe("startAnalytics", () => {
  beforeEach(() => {
    window.history.replaceState(null, "", "/");
    jest.clearAllMocks();
  });

  it("starts Clarity once, for measuring and not ads", async () => {
    const { startAnalytics } = loadAnalytics();

    await startAnalytics();
    await startAnalytics();

    expect(Clarity.init).toHaveBeenCalledTimes(1);
    expect(Clarity.init).toHaveBeenCalledWith("z1bd9medbq");
    expect(Clarity.consentV2).toHaveBeenCalledWith({
      ad_Storage: "denied",
      analytics_Storage: "granted",
    });
  });

  it("takes a project link out of the URL before Clarity can read it", async () => {
    const { startAnalytics } = loadAnalytics();
    let hashSeenByClarity: string | null = null;

    window.history.replaceState(null, "", "/#scene=abc");
    (Clarity.init as jest.Mock).mockImplementationOnce(() => {
      hashSeenByClarity = window.location.hash;
    });

    await startAnalytics();

    expect(hashSeenByClarity).toBe("");
  });
});
