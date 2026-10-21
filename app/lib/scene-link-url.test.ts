import { clearSceneLinkFromUrl, consumeSceneLinkFromUrl } from "./scene-link";

describe("scene link in the page URL", () => {
  it("is taken out of the URL by whoever looks first, and opened once", () => {
    window.history.replaceState(null, "", "/editor?lang=pt#scene=abc");

    // O analytics olha antes da página: a URL fica limpa...
    clearSceneLinkFromUrl();
    expect(window.location.href).toBe("http://localhost/editor?lang=pt");

    // ...e a página ainda recebe o link, uma vez só.
    expect(consumeSceneLinkFromUrl()).toBe("abc");
    expect(consumeSceneLinkFromUrl()).toBeNull();
  });
});
