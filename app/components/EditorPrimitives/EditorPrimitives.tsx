import "./EditorPrimitives.css";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { useLayoutEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";

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
    <header className="panel-header panel-header-inspector">
      {eyebrow ? <p className="panel-eyebrow">{eyebrow}</p> : null}
      <h2 className={titleClassName ?? "panel-title"}>{title}</h2>
    </header>
  );
}

type PanelSectionProps = {
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  // Quando colapsável, o próprio cabeçalho vira o gatilho e o corpo só é
  // montado aberto — nada de esconder com CSS, para o conteúdo não entrar na
  // ordem de tabulação enquanto está fechado.
  collapsible?: boolean;
  isOpen?: boolean;
  onToggleOpen?: () => void;
  title: string;
};

export function PanelSection({
  action,
  children,
  className,
  collapsible = false,
  isOpen = true,
  onToggleOpen,
  title,
}: PanelSectionProps) {
  const sectionClassName = `panel-section ${className ?? ""}`.trim();

  if (collapsible) {
    return (
      <CollapsiblePanelSection
        className={sectionClassName}
        isOpen={isOpen}
        onToggleOpen={onToggleOpen}
        title={title}
      >
        {children}
      </CollapsiblePanelSection>
    );
  }

  return (
    <section className={sectionClassName}>
      <div className="panel-section-header">
        <p className="editor-sidebar-label">{title}</p>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      {children}
    </section>
  );
}

/* Abre e fecha animando a altura de um contêiner que só recorta: o miolo é
   absoluto, então mantém o layout natural e não reflui durante a transição.
   As duas alturas são medidas do DOM — fechada é a do cabeçalho, aberta é a do
   miolo inteiro — para não depender de nenhuma constante chutada. */
function CollapsiblePanelSection({
  children,
  className,
  isOpen,
  onToggleOpen,
  title,
}: {
  children: ReactNode;
  className: string;
  isOpen: boolean;
  onToggleOpen?: () => void;
  title: string;
}) {
  const innerRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLButtonElement>(null);
  const [heights, setHeights] = useState({ full: 0, header: 0 });

  // useLayoutEffect para medir antes da pintura: com useEffect a seção
  // apareceria aberta por um quadro antes de assumir a altura fechada.
  useLayoutEffect(() => {
    const inner = innerRef.current;
    const header = headerRef.current;

    if (!inner || !header) {
      return;
    }

    const observer = new ResizeObserver(() => {
      const full = inner.offsetHeight;
      const headerHeight = header.offsetHeight;

      // Devolver o mesmo objeto quando nada mudou evita re-render em loop.
      setHeights((current) =>
        current.full === full && current.header === headerHeight
          ? current
          : { full, header: headerHeight },
      );
    });

    observer.observe(inner);
    observer.observe(header);

    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <section className={className}>
      <div
        className="panel-section-collapse"
        style={
          heights.header
            ? { height: isOpen ? heights.full : heights.header }
            : undefined
        }
      >
        <div className="panel-section-collapse-inner" ref={innerRef}>
          <button
            ref={headerRef}
            type="button"
            className="panel-section-header panel-section-toggle"
            aria-expanded={isOpen}
            onClick={onToggleOpen}
          >
            <span className="editor-sidebar-label">{title}</span>
            <ChevronDown
              size={14}
              aria-hidden
              className={`panel-section-chevron${isOpen ? " is-open" : ""}`}
            />
          </button>
          <div
            className={`panel-section-collapse-body${isOpen ? " is-open" : ""}`}
          >
            {children}
          </div>
        </div>
      </div>
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
