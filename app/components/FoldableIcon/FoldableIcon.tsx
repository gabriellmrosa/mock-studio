import { createLucideIcon } from "lucide-react";

/**
 * Um celular dobrável aberto: a tela deitada, a dobradiça no meio e o furo
 * da câmera no canto. O lucide não tem um ícone assim (só `fold-horizontal`,
 * que são setas, e `columns-2`, que é um layout); este é desenhado na mesma
 * grade de 24 px e no mesmo traço dos outros, e por isso nasce de
 * `createLucideIcon`: aceita `size`, `strokeWidth` e `className` como eles.
 *
 * O Material Symbols tem o `devices_fold`, mas é de outra família — traço e
 * cantos diferentes — e destoaria ao lado do `Smartphone` e do `Tablet`.
 */
export const FoldableIcon = createLucideIcon("foldable", [
  ["rect", { width: "20", height: "14", x: "2", y: "5", rx: "3", key: "body" }],
  ["path", { d: "M12 5v14", key: "hinge" }],
  ["path", { d: "M17 9h.01", key: "camera" }],
]);
