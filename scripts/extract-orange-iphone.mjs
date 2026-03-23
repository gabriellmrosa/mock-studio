// Utility script used during asset preparation to isolate the cropped orange
// iPhone node from the source GLB and write the derived model used by the app.
import { NodeIO } from "@gltf-transform/core";
import { center, prune } from "@gltf-transform/functions";

const INPUT_PATH = "public/models/apple_iphone_14_pro_pack_free.glb";
const OUTPUT_PATH = "public/models/apple_iphone_14_pro_orange.glb";
const TARGET_NODE_NAME = "Iphone 13 pro_0";

const io = new NodeIO();
const document = await io.read(INPUT_PATH);
const root = document.getRoot();
const scene = root.listScenes()[0];

if (!scene) {
  throw new Error("Scene principal nao encontrada no GLB.");
}

const nodes = root.listNodes();
const targetNode = nodes.find((node) => node.getName() === TARGET_NODE_NAME);

if (!targetNode) {
  throw new Error(`Node alvo nao encontrado: ${TARGET_NODE_NAME}`);
}

const parentNode = targetNode.getParentNode();

if (!parentNode) {
  throw new Error(`Node alvo sem parent: ${TARGET_NODE_NAME}`);
}

parentNode.removeChild(targetNode);

for (const child of [...scene.listChildren()]) {
  scene.removeChild(child);
}

scene.addChild(targetNode);

await document.transform(prune(), center());
await io.write(OUTPUT_PATH, document);

console.log(`Arquivo gerado em ${OUTPUT_PATH}`);
