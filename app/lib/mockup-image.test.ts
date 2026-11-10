import { probeImageFile } from "./mockup-image";

/**
 * O jsdom não decodifica imagens nem cria blob URLs: o `<img>` é trocado por
 * um que decodifica ou falha conforme o teste, com o tamanho que ele pedir.
 */
function mockImage(result: "decodes" | "fails", size = { height: 10, width: 10 }) {
  const revoke = jest.fn();

  URL.createObjectURL = jest.fn(() => "blob:test");
  URL.revokeObjectURL = revoke;
  global.Image = class {
    naturalHeight = size.height;
    naturalWidth = size.width;
    src = "";
    decode() {
      return result === "decodes"
        ? Promise.resolve()
        : Promise.reject(new DOMException("EncodingError"));
    }
  } as unknown as typeof Image;

  return { revoke };
}

const file = new File(["x"], "photo.heic", { type: "image/heic" });

describe("probeImageFile", () => {
  const OriginalImage = global.Image;

  afterEach(() => {
    global.Image = OriginalImage;
  });

  it("accepts an image the browser decodes", async () => {
    const { revoke } = mockImage("decodes");

    await expect(probeImageFile(file)).resolves.toBeUndefined();
    expect(revoke).toHaveBeenCalledWith("blob:test");
  });

  it("rejects an image the browser can't decode, like HEIC in Chrome", async () => {
    const { revoke } = mockImage("fails");

    await expect(probeImageFile(file)).rejects.toThrow();
    expect(revoke).toHaveBeenCalledWith("blob:test");
  });

  it("rejects an image that decodes with no size", async () => {
    mockImage("decodes", { height: 0, width: 0 });

    await expect(probeImageFile(file)).rejects.toThrow();
  });
});
