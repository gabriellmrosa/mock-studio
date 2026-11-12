// Utility script used during asset preparation to turn the source iPhone Duo
// GLB (by PikkmeStudios, CC BY 4.0, from Sketchfab) into the model the app
// loads. The source scene has four copies of the phone in different poses;
// this keeps the flat, open one and reshapes it for the Duo component:
//
// - the root gets the app's axes: inner screen facing +Z, top at +Y, hinge on
//   the Y axis through the origin (the source is Blender-style, hinge on Z);
// - the two halves and the hinge spine go under a "duo-fold" node, so the
//   component can fold the phone by rotating three nodes;
// - the bendable inner screen (a skinned mesh) and its bones are dropped: the
//   component draws the inner screen itself, as two flat halves;
// - the outer screen's own image is dropped for the same reason;
// - the lens glass loses KHR_materials_transmission, which would cost an
//   extra render pass of the whole scene for a barely visible effect.
//
// No dependencies: it rewrites the GLB's JSON and repacks the binary chunk
// with only what is still referenced.
//
// Usage: node scripts/extract-iphone-duo.mjs <source.glb> [output.glb]
import { readFileSync, writeFileSync } from "node:fs";

const [inputPath, outputPath = "public/models/iphone-duo.glb"] =
  process.argv.slice(2);

if (!inputPath) {
  throw new Error("Usage: node scripts/extract-iphone-duo.mjs <source.glb> [output.glb]");
}

const SOURCE_ROOT = "iphone-duo.001";
const SUFFIX = ".001";
const RENAMES = {
  "iphone-duo": "duo",
  "camera-side": "duo-base",
  "right-side": "duo-cover",
  "middle-block": "duo-hinge",
  screen: "duo-outer-screen",
};
const DROPPED = (name) => name.startsWith("Bone") || name.startsWith("screen-foldable");
const SCREEN_MATERIAL = "screen";
const GLASS_MATERIAL = "glass";

// --- read ------------------------------------------------------------------
const file = readFileSync(inputPath);
const jsonLength = file.readUInt32LE(12);
const source = JSON.parse(file.subarray(20, 20 + jsonLength).toString("utf8"));
const binStart = 20 + jsonLength + 8;
const bin = file.subarray(binStart, binStart + file.readUInt32LE(20 + jsonLength));

const rootIndex = source.nodes.findIndex((node) => node.name === SOURCE_ROOT);

if (rootIndex < 0) {
  throw new Error(`Node not found: ${SOURCE_ROOT}`);
}

// --- remap helpers: copy an entry on first use, reuse it afterwards ---------
function remapper(list, copy) {
  const map = new Map();
  const out = [];

  return {
    out,
    use(index) {
      if (index === undefined) return undefined;

      if (!map.has(index)) {
        map.set(index, out.length);
        out.push(null);
        out[map.get(index)] = copy(structuredClone(list[index]));
      }

      return map.get(index);
    },
  };
}

const chunks = [];
let binLength = 0;

const bufferViews = remapper(source.bufferViews ?? [], (view) => {
  const bytes = bin.subarray(
    view.byteOffset ?? 0,
    (view.byteOffset ?? 0) + view.byteLength,
  );
  const padding = (4 - (binLength % 4)) % 4;

  if (padding) {
    chunks.push(Buffer.alloc(padding));
    binLength += padding;
  }

  chunks.push(bytes);
  view.buffer = 0;
  view.byteOffset = binLength;
  binLength += bytes.length;

  return view;
});
const accessors = remapper(source.accessors ?? [], (accessor) => {
  accessor.bufferView = bufferViews.use(accessor.bufferView);

  return accessor;
});
const samplers = remapper(source.samplers ?? [], (sampler) => sampler);
const images = remapper(source.images ?? [], (image) => {
  image.bufferView = bufferViews.use(image.bufferView);

  return image;
});
const textures = remapper(source.textures ?? [], (texture) => {
  texture.sampler = samplers.use(texture.sampler);
  texture.source = images.use(texture.source);

  return texture;
});

function remapTextureInfo(info) {
  if (info) info.index = textures.use(info.index);
}

const materials = remapper(source.materials ?? [], (material) => {
  const pbr = material.pbrMetallicRoughness;

  remapTextureInfo(pbr?.baseColorTexture);
  remapTextureInfo(pbr?.metallicRoughnessTexture);
  remapTextureInfo(material.normalTexture);
  remapTextureInfo(material.occlusionTexture);
  remapTextureInfo(material.emissiveTexture);

  if (material.name === GLASS_MATERIAL) {
    delete material.extensions?.KHR_materials_transmission;
    if (material.extensions && Object.keys(material.extensions).length === 0) {
      delete material.extensions;
    }
    material.alphaMode = "BLEND";
    material.pbrMetallicRoughness = {
      ...pbr,
      baseColorFactor: [1, 1, 1, 0.12],
    };
  }

  return material;
});

// Each node gets its own copy of the mesh, so dropping a primitive for one
// node can't affect another.
function copyMesh(index, dropScreen) {
  const mesh = structuredClone(source.meshes[index]);

  mesh.primitives = mesh.primitives
    .filter(
      (primitive) =>
        !dropScreen ||
        source.materials[primitive.material]?.name !== SCREEN_MATERIAL,
    )
    .map((primitive) => ({
      ...primitive,
      attributes: Object.fromEntries(
        Object.entries(primitive.attributes)
          // Skinning data belongs to the dropped bones.
          .filter(([key]) => !key.startsWith("JOINTS") && !key.startsWith("WEIGHTS"))
          .map(([key, accessor]) => [key, accessors.use(accessor)]),
      ),
      indices: accessors.use(primitive.indices),
      material: materials.use(primitive.material),
    }));

  meshes.push(mesh);

  return meshes.length - 1;
}

const meshes = [];
const nodes = [];

function cleanName(name) {
  const base = name.endsWith(SUFFIX) ? name.slice(0, -SUFFIX.length) : name;

  return RENAMES[base] ?? base;
}

function copyNode(index) {
  const sourceNode = source.nodes[index];
  const name = cleanName(sourceNode.name ?? `node-${index}`);
  const node = { name };
  const position = nodes.push(node) - 1;

  for (const key of ["translation", "rotation", "scale", "matrix"]) {
    if (sourceNode[key]) node[key] = sourceNode[key];
  }

  if (sourceNode.mesh !== undefined) {
    node.mesh = copyMesh(sourceNode.mesh, name === RENAMES.screen);
  }

  const children = (sourceNode.children ?? [])
    .filter((child) => !DROPPED(source.nodes[child].name ?? ""))
    .map(copyNode);

  if (children.length) node.children = children;

  return position;
}

const root = copyNode(rootIndex);
const fold = nodes.push({ children: nodes[root].children, name: "duo-fold" }) - 1;

// Source axes (per phone): X = thickness, inner screen facing -X; Y = width,
// camera half on +Y when open; Z = height, top at -Z. App axes: screen +Z,
// top +Y, camera half (the base) on +X. As a rotation: X→-Z, Y→+X, Z→-Y,
// which is 120° around (1, 1, -1)/√3.
nodes[root] = {
  children: [fold],
  name: nodes[root].name,
  rotation: [0.5, 0.5, -0.5, 0.5],
};

const extensionsUsed = (source.extensionsUsed ?? []).filter((extension) =>
  JSON.stringify([materials.out, meshes]).includes(`"${extension}"`),
);

const output = {
  asset: {
    ...source.asset,
    copyright: "iPhone Duo 3D Model by PikkmeStudios — CC BY 4.0 — sketchfab.com/stockpikkme",
  },
  ...(extensionsUsed.length ? { extensionsUsed } : {}),
  scene: 0,
  scenes: [{ name: "Scene", nodes: [root] }],
  nodes,
  meshes,
  materials: materials.out,
  ...(textures.out.length ? { textures: textures.out } : {}),
  ...(images.out.length ? { images: images.out } : {}),
  ...(samplers.out.length ? { samplers: samplers.out } : {}),
  accessors: accessors.out,
  bufferViews: bufferViews.out,
  buffers: [{ byteLength: binLength }],
};

// --- write -----------------------------------------------------------------
function pad(buffer, fill) {
  const padding = (4 - (buffer.length % 4)) % 4;

  return padding ? Buffer.concat([buffer, Buffer.alloc(padding, fill)]) : buffer;
}

const jsonChunk = pad(Buffer.from(JSON.stringify(output), "utf8"), 0x20);
const binChunk = pad(Buffer.concat(chunks), 0);
const header = Buffer.alloc(12);
const jsonHeader = Buffer.alloc(8);
const binHeader = Buffer.alloc(8);

header.writeUInt32LE(0x46546c67, 0); // "glTF"
header.writeUInt32LE(2, 4);
header.writeUInt32LE(12 + 8 + jsonChunk.length + 8 + binChunk.length, 8);
jsonHeader.writeUInt32LE(jsonChunk.length, 0);
jsonHeader.writeUInt32LE(0x4e4f534a, 4); // "JSON"
binHeader.writeUInt32LE(binChunk.length, 0);
binHeader.writeUInt32LE(0x004e4942, 4); // "BIN"

writeFileSync(
  outputPath,
  Buffer.concat([header, jsonHeader, jsonChunk, binHeader, binChunk]),
);

console.log(
  `Wrote ${outputPath}: ${nodes.length} nodes, ${meshes.length} meshes, ` +
    `${materials.out.length} materials, ${(binChunk.length / 1e6).toFixed(1)} MB`,
);
