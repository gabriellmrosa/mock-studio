// Utility script used during asset preparation to inspect/export key textures
// from the original iPhone GLB into tmp/ for local analysis.
import fs from "node:fs/promises";
import path from "node:path";
import { NodeIO } from "@gltf-transform/core";

const INPUT_PATH = "public/models/apple_iphone_14_pro_pack_free.glb";
const OUTPUT_DIR = "tmp/iphone-textures";
const MATERIAL_NAMES = ["Display", "Material.002", "Wallpaper", "Wallpaper.001"];

const document = await new NodeIO().read(INPUT_PATH);
const root = document.getRoot();

await fs.mkdir(OUTPUT_DIR, { recursive: true });

for (const material of root.listMaterials()) {
  if (!MATERIAL_NAMES.includes(material.getName())) {
    continue;
  }

  const entries = [
    ["baseColor", material.getBaseColorTexture()],
    ["emissive", material.getEmissiveTexture()],
  ];

  for (const [slot, texture] of entries) {
    if (!texture) {
      continue;
    }

    const image = texture.getImage();
    if (!image) {
      continue;
    }

    const extension =
      texture.getMimeType() === "image/png"
        ? "png"
        : texture.getMimeType() === "image/jpeg"
          ? "jpg"
          : "bin";

    const fileName = `${material.getName().replaceAll(/[^a-z0-9.-]+/gi, "_")}_${slot}.${extension}`;
    await fs.writeFile(path.join(OUTPUT_DIR, fileName), image);
    console.log(fileName);
  }
}
