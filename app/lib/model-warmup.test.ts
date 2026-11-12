import { WARMUP_MODEL_URLS, warmUpModels } from "./model-warmup";

describe("warmUpModels", () => {
  it("fetches the other models one at a time, and only once", async () => {
    let inFlight = 0;
    let maxInFlight = 0;
    const fetched: string[] = [];

    global.fetch = jest.fn(async (url: RequestInfo | URL) => {
      inFlight += 1;
      maxInFlight = Math.max(maxInFlight, inFlight);
      fetched.push(String(url));
      await Promise.resolve();
      inFlight -= 1;

      return { arrayBuffer: async () => new ArrayBuffer(0) } as Response;
    }) as jest.Mock;
    // O jsdom não tem requestIdleCallback: o código cai no setTimeout.
    jest.useFakeTimers();

    warmUpModels();
    warmUpModels();

    for (let i = 0; i < WARMUP_MODEL_URLS.length + 1; i += 1) {
      await jest.advanceTimersByTimeAsync(2000);
    }

    jest.useRealTimers();

    expect(fetched).toEqual([...WARMUP_MODEL_URLS]);
    expect(maxInFlight).toBe(1);
  });
});
