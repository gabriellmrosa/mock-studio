import * as THREE from "three";

export type CornerRadii = [
  topLeft: number,
  topRight: number,
  bottomRight: number,
  bottomLeft: number,
];

/**
 * Retângulo centrado na origem, com um raio por canto (0 = canto vivo), em
 * arcos de círculo de verdade. Uma curva quadrática que "arredonda" o canto
 * parece um arco, mas fica mais quadrada: no meio do canto ela está a 1/4 do
 * raio da quina, e o círculo a 0,293 dele. Na tela de fora isso era visível —
 * ela avançava sobre o anel preto do arquivo, que tem espessura constante, e
 * o anel afinava nos cantos (a 38% da espessura das retas, numa captura).
 */
export function getRoundedShape(width: number, height: number, radii: CornerRadii) {
  const [tl, tr, br, bl] = radii;
  const x = width / 2;
  const y = height / 2;
  const shape = new THREE.Shape();
  const half = Math.PI / 2;

  shape.moveTo(-x, y - tl);
  shape.lineTo(-x, bl - y);
  if (bl > 0) shape.absarc(bl - x, bl - y, bl, Math.PI, Math.PI + half, false);
  shape.lineTo(x - br, -y);
  if (br > 0) shape.absarc(x - br, br - y, br, Math.PI + half, 2 * Math.PI, false);
  shape.lineTo(x, y - tr);
  if (tr > 0) shape.absarc(x - tr, y - tr, tr, 0, half, false);
  shape.lineTo(tl - x, y);
  if (tl > 0) shape.absarc(tl - x, y - tl, tl, half, Math.PI, false);
  shape.closePath();

  return shape;
}
