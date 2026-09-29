"use client";

import * as THREE from "three";
import { HDR_TO_SDR_GLSL, type HdrTransfer } from "./hdr-video";

/**
 * Composição da tela: uma passada que desenha o conteúdo final numa textura no
 * formato da tela, e é essa textura que o material do modelo usa. Tudo o que
 * mexe no conteúdo acontece aqui, num lugar só, sem tocar nos seis modelos:
 * - enquadramento (recorte "cover", corte das bordas, zoom, posição);
 * - fundo, onde o conteúdo não cobre (zoom abaixo de 100%);
 * - conversão de vídeo HDR para SDR.
 *
 * Imagens são recompostas só quando algo muda; vídeos, a cada quadro.
 */

export type ScreenLayout = {
  contentMax: readonly [number, number];
  contentMin: readonly [number, number];
  offset: readonly [number, number];
  repeat: readonly [number, number];
};

/** Maior lado da textura composta — o mesmo teto das imagens enviadas. */
const MAX_SIZE = 2048;

const VERTEX_SHADER = /* glsl */ `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

const FRAGMENT_SHADER = /* glsl */ `
  uniform sampler2D map;
  // 0 = SDR já linear (o amostrador decodificou), 1 = PQ, 2 = HLG,
  // 3 = SDR em sRGB a decodificar aqui (vídeo).
  uniform int transferMode;
  uniform vec2 uvOffset;
  uniform vec2 uvRepeat;
  uniform vec2 contentMin;
  uniform vec2 contentMax;
  uniform vec3 background;
  varying vec2 vUv;

  ${HDR_TO_SDR_GLSL}

  vec3 srgbToLinear(vec3 color) {
    return mix(
      pow(color * 0.9478672986 + 0.0521327014, vec3(2.4)),
      color * 0.0773993808,
      vec3(lessThanEqual(color, vec3(0.04045)))
    );
  }

  void main() {
    vec2 sourceUv = uvOffset + vUv * uvRepeat;
    bool inside =
      all(greaterThanEqual(sourceUv, contentMin)) &&
      all(lessThanEqual(sourceUv, contentMax));
    vec3 color = background;

    if (inside) {
      vec3 texel = texture2D(map, sourceUv).rgb;

      if (transferMode == 0) {
        color = texel;
      } else if (transferMode == 3) {
        color = srgbToLinear(texel);
      } else {
        color = hdrToSdrLinear(texel, transferMode);
      }
    }

    // Sai linear: o alvo é sRGB e a GPU codifica na escrita.
    gl_FragColor = vec4(color, 1.0);
  }
`;

/**
 * Como o shader deve ler a fonte. Imagem em sRGB vira linear no próprio
 * amostrador (formato sRGB de hardware). Vídeo não: o three nunca dá esse
 * formato a texturas de vídeo e decodifica no shader do material
 * (DECODE_VIDEO_TEXTURE) — que aqui é o nosso. Sem o modo 3 o vídeo SDR saía
 * codificado duas vezes, lavado (#1D4ED8 virava #5F94ED).
 */
export function getTransferMode(
  source: THREE.Texture,
  transfer: HdrTransfer | null,
) {
  if (transfer === "pq") return 1;
  if (transfer === "hlg") return 2;

  const isSrgbVideo =
    (source as THREE.VideoTexture).isVideoTexture === true &&
    source.colorSpace === THREE.SRGBColorSpace;

  return isSrgbVideo ? 3 : 0;
}

export function createScreenCompositor(screenWidth: number, screenHeight: number) {
  const aspect = screenWidth / screenHeight;
  const width = aspect >= 1 ? MAX_SIZE : Math.round(MAX_SIZE * aspect);
  const height = aspect >= 1 ? Math.round(MAX_SIZE / aspect) : MAX_SIZE;
  // sRGB de 8 bits: guarda cor já exibível com a precisão onde o olho nota, e
  // gera mipmaps — sem eles a tela cintila quando o aparelho fica pequeno.
  const target = new THREE.WebGLRenderTarget(width, height, {
    colorSpace: THREE.SRGBColorSpace,
    depthBuffer: false,
    generateMipmaps: true,
    magFilter: THREE.LinearFilter,
    minFilter: THREE.LinearMipmapLinearFilter,
  });

  target.texture.anisotropy = 16;
  target.texture.wrapS = THREE.ClampToEdgeWrapping;
  target.texture.wrapT = THREE.ClampToEdgeWrapping;

  const uniforms = {
    background: { value: new THREE.Color("#ffffff") },
    contentMax: { value: new THREE.Vector2(1, 1) },
    contentMin: { value: new THREE.Vector2(0, 0) },
    map: { value: null as THREE.Texture | null },
    transferMode: { value: 0 },
    uvOffset: { value: new THREE.Vector2(0, 0) },
    uvRepeat: { value: new THREE.Vector2(1, 1) },
  };
  const material = new THREE.ShaderMaterial({
    depthTest: false,
    depthWrite: false,
    fragmentShader: FRAGMENT_SHADER,
    uniforms,
    vertexShader: VERTEX_SHADER,
  });
  const geometry = new THREE.PlaneGeometry(2, 2);
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  scene.add(new THREE.Mesh(geometry, material));

  return {
    render(
      renderer: THREE.WebGLRenderer,
      {
        background,
        layout,
        source,
        transfer,
      }: {
        background: string;
        layout: ScreenLayout;
        source: THREE.Texture;
        transfer: HdrTransfer | null;
      },
    ) {
      uniforms.map.value = source;
      uniforms.transferMode.value = getTransferMode(source, transfer);
      // THREE.Color converte o hex (sRGB) para linear, como o shader espera.
      uniforms.background.value.set(background);
      uniforms.uvOffset.value.set(layout.offset[0], layout.offset[1]);
      uniforms.uvRepeat.value.set(layout.repeat[0], layout.repeat[1]);
      uniforms.contentMin.value.set(layout.contentMin[0], layout.contentMin[1]);
      uniforms.contentMax.value.set(layout.contentMax[0], layout.contentMax[1]);

      const previous = renderer.getRenderTarget();

      renderer.setRenderTarget(target);
      renderer.render(scene, camera);
      renderer.setRenderTarget(previous);
    },
    texture: target.texture,
    dispose() {
      target.dispose();
      material.dispose();
      geometry.dispose();
    },
  };
}

export type ScreenCompositor = ReturnType<typeof createScreenCompositor>;
