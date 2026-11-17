"use client";

import { useEffect, useMemo, useState } from "react";
import * as THREE from "three";
import {
  IMAGE_OUTLINE_MARGIN,
  getImageSize,
  type SceneImage,
} from "../../lib/image-objects";
import { MAX_TEXTURE_SIZE } from "../../lib/mockup-image";

/**
 * A imagem de um objeto da cena: um plano de frente para a câmera, sem luz e
 * sem tone mapping — a cor do arquivo tem de ser a cor vista, como no texto. O
 * PNG e o SVG chegam com o canal alfa, então o plano é transparente e não
 * escreve profundidade (a ordem de desenho dos objetos é de `orderObjectGroups`).
 * Cada propriedade entra por valor primitivo, porque o R3F compara objetos por
 * referência.
 *
 * Sem arquivo (ou se ele não carregar), o plano é o espaço vazio: um círculo
 * branco e sólido que convida ao upload, na proporção que a imagem tinha. Ele é
 * marcado `editorOnly` e não sai na exportação.
 *
 * Com contorno, a textura ganha uma margem em volta da arte, onde ficam o
 * contorno branco e a sombra de adesivo; o plano cresce na mesma proporção, e a
 * arte continua no tamanho de sempre.
 */

const EMPTY_LONG_SIDE = 512;
/** O contorno de um sticker vai em 1280 px: são 64 cópias da silhueta. */
const OUTLINE_LONG_SIDE = 1280;
const OUTLINE_STEPS = 64;
/** Espessura do contorno, em fração do lado maior da arte. */
const OUTLINE_THICKNESS = 0.03;

// Cores fixas porque se desenha dentro da cena 3D, não na interface (como o
// placeholder das telas, `placeholder-image.ts`).
const EMPTY_FILL = "#ffffff";
const EMPTY_TEXT = "#5c5651";
const EMPTY_ICON = "#7f7972";
const FONT_FAMILY = '"Helvetica Neue", Helvetica, Arial, sans-serif';

function makeCanvas(width: number, height: number) {
  const canvas = document.createElement("canvas");

  canvas.width = Math.max(1, Math.round(width));
  canvas.height = Math.max(1, Math.round(height));

  return canvas;
}

/**
 * Quebra o texto em linhas que cabem na largura, sem partir palavras. Em duas
 * linhas, a quebra é a que as deixa mais parecidas ("Envie seu / PNG ou SVG"),
 * não a que enche a primeira e deixa uma palavra sozinha na segunda.
 */
function wrapText(
  context: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
) {
  const words = text.split(/\s+/).filter(Boolean);

  if (context.measureText(words.join(" ")).width <= maxWidth) {
    return [words.join(" ")];
  }

  let best: string[] | null = null;
  let bestWidth = Infinity;

  for (let cut = 1; cut < words.length; cut += 1) {
    const pair = [words.slice(0, cut).join(" "), words.slice(cut).join(" ")];
    const widest = Math.max(...pair.map((line) => context.measureText(line).width));

    if (widest <= maxWidth && widest < bestWidth) {
      best = pair;
      bestWidth = widest;
    }
  }

  if (best) {
    return best;
  }

  const lines: string[] = [];
  let line = "";

  for (const word of words) {
    const next = line ? `${line} ${word}` : word;

    if (line && context.measureText(next).width > maxWidth) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }

  return line ? [...lines, line] : lines;
}

/** O ícone de upload: uma seta para cima saindo de uma bandeja. */
function drawUploadIcon(
  context: CanvasRenderingContext2D,
  cx: number,
  top: number,
  size: number,
) {
  const left = cx - size / 2;

  context.strokeStyle = EMPTY_ICON;
  context.lineWidth = size * 0.1;
  context.lineCap = "round";
  context.lineJoin = "round";
  context.beginPath();
  context.moveTo(cx, top + size * 0.62);
  context.lineTo(cx, top + size * 0.06);
  context.moveTo(cx - size * 0.24, top + size * 0.3);
  context.lineTo(cx, top + size * 0.06);
  context.lineTo(cx + size * 0.24, top + size * 0.3);
  context.moveTo(left + size * 0.08, top + size * 0.56);
  context.lineTo(left + size * 0.08, top + size * 0.84);
  context.quadraticCurveTo(left + size * 0.08, top + size * 0.94, left + size * 0.18, top + size * 0.94);
  context.lineTo(left + size * 0.82, top + size * 0.94);
  context.quadraticCurveTo(left + size * 0.92, top + size * 0.94, left + size * 0.92, top + size * 0.84);
  context.lineTo(left + size * 0.92, top + size * 0.56);
  context.stroke();
}

/**
 * O espaço vazio: um círculo branco sólido (uma pílula, quando a proporção não
 * é 1:1 — o círculo é o caso quadrado), com sombra suave, o ícone de upload e o
 * convite escrito. Sem transparência: nada da cena aparece através dele.
 */
function drawEmptyState(aspect: number, label: string): HTMLCanvasElement {
  const width = aspect >= 1 ? EMPTY_LONG_SIDE : EMPTY_LONG_SIDE * aspect;
  const height = aspect >= 1 ? EMPTY_LONG_SIDE / aspect : EMPTY_LONG_SIDE;
  const margin = EMPTY_LONG_SIDE * IMAGE_OUTLINE_MARGIN;
  const canvas = makeCanvas(width + margin * 2, height + margin * 2);
  const context = canvas.getContext("2d");

  if (!context) {
    return canvas;
  }

  const radius = Math.min(width, height) / 2;

  context.shadowColor = "rgb(0 0 0 / 0.3)";
  context.shadowBlur = margin * 0.55;
  context.shadowOffsetY = margin * 0.18;
  context.fillStyle = EMPTY_FILL;
  context.beginPath();
  context.roundRect(margin, margin, width, height, radius);
  context.fill();
  context.shadowColor = "transparent";

  // O conteúdo cabe no que sobra do círculo: um quadrado inscrito.
  const box = Math.min(width, height) * 0.72;
  const fontSize = box * 0.105;

  context.font = `600 ${fontSize}px ${FONT_FAMILY}`;
  context.fillStyle = EMPTY_TEXT;
  context.textAlign = "center";
  context.textBaseline = "top";

  const lines = wrapText(context, label, box);
  const lineHeight = fontSize * 1.25;
  const iconSize = box * 0.3;
  const gap = fontSize * 0.7;
  const contentHeight = iconSize + gap + lines.length * lineHeight;
  const cx = margin + width / 2;
  let y = margin + (height - contentHeight) / 2;

  drawUploadIcon(context, cx, y, iconSize);
  y += iconSize + gap;

  lines.forEach((line, index) => {
    context.fillText(line, cx, y + index * lineHeight);
  });

  return canvas;
}

/**
 * Contorno branco e sombra de adesivo em volta da arte: a silhueta da arte
 * (alfa, pintada de branco) é espalhada em círculo para engrossar, e é essa
 * forma que recebe a sombra; a arte vai por cima.
 */
function drawOutlined(art: HTMLCanvasElement, margin: number) {
  const canvas = makeCanvas(art.width + margin * 2, art.height + margin * 2);
  const context = canvas.getContext("2d");

  if (!context) {
    return canvas;
  }

  const silhouette = makeCanvas(art.width, art.height);
  const silhouetteContext = silhouette.getContext("2d");

  if (!silhouetteContext) {
    return canvas;
  }

  silhouetteContext.drawImage(art, 0, 0);
  silhouetteContext.globalCompositeOperation = "source-in";
  silhouetteContext.fillStyle = "#ffffff";
  silhouetteContext.fillRect(0, 0, art.width, art.height);

  const thick = makeCanvas(canvas.width, canvas.height);
  const thickContext = thick.getContext("2d");
  const reach = Math.max(art.width, art.height) * OUTLINE_THICKNESS;

  if (!thickContext) {
    return canvas;
  }

  for (let step = 0; step < OUTLINE_STEPS; step += 1) {
    const angle = (step / OUTLINE_STEPS) * Math.PI * 2;

    thickContext.drawImage(
      silhouette,
      margin + Math.cos(angle) * reach,
      margin + Math.sin(angle) * reach,
    );
  }

  // Uma só passada com sombra: por cópia, ela se somaria e escureceria.
  context.shadowColor = "rgb(0 0 0 / 0.3)";
  context.shadowBlur = margin * 0.55;
  context.shadowOffsetY = margin * 0.18;
  context.drawImage(thick, 0, 0);
  context.shadowColor = "transparent";
  context.drawImage(art, margin, margin);

  return canvas;
}

/**
 * A textura do arquivo. O PNG vai no tamanho dele (reduzido se passar do
 * máximo da textura); o SVG, que não tem tamanho de pixel, é desenhado no
 * máximo, para não borrar ao ampliar.
 */
async function loadImageTexture(image: SceneImage) {
  if (!image.url) {
    throw new Error("Sem arquivo.");
  }

  const element = new Image();

  element.src = image.url;
  await element.decode();

  const naturalLong = Math.max(element.naturalWidth, element.naturalHeight);
  const longSide = image.outline
    ? OUTLINE_LONG_SIDE
    : image.isVector
      ? MAX_TEXTURE_SIZE
      : Math.min(MAX_TEXTURE_SIZE, naturalLong);
  const art = makeCanvas(
    image.aspect >= 1 ? longSide : longSide * image.aspect,
    image.aspect >= 1 ? longSide / image.aspect : longSide,
  );

  art.getContext("2d")?.drawImage(element, 0, 0, art.width, art.height);

  const source = image.outline
    ? drawOutlined(art, Math.round(longSide * IMAGE_OUTLINE_MARGIN))
    : art;
  const texture = new THREE.CanvasTexture(source);

  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;

  return texture;
}

type Loaded =
  | { status: "ready"; texture: THREE.Texture; url: string }
  | { status: "error"; url: string };

export function SceneImageMesh({
  emptyLabel,
  image,
  opacity,
}: {
  /** O convite escrito no espaço vazio, no idioma da interface. */
  emptyLabel: string;
  image: SceneImage;
  opacity: number;
}) {
  const { aspect, isVector, outline, url } = image;
  const [loaded, setLoaded] = useState<Loaded | null>(null);

  useEffect(() => {
    if (!url) {
      return undefined;
    }

    let cancelled = false;
    let created: THREE.Texture | null = null;

    loadImageTexture({ ...image, aspect, isVector, outline, url })
      .then((texture) => {
        if (cancelled) {
          texture.dispose();

          return;
        }

        created = texture;
        setLoaded({ status: "ready", texture, url });
      })
      .catch(() => {
        if (!cancelled) {
          setLoaded({ status: "error", url });
        }
      });

    return () => {
      cancelled = true;
      created?.dispose();
    };
    // `image` só entra pelos campos que mudam a textura, listados abaixo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aspect, isVector, outline, url]);

  const empty = useMemo(() => {
    if (typeof document === "undefined") {
      return null;
    }

    const texture = new THREE.CanvasTexture(drawEmptyState(aspect, emptyLabel));

    texture.colorSpace = THREE.SRGBColorSpace;

    return texture;
  }, [aspect, emptyLabel]);

  useEffect(() => () => empty?.dispose(), [empty]);

  const current = url && loaded?.url === url ? loaded : null;
  // Com arquivo e ainda carregando, não há o que mostrar: nem o espaço vazio,
  // que piscaria por cima de uma imagem que está para aparecer.
  const isLoading = Boolean(url) && !current;
  const isReady = current?.status === "ready";
  const map = isReady ? current.texture : empty;
  const [width, height] = getImageSize(aspect);
  // A margem do contorno e da sombra, na mesma proporção da textura.
  const hasMargin = !isReady || outline;
  const margin = hasMargin ? Math.max(width, height) * IMAGE_OUTLINE_MARGIN : 0;

  return (
    <mesh userData-editorOnly={!isReady} visible={!isLoading}>
      <planeGeometry args={[width + margin * 2, height + margin * 2]} />
      <meshBasicMaterial
        depthWrite={false}
        map={map}
        opacity={opacity}
        side={THREE.DoubleSide}
        toneMapped={false}
        transparent
      />
    </mesh>
  );
}
