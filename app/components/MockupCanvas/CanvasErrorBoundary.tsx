"use client";

import "./CanvasErrorBoundary.css";
import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle } from "lucide-react";

type CanvasRecoveryCardProps = {
  body: string;
  onPrimaryAction: () => void;
  onReloadPage: () => void;
  primaryLabel: string;
  reloadPageLabel: string;
  title: string;
};

/**
 * Cartão centralizado sobre o palco quando o WebGL cai ou o render 3D falha.
 * Fica restrito à área do canvas para que os painéis laterais continuem
 * acessíveis (por exemplo, para salvar a cena como template).
 */
export function CanvasRecoveryCard({
  body,
  onPrimaryAction,
  onReloadPage,
  primaryLabel,
  reloadPageLabel,
  title,
}: CanvasRecoveryCardProps) {
  return (
    <div className="canvas-recovery-backdrop" role="alert">
      <div className="canvas-recovery-card">
        <div className="canvas-recovery-header">
          <AlertTriangle
            size={18}
            className="canvas-recovery-icon"
            aria-hidden="true"
          />
          <h2 className="canvas-recovery-title">{title}</h2>
        </div>
        <p className="canvas-recovery-body">{body}</p>
        <div className="canvas-recovery-actions">
          <button
            type="button"
            className="canvas-recovery-button canvas-recovery-button-secondary"
            onClick={onReloadPage}
          >
            {reloadPageLabel}
          </button>
          <button
            type="button"
            className="canvas-recovery-button canvas-recovery-button-primary"
            onClick={onPrimaryAction}
          >
            {primaryLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

type CanvasErrorBoundaryProps = {
  body: string;
  children: ReactNode;
  onReloadPage?: () => void;
  onRetry: () => void;
  reloadPageLabel: string;
  retryLabel: string;
  title: string;
};

type CanvasErrorBoundaryState = {
  hasError: boolean;
};

/**
 * Impede que um erro de runtime dentro do visualizador 3D (Three.js, shaders,
 * fontes ou modelos) derrube a página inteira em tela branca.
 */
export class CanvasErrorBoundary extends Component<
  CanvasErrorBoundaryProps,
  CanvasErrorBoundaryState
> {
  state: CanvasErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): CanvasErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Erro no visualizador 3D:", error, info);
  }

  private handleRetry = () => {
    this.setState({ hasError: false });
    this.props.onRetry();
  };

  private handleReloadPage = () => {
    if (this.props.onReloadPage) {
      this.props.onReloadPage();
      return;
    }

    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <CanvasRecoveryCard
          body={this.props.body}
          onPrimaryAction={this.handleRetry}
          onReloadPage={this.handleReloadPage}
          primaryLabel={this.props.retryLabel}
          reloadPageLabel={this.props.reloadPageLabel}
          title={this.props.title}
        />
      );
    }

    return this.props.children;
  }
}
