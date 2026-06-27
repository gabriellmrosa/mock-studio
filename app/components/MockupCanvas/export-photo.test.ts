import * as THREE from "three";
import {
  exportCanvasPhoto,
  formatTimestampForFilename,
  renderTargetPixelsToBlob,
  dataUrlToBlob,
} from "./export-photo";

describe("export-photo", () => {
  const originalCreateElement = document.createElement.bind(document);

  beforeEach(() => {
    jest
      .spyOn(window, "requestAnimationFrame")
      .mockImplementation((callback: FrameRequestCallback) => {
        callback(0);
        return 1;
      });

    global.URL.createObjectURL = jest.fn(() => "blob:mock-photo");
    global.URL.revokeObjectURL = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("exports a PNG, downloads it and restores render state", async () => {
    const blob = new Blob(["png"], { type: "image/png" });
    const clickSpy = jest
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => {});
    const createdLinks: HTMLAnchorElement[] = [];
    const putImageData = jest.fn();
    const toBlob = jest.fn((callback: (value: Blob | null) => void) => callback(blob));
    const toDataURL = jest.fn();

    jest
      .spyOn(document, "createElement")
      .mockImplementation((tagName: string) => {
        if (tagName === "canvas") {
          return {
            getContext: jest.fn(() => ({
              createImageData: jest.fn((width: number, height: number) => ({
                data: new Uint8ClampedArray(width * height * 4),
                height,
                width,
              })),
              drawImage: jest.fn(),
              putImageData,
            })),
            height: 0,
            toBlob,
            toDataURL,
            width: 0,
          } as unknown as HTMLCanvasElement;
        }

        const element = originalCreateElement(tagName);

        if (tagName === "a") {
          createdLinks.push(element as HTMLAnchorElement);
        }

        return element;
      });

    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#101010");

    const camera = new THREE.PerspectiveCamera(45, 1280 / 720, 0.1, 1000);
    const updateProjectionMatrixSpy = jest.spyOn(camera, "updateProjectionMatrix");
    const gridRef = { current: { visible: true } };
    const previousRenderTarget = new THREE.WebGLRenderTarget(320, 180);
    const gl = {
      capabilities: { isWebGL2: true },
      getClearAlpha: jest.fn(() => 1),
      getClearColor: jest.fn((color: THREE.Color) => color.set("#123456")),
      getRenderTarget: jest.fn(() => previousRenderTarget),
      outputColorSpace: THREE.SRGBColorSpace,
      readRenderTargetPixels: jest.fn(
        (
          _target: THREE.RenderTarget,
          _x: number,
          _y: number,
          width: number,
          height: number,
          buffer: Uint8Array,
        ) => {
          buffer.fill(255, 0, width * height * 4);
        },
      ),
      render: jest.fn(),
      setClearColor: jest.fn(),
      setRenderTarget: jest.fn(),
    } as unknown as Parameters<typeof exportCanvasPhoto>[0]["gl"];

    await exportCanvasPhoto({
      camera,
      gl,
      gridRef,
      preset: {
        height: 1080,
        label: "mock-photo-2026-03-23_12-34-56",
        width: 1920,
      },
      scene,
    });

    expect(gl.setClearColor).toHaveBeenNthCalledWith(1, expect.any(THREE.Color), 0);
    expect(gl.setClearColor).toHaveBeenLastCalledWith(expect.any(THREE.Color), 1);
    expect(gl.setRenderTarget).toHaveBeenNthCalledWith(1, expect.any(THREE.WebGLRenderTarget));
    expect(gl.setRenderTarget).toHaveBeenLastCalledWith(previousRenderTarget);
    expect(gl.readRenderTargetPixels).toHaveBeenCalledTimes(1);
    expect(gl.render).toHaveBeenCalledTimes(2);
    expect(updateProjectionMatrixSpy).toHaveBeenCalledTimes(2);
    expect(gridRef.current?.visible).toBe(true);
    expect(scene.background).toEqual(expect.any(THREE.Color));
    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(createdLinks[0]?.download).toBe("mock-photo-2026-03-23_12-34-56.png");
    expect(global.URL.createObjectURL).toHaveBeenCalledWith(blob);
    expect(global.URL.revokeObjectURL).toHaveBeenCalledWith("blob:mock-photo");
  });

  it("falls back to data URL conversion when canvas toBlob returns null", async () => {
    const clickSpy = jest
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => {});
    const putImageData = jest.fn();
    const toDataURL = jest.fn(() => "data:image/png;base64,cG5n");

    jest
      .spyOn(document, "createElement")
      .mockImplementation((tagName: string) => {
        if (tagName === "canvas") {
          return {
            getContext: jest.fn(() => ({
              createImageData: jest.fn((width: number, height: number) => ({
                data: new Uint8ClampedArray(width * height * 4),
                height,
                width,
              })),
              putImageData,
            })),
            height: 0,
            toBlob: jest.fn((callback: (value: Blob | null) => void) => callback(null)),
            toDataURL,
            width: 0,
          } as unknown as HTMLCanvasElement;
        }

        return originalCreateElement(tagName);
      });

    const blob = await renderTargetPixelsToBlob(new Uint8Array(4), 1, 1);

    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe("image/png");
    expect(blob.size).toBe(3);
    expect(toDataURL).toHaveBeenCalledWith("image/png");
    expect(clickSpy).toHaveBeenCalledTimes(0);
  });

  it("formats the export timestamp for filenames", () => {
    expect(
      formatTimestampForFilename(new Date("2026-03-23T12:34:56")),
    ).toBe("2026-03-23_12-34-56");
  });

  it("converts a PNG data URL into a blob", () => {
    const blob = dataUrlToBlob("data:image/png;base64,cG5n");

    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe("image/png");
  });

  it("flips render target rows before writing to the canvas", async () => {
    const putImageData = jest.fn();

    jest
      .spyOn(document, "createElement")
      .mockImplementation((tagName: string) => {
        if (tagName === "canvas") {
          return {
            getContext: jest.fn(() => ({
              createImageData: jest.fn((width: number, height: number) => ({
                data: new Uint8ClampedArray(width * height * 4),
                height,
                width,
              })),
              putImageData,
            })),
            height: 0,
            toBlob: jest.fn((callback: (value: Blob | null) => void) =>
              callback(new Blob(["png"], { type: "image/png" })),
            ),
            toDataURL: jest.fn(),
            width: 0,
          } as unknown as HTMLCanvasElement;
        }

        return originalCreateElement(tagName);
      });

    await renderTargetPixelsToBlob(
      new Uint8Array([
        1, 2, 3, 4,
        5, 6, 7, 8,
      ]),
      1,
      2,
    );

    const imageData = putImageData.mock.calls[0][0] as {
      data: Uint8ClampedArray;
    };
    expect(Array.from(imageData.data)).toEqual([5, 6, 7, 8, 1, 2, 3, 4]);
  });
});
