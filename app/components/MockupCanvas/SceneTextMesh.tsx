"use client";

import { Text } from "@react-three/drei";
import { useEffect, useRef } from "react";
import type * as THREE from "three";
import { applyTextStyle } from "./text-style";
import { getTextFontUrl } from "../../lib/text-fonts";
import { toRenderableText, type SceneText } from "../../lib/text-objects";

/**
 * O texto de um objeto da cena, desenhado em SDF pelo troika (via drei): plano,
 * nítido em qualquer escala e sem custo por quadro. O objeto é centrado na
 * própria caixa — como os aparelhos, que giram no centro visual —, então a
 * posição, a rotação e a escala do grupo valem para o bloco inteiro; o
 * `textAlign` só decide como as linhas se alinham dentro dele.
 *
 * Sem luz e sem tone mapping de propósito: a cor escolhida tem de ser a cor
 * vista. Cada propriedade entra por valor primitivo (o R3F compara objetos por
 * referência e reaplicaria tudo a cada render).
 */
/**
 * Sem rede para fonte nenhuma: quando uma letra não está na fonte, o troika
 * buscaria uma de reserva numa CDN (jsDelivr), e o app é 100% cliente.
 * Apontando para um caminho nosso que não existe, não há busca. O conteúdo já
 * chega sem letras fora das fontes (`toRenderableText`), então isso é só a
 * trava: se uma escapar, o texto falha em vez de vazar uma requisição.
 * `unicodeFontsURL` existe no objeto do troika, mas não nos tipos do drei.
 */
const NO_FALLBACK_FONTS = { unicodeFontsURL: "/fonts/no-fallback" } as object;

export function SceneTextMesh({
  isPlaying = false,
  onSync,
  opacity,
  text,
}: {
  /** Tocando, o movimento escreve a cor e o espaço direto no texto. */
  isPlaying?: boolean;
  onSync?: () => void;
  opacity: number;
  text: SceneText;
}) {
  const textRef = useRef<THREE.Object3D>(null);

  // Ao parar o play, o texto volta ao estilo das props: o React só reaplica uma
  // prop quando ela muda, e uma cor animada que termina igual à da prop ficaria
  // com o valor do último quadro do play. É um efeito (depois do commit), então
  // vale também para o estilo que acaba de mudar por causa do playhead.
  useEffect(() => {
    if (!isPlaying && textRef.current) {
      applyTextStyle(textRef.current, {
        color: text.color,
        letterSpacing: text.letterSpacing,
      });
    }
  }, [isPlaying, text.color, text.letterSpacing]);

  return (
    <Text
      ref={textRef}
      anchorX="center"
      anchorY="middle"
      color={text.color}
      fillOpacity={opacity}
      font={getTextFontUrl(text.fontId, text.weight)}
      fontSize={text.fontSize}
      letterSpacing={text.letterSpacing}
      lineHeight={text.lineHeight}
      maxWidth={text.maxWidth ?? undefined}
      onSync={onSync}
      {...NO_FALLBACK_FONTS}
      textAlign={text.align}
      whiteSpace={text.maxWidth === null ? "nowrap" : "normal"}
    >
      {/* Os filhos em texto são o conteúdo; o resto vira o material. */}
      {toRenderableText(text.content)}
      <meshBasicMaterial toneMapped={false} />
    </Text>
  );
}
