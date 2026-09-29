import * as THREE from "three";
import { getTransferMode } from "./screen-compositor";

function videoTexture(colorSpace: string) {
  const texture = new THREE.Texture() as THREE.Texture & {
    isVideoTexture: boolean;
  };

  texture.isVideoTexture = true;
  texture.colorSpace = colorSpace;

  return texture;
}

describe("getTransferMode", () => {
  it("leaves sRGB images to the hardware decoder", () => {
    const image = new THREE.Texture();

    image.colorSpace = THREE.SRGBColorSpace;

    expect(getTransferMode(image, null)).toBe(0);
  });

  it("decodes SDR video in the shader, since three never gives video an sRGB format", () => {
    expect(getTransferMode(videoTexture(THREE.SRGBColorSpace), null)).toBe(3);
  });

  it("reads HDR video raw and converts it by its curve", () => {
    const raw = videoTexture(THREE.NoColorSpace);

    expect(getTransferMode(raw, "pq")).toBe(1);
    expect(getTransferMode(raw, "hlg")).toBe(2);
  });
});
