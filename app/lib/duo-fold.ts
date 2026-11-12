/**
 * A dobra do Duo, um dobrável tipo livro: de frente, com a tela de dentro
 * aberta, a metade da esquerda é a capa (leva a tela de fora nas costas) e a
 * da direita é a base (leva as câmeras). A base fica parada; a capa gira em
 * torno da dobradiça e fecha por cima dela, vindo para a frente — fechado, é
 * a tela de fora que fica virada para quem olha.
 *
 * Fechado, o aparelho ocupa só o lado da base. Para ele continuar girando e
 * alinhando pelo centro visual, o conjunto desliza de volta para o meio à
 * medida que fecha — suave, para a abertura animada não dar um tranco.
 */
export type DuoFoldPose = {
  /** Giro da capa em torno da dobradiça, em radianos: 0 aberta, π fechada. */
  coverRotation: number;
  /** Quanto o conjunto desliza para manter o centro visual no pivô. */
  shiftX: number;
  shiftZ: number;
};

/**
 * `foldAngle` em graus: 180 aberto, 0 fechado. `halfWidth` é a largura de uma
 * metade e `hingeZ` a profundidade do eixo da dobradiça, nas unidades do
 * modelo.
 */
export function getDuoFoldPose(
  foldAngle: number,
  halfWidth: number,
  hingeZ: number,
): DuoFoldPose {
  const clamped = Math.min(180, Math.max(0, foldAngle));
  const coverRotation = ((180 - clamped) * Math.PI) / 180;
  // 0 aberto, 1 fechado, sem quina no meio do caminho.
  const closed = (1 - Math.cos(coverRotation)) / 2;

  return {
    coverRotation,
    shiftX: (-halfWidth / 2) * closed,
    shiftZ: -hingeZ * closed,
  };
}
