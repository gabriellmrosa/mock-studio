import { isSafari } from "./browser";

const AGENTS = {
  chrome:
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36",
  edge:
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0",
  firefox:
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:143.0) Gecko/20100101 Firefox/143.0",
  safari:
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Safari/605.1.15",
};

describe("isSafari", () => {
  it("recognizes Safari", () => {
    expect(isSafari(AGENTS.safari)).toBe(true);
  });

  it("doesn't mistake the browsers that also say Safari", () => {
    expect(isSafari(AGENTS.chrome)).toBe(false);
    expect(isSafari(AGENTS.edge)).toBe(false);
    expect(isSafari(AGENTS.firefox)).toBe(false);
  });
});
