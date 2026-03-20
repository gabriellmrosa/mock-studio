import "./EditorPrimitives.css";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type LayersPanelHeaderProps = {
  action?: ReactNode;
  subtitle?: string;
  title: string;
  titleClassName?: string;
};

export function LayersPanelHeader({
  action,
  subtitle,
  title,
  titleClassName,
}: LayersPanelHeaderProps) {
  return (
    <header className="panel-header">
      <div className="flex flex-col w-full">
        <div className="flex min-w-0 justify-between items-center flex-1">
          <h2 className={titleClassName ?? "panel-title"}>{title}</h2>
          {action ? <div className="shrink-0">{action}</div> : null}
        </div>
        {subtitle ? <p className="panel-subtitle">{subtitle}</p> : null}
      </div>
    </header>
  );
}

type InspectorPanelHeaderProps = {
  eyebrow?: string;
  title: string;
  titleClassName?: string;
};

export function InspectorPanelHeader({
  eyebrow,
  title,
  titleClassName,
}: InspectorPanelHeaderProps) {
  return (
    <header className="panel-header gap-4 flex-col items-start">
      {eyebrow ? <p className="panel-eyebrow">{eyebrow}</p> : null}
      <h2 className={titleClassName ?? "panel-title"}>{title}</h2>
    </header>
  );
}

type PanelSectionProps = {
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  title: string;
};

export function PanelSection({
  action,
  children,
  className,
  title,
}: PanelSectionProps) {
  return (
    <section className={`panel-section ${className ?? ""}`.trim()}>
      <div className="panel-section-header">
        <p className="editor-sidebar-label">{title}</p>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      {children}
    </section>
  );
}

type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  active?: boolean;
  children: ReactNode;
};

export function IconButton({
  active = false,
  children,
  className = "",
  type = "button",
  ...props
}: IconButtonProps) {
  return (
    <button
      type={type}
      className={`editor-icon-button ${active ? "editor-icon-button-active" : ""} ${className}`.trim()}
      {...props}
    >
      {children}
    </button>
  );
}
