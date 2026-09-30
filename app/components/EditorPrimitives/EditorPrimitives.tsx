import "./EditorPrimitives.css";
import type {
  ButtonHTMLAttributes,
  KeyboardEvent as ReactKeyboardEvent,
  ReactNode,
} from "react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, X } from "lucide-react";

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

export type SubTabItem<T extends string> = {
  icon: ReactNode;
  id: T;
  label: string;
};

type SubTabsProps<T extends string> = {
  ariaLabel: string;
  /** Prefixo dos ids, para ligar cada aba ao painel que ela abre. */
  idPrefix: string;
  items: SubTabItem<T>[];
  /** `null` quando nenhuma está aberta. */
  onChange: (id: T | null) => void;
  value: T | null;
};

/**
 * Sub-abas de uma seção do painel de propriedades: os grupos de sub-opções de
 * uma configuração (ex.: Ajuste e Corte da tela). Substituíram o checkbox que
 * abria mais opções abaixo dele.
 *
 * Nascem todas fechadas — a seção mostra só o essencial até o usuário pedir
 * um grupo. Por isso não são abas no sentido ARIA (que sempre têm uma
 * selecionada): cada uma é um botão que expande o painel (`aria-expanded`), e
 * clicar na aberta a fecha. O teclado segue o de abas: setas e Home/End
 * movem o foco entre elas.
 */
export function SubTabs<T extends string>({
  ariaLabel,
  idPrefix,
  items,
  onChange,
  value,
}: SubTabsProps<T>) {
  const listRef = useRef<HTMLDivElement>(null);

  function handleKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    const buttons = [
      ...(listRef.current?.querySelectorAll<HTMLButtonElement>("button") ?? []),
    ];
    const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
    const last = buttons.length - 1;
    const next =
      event.key === "ArrowRight"
        ? (index + 1) % buttons.length
        : event.key === "ArrowLeft"
          ? (index - 1 + buttons.length) % buttons.length
          : event.key === "Home"
            ? 0
            : event.key === "End"
              ? last
              : null;

    if (next === null || index < 0) {
      return;
    }

    event.preventDefault();
    buttons[next]?.focus();
  }

  return (
    <div
      ref={listRef}
      role="group"
      aria-label={ariaLabel}
      className="editor-subtabs"
      onKeyDown={handleKeyDown}
    >
      {items.map((item) => {
        const isActive = item.id === value;

        return (
          <button
            key={item.id}
            type="button"
            id={`${idPrefix}-tab-${item.id}`}
            aria-expanded={isActive}
            aria-controls={isActive ? `${idPrefix}-panel` : undefined}
            className={`editor-subtab${isActive ? " is-active" : ""}`}
            onClick={() => onChange(isActive ? null : item.id)}
          >
            <span className="editor-subtab-label">{item.label}</span>
            <span className="editor-subtab-icon" aria-hidden>
              {item.icon}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/** Conteúdo da sub-aba aberta, ligado ao botão que o abriu. */
export function SubTabPanel({
  activeId,
  children,
  idPrefix,
}: {
  activeId: string;
  children: ReactNode;
  idPrefix: string;
}) {
  return (
    <div
      role="region"
      id={`${idPrefix}-panel`}
      aria-labelledby={`${idPrefix}-tab-${activeId}`}
      className="editor-subtab-panel"
    >
      {children}
    </div>
  );
}

/**
 * Caixa de seleção para uma ação extra que acompanha outra (ex.: "salvar como
 * template" ao exportar). Diferente do `Switch`, que liga um estado do objeto,
 * aqui a marcação só diz "faça também isto". Input nativo — teclado, leitor de
 * tela e o clique no texto vêm de graça —, pintado com a cor do tema.
 */
export function Checkbox({
  checked,
  label,
  onChange,
}: {
  checked: boolean;
  label: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="editor-checkbox-row">
      <input
        type="checkbox"
        className="editor-checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span className="editor-checkbox-label">{label}</span>
    </label>
  );
}

/**
 * Liga/desliga de uma opção (ex.: corpo do aparelho, acabamento fosco).
 * Substituiu o checkbox: o estado fica visível à distância e o controle segue
 * o padrão de mercado para "ativo/inativo". Um botão com `role="switch"`,
 * dentro de um `<label>` — clicar no texto também alterna e o texto é o nome
 * acessível.
 */
export function Switch({
  checked,
  label,
  onChange,
}: {
  checked: boolean;
  label: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="editor-switch-row">
      <span className="editor-switch-label">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        className={`editor-switch${checked ? " is-checked" : ""}`}
        onClick={() => onChange(!checked)}
      >
        <span className="editor-switch-thumb" aria-hidden />
      </button>
    </label>
  );
}

/**
 * Controle segmentado: um trilho de largura total com opções exclusivas, sempre
 * uma selecionada (ex.: Imagem | Vídeo; Ajuste | Corte no painel de
 * opções da tela). Diferente das SubTabs, que podem ficar todas fechadas —
 * aqui a escolha é obrigatória, então são abas de verdade (`role="tab"`).
 *
 * Teclado de abas: setas e Home/End selecionam, e só a ativa entra no Tab.
 * Com `idPrefix`, cada aba aponta para o `SegmentedTabPanel` correspondente;
 * sem ele, a escolha troca conteúdo fora do controle (ex.: o card de upload).
 */
export function SegmentedTabs<T extends string>({
  ariaLabel,
  idPrefix,
  items,
  onChange,
  value,
}: {
  ariaLabel: string;
  idPrefix?: string;
  items: SubTabItem<T>[];
  onChange: (id: T) => void;
  value: T;
}) {
  const listRef = useRef<HTMLDivElement>(null);

  function handleKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    const index = items.findIndex((item) => item.id === value);
    const next =
      event.key === "ArrowRight"
        ? (index + 1) % items.length
        : event.key === "ArrowLeft"
          ? (index - 1 + items.length) % items.length
          : event.key === "Home"
            ? 0
            : event.key === "End"
              ? items.length - 1
              : null;

    if (next === null) {
      return;
    }

    event.preventDefault();
    onChange(items[next].id);
    listRef.current
      ?.querySelectorAll<HTMLButtonElement>("[role='tab']")
      [next]?.focus();
  }

  return (
    <div
      ref={listRef}
      role="tablist"
      aria-label={ariaLabel}
      className="editor-segmented"
      onKeyDown={handleKeyDown}
    >
      {items.map((item) => {
        const isActive = item.id === value;

        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            id={idPrefix ? `${idPrefix}-tab-${item.id}` : undefined}
            aria-selected={isActive}
            aria-controls={idPrefix ? `${idPrefix}-panel` : undefined}
            tabIndex={isActive ? 0 : -1}
            className={`editor-segmented-tab${isActive ? " is-active" : ""}`}
            onClick={() => onChange(item.id)}
          >
            <span className="editor-segmented-icon" aria-hidden>
              {item.icon}
            </span>
            {item.label}
          </button>
        );
      })}
    </div>
  );
}

/** Conteúdo da aba selecionada de um `SegmentedTabs`. */
export function SegmentedTabPanel({
  activeId,
  children,
  idPrefix,
}: {
  activeId: string;
  children: ReactNode;
  idPrefix: string;
}) {
  return (
    <div
      role="tabpanel"
      id={`${idPrefix}-panel`}
      aria-labelledby={`${idPrefix}-tab-${activeId}`}
      className="editor-subtab-panel"
    >
      {children}
    </div>
  );
}

/** Distância entre o popover, a borda do painel lateral e a da janela. */
const SIDE_POPOVER_GAP = 12;

/**
 * Painel flutuante de configurações, aberto a partir de um item do painel
 * lateral e posicionado à esquerda dele, sobre o canvas, alinhado ao item —
 * o painel lateral continua visível e o efeito aparece na cena ao lado.
 *
 * Vai para um portal (o painel lateral rola e recortaria o popover) e
 * acompanha a rolagem e o redimensionamento. Fecha com Esc, clique fora ou o
 * botão de fechar, e devolve o foco a quem o abriu.
 */
export function SidePopover({
  anchorRef,
  children,
  closeLabel,
  onClose,
  title,
}: {
  anchorRef: { current: HTMLElement | null };
  children: ReactNode;
  closeLabel: string;
  onClose: () => void;
  title: string;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  // Posição calculada fora do React: segue a rolagem sem re-renderizar.
  useLayoutEffect(() => {
    const panel = panelRef.current;
    const anchor = anchorRef.current;

    if (!panel || !anchor) {
      return;
    }

    function place() {
      if (!panel || !anchor) {
        return;
      }

      const anchorRect = anchor.getBoundingClientRect();
      const sidebar = anchor.closest("aside") ?? anchor;
      const sidebarLeft = sidebar.getBoundingClientRect().left;
      // Área útil sem a barra de rolagem: é nela que o `position: fixed`
      // mede — o window.innerWidth a inclui e roubava o espaçamento.
      const { clientHeight, clientWidth } = document.documentElement;
      const maxTop = clientHeight - panel.offsetHeight - SIDE_POPOVER_GAP;

      panel.style.right = `${clientWidth - sidebarLeft + SIDE_POPOVER_GAP}px`;
      panel.style.top = `${Math.max(
        SIDE_POPOVER_GAP,
        Math.min(anchorRect.top, maxTop),
      )}px`;
    }

    place();

    // A altura muda ao trocar de sub-aba; a posição precisa acompanhar.
    const observer = new ResizeObserver(place);

    observer.observe(panel);
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [anchorRef]);

  useEffect(() => {
    const anchor = anchorRef.current;

    panelRef.current?.focus();

    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node;

      if (
        panelRef.current?.contains(target) ||
        anchorRef.current?.contains(target)
      ) {
        return;
      }

      onCloseRef.current();
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onCloseRef.current();
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
      // Devolve o foco ao botão que abriu, se ele ainda existir.
      anchor
        ?.querySelector<HTMLElement>("[aria-haspopup='dialog']")
        ?.focus();
    };
  }, [anchorRef]);

  return createPortal(
    <div
      ref={panelRef}
      role="dialog"
      aria-label={title}
      tabIndex={-1}
      className="side-popover"
    >
      <div className="side-popover-header">
        <span className="editor-sidebar-label">{title}</span>
        <IconButton
          aria-label={closeLabel}
          title={closeLabel}
          className="editor-icon-button-no-hover-bg"
          onClick={onClose}
        >
          <X size={14} />
        </IconButton>
      </div>
      {children}
    </div>,
    document.body,
  );
}
