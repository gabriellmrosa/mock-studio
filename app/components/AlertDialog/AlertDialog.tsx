"use client";

import Dialog, { type DialogAction } from "../Dialog/Dialog";

export type AlertDialogAction = DialogAction;

type AlertDialogProps = {
  actions: AlertDialogAction[];
  cancelLabel: string;
  description: string;
  isOpen: boolean;
  onCancel: () => void;
  title: string;
};

/**
 * Confirmação curta que interrompe um fluxo: um Dialog só com texto e ações,
 * como `alertdialog` — o foco vai para a ação principal e clicar fora conta
 * como cancelar, nunca como confirmar.
 */
export default function AlertDialog(props: AlertDialogProps) {
  return <Dialog {...props} role="alertdialog" />;
}
