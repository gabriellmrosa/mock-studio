"use client";

import "./LayersPanel.css";
import { KeyboardEvent, useEffect, useState } from "react";
import type { AppCopy, Locale, UiTheme } from "../../lib/i18n";
import type { SceneObject } from "../../lib/scene-objects";
import type { SceneTemplate } from "../../lib/scene-templates";
import {
  IconButton,
  LayersPanelHeader,
  PanelSection,
} from "../EditorPrimitives/EditorPrimitives";
import { Bookmark, Eye, EyeOff, Github, MoreVertical, Plus } from "lucide-react";
import ContextMenu from "../ContextMenu/ContextMenu";
import CreditsModal from "../CreditsModal/CreditsModal";

const REPOSITORY_URL = "https://github.com/gabriellmrosa/mockup-studio";

type LayersPanelProps = {
  appMeta: string;
  copy: AppCopy;
  locale: Locale;
  objects: SceneObject[];
  onAddObject: () => void;
  onApplyTemplate?: (id: string) => void;
  onFitObject?: (id: string) => void;
  onRestoreTemplateView?: (id: string) => void;
  onDuplicateObject: (id: string) => void;
  onLocaleChange: (locale: Locale) => void;
  onRemoveTemplate?: (id: string) => void;
  onRenameObject: (id: string, name: string) => void;
  onRenameTemplate?: (id: string, name: string) => void;
  onRemoveObject: (id: string) => void;
  onSaveTemplate?: () => void;
  onSelectObject: (id: string) => void;
  onToggleObjectVisibility: (id: string) => void;
  onUiThemeChange: (theme: UiTheme) => void;
  selectedObjectId: string;
  templates?: SceneTemplate[];
  /** Texto do estado vazio; muda com o modo, já que cada um tem sua lista. */
  templatesEmptyHint?: string;
  uiTheme: UiTheme;
};

const TEMPLATES_OPEN_KEY = "mock-photo-templates-open";

export default function LayersPanel({
  appMeta,
  copy,
  locale,
  objects,
  onAddObject,
  onApplyTemplate,
  onFitObject,
  onRestoreTemplateView,
  onDuplicateObject,
  onLocaleChange,
  onRemoveTemplate,
  onRenameObject,
  onRenameTemplate,
  onRemoveObject,
  onSaveTemplate,
  onSelectObject,
  onToggleObjectVisibility,
  onUiThemeChange,
  selectedObjectId,
  templates = [],
  templatesEmptyHint,
  uiTheme,
}: LayersPanelProps) {
  const [editingObjectId, setEditingObjectId] = useState<string | null>(null);

  // Começa fechado e só então adota a escolha salva do usuário. Ler o
  // localStorage no inicializador do useState (como faz o FloatingCanvasControls,
  // que não é renderizado no servidor) quebraria a hidratação aqui: o servidor
  // emitiria aria-expanded="false" e o cliente "true".
  const [isTemplatesOpen, setIsTemplatesOpen] = useState(false);

  useEffect(() => {
    // Sincronizar com um sistema externo no mount é justamente o uso previsto
    // para effects; a regra abaixo mira cascatas de render, que não é o caso.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsTemplatesOpen(window.localStorage.getItem(TEMPLATES_OPEN_KEY) === "1");
  }, []);

  function toggleTemplatesOpen() {
    setIsTemplatesOpen((current) => {
      const next = !current;
      window.localStorage.setItem(TEMPLATES_OPEN_KEY, next ? "1" : "0");
      return next;
    });
  }
  const [draftName, setDraftName] = useState("");
  const [isCreditsOpen, setIsCreditsOpen] = useState(false);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(
    null,
  );
  const [templateDraftName, setTemplateDraftName] = useState("");

  function startEditingTemplate(template: SceneTemplate) {
    setEditingTemplateId(template.id);
    setTemplateDraftName(template.name);
  }

  function commitEditingTemplate(template: SceneTemplate) {
    onRenameTemplate?.(template.id, templateDraftName.trim() || template.name);
    setEditingTemplateId(null);
    setTemplateDraftName("");
  }

  function startEditing(object: SceneObject) {
    setEditingObjectId(object.id);
    setDraftName(object.name);
  }

  function commitEditing(object: SceneObject) {
    const normalizedName = draftName.trim();

    onRenameObject(object.id, normalizedName || object.name);
    setEditingObjectId(null);
    setDraftName("");
  }

  function cancelEditing() {
    setEditingObjectId(null);
    setDraftName("");
  }

  function handleNameInputKeyDown(
    event: KeyboardEvent<HTMLInputElement>,
    object: SceneObject,
  ) {
    if (event.key === "Enter") {
      commitEditing(object);
      return;
    }

    if (event.key === "Escape") {
      cancelEditing();
    }
  }

  return (
    <aside className="editor-sidebar editor-sidebar-shell layers-sidebar">
      <CreditsModal
        isOpen={isCreditsOpen}
        copy={copy}
        onClose={() => setIsCreditsOpen(false)}
      />

      <div className="layers-shell">
        <div className="relative">
          <LayersPanelHeader
            title={copy.appTitle}
            subtitle={appMeta}
            titleClassName="panel-title panel-title-brand"
            action={
              <ContextMenu
                items={[
                  {
                    type: "submenu",
                    label: copy.themeLabel,
                    options: [
                      {
                        label: copy.darkMode,
                        value: "dark",
                        checked: uiTheme === "dark",
                        onClick: () => onUiThemeChange("dark"),
                      },
                      {
                        label: copy.lightMode,
                        value: "light",
                        checked: uiTheme === "light",
                        onClick: () => onUiThemeChange("light"),
                      },
                    ],
                  },
                  {
                    type: "submenu",
                    label: copy.languageLabel,
                    options: [
                      {
                        label: copy.portuguese,
                        value: "pt-BR",
                        checked: locale === "pt-BR",
                        onClick: () => onLocaleChange("pt-BR"),
                      },
                      {
                        label: copy.english,
                        value: "en-US",
                        checked: locale === "en-US",
                        onClick: () => onLocaleChange("en-US"),
                      },
                    ],
                  },
                ]}
                triggerAriaLabel={copy.preferencesLabel}
                triggerClassName="context-menu-trigger-quiet editor-icon-button-no-hover-bg"
                triggerTitle={copy.preferencesLabel}
                triggerIcon={<MoreVertical size={12} />}
              />
            }
          />
        </div>

        <div className="layers-body">
          <div className="layers-body-top">
          <PanelSection
            title={copy.layersSectionTitle}
            className="section-objects"
            action={
              <button
                className="editor-section-action"
                onClick={onAddObject}
                aria-label={copy.addObject}
                title={copy.addObject}
              >
                <Plus size={16} />
              </button>
            }
          >
            <div className="layers-stack">
              {objects.map((object) => {
                const isSelected = object.id === selectedObjectId;
                return (
                  <div
                    key={object.id}
                    onClick={() => onSelectObject(object.id)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        onSelectObject(object.id);
                      }
                    }}
                    className={`layer-card ${isSelected ? "layer-card-active" : "layer-card-inactive"}`}
                    role="button"
                    tabIndex={0}
                    aria-pressed={isSelected}
                  >
                    <div className="layer-card-main">
                      <div className="layer-title-row">
                        {editingObjectId === object.id ? (
                          <input
                            autoFocus
                            type="text"
                            value={draftName}
                            onBlur={() => commitEditing(object)}
                            onChange={(event) =>
                              setDraftName(event.target.value)
                            }
                            onClick={(event) => event.stopPropagation()}
                            onDoubleClick={(event) => event.stopPropagation()}
                            onKeyDown={(event) =>
                              handleNameInputKeyDown(event, object)
                            }
                            className="editor-input layer-card-name-input"
                          />
                        ) : (
                          <p
                            className="layer-card-title"
                            onDoubleClick={(event) => {
                              event.stopPropagation();
                              startEditing(object);
                            }}
                          >
                            {object.name}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="layer-actions">
                      <IconButton
                        aria-label={
                          object.isVisible ? copy.hideObject : copy.showObject
                        }
                        title={
                          object.isVisible ? copy.hideObject : copy.showObject
                        }
                        className="layer-inline-action editor-icon-button-no-hover-bg"
                        active={!object.isVisible}
                        onClick={(event) => {
                          event.stopPropagation();
                          onToggleObjectVisibility(object.id);
                        }}
                      >
                        {object.isVisible ? (
                          <Eye size={14} />
                        ) : (
                          <EyeOff size={14} />
                        )}
                      </IconButton>
                      <ContextMenu
                        items={[
                          {
                            type: "action",
                            label: copy.fitObjectButton,
                            onClick: () => onFitObject?.(object.id),
                          },
                          {
                            type: "action",
                            label: copy.duplicateObject,
                            onClick: () => onDuplicateObject(object.id),
                          },
                          {
                            type: "action",
                            label: copy.renameObject,
                            onClick: () => startEditing(object),
                          },
                          ...(object.deletable
                            ? [
                                {
                                  type: "action" as const,
                                  label: copy.deleteObject,
                                  variant: "danger" as const,
                                  onClick: () => onRemoveObject(object.id),
                                },
                              ]
                            : []),
                        ]}
                        triggerAriaLabel={copy.objectOptionsLabel}
                        triggerClassName="layer-menu-trigger context-menu-trigger-quiet editor-icon-button-no-hover-bg"
                        triggerStopPropagation
                        triggerTitle={copy.objectOptionsLabel}
                        triggerIcon={<MoreVertical size={12} />}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </PanelSection>
          </div>

          <PanelSection
              title={copy.templatesSectionTitle}
              className={`layers-templates-dock${isTemplatesOpen ? " is-open" : ""}`}
              collapsible
              isOpen={isTemplatesOpen}
              onToggleOpen={toggleTemplatesOpen}
            >
              <div className="templates-dock-body">
              {templates.length === 0 ? (
                <p className="editor-sidebar-muted templates-empty-hint">
                  {templatesEmptyHint ?? copy.templatesEmptyHint}
                </p>
              ) : null}
              <div className="layers-stack">
                {templates.map((template) => (
                  <div
                    key={template.id}
                    onClick={() => onApplyTemplate?.(template.id)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        onApplyTemplate?.(template.id);
                      }
                    }}
                    className="layer-card layer-card-inactive"
                    role="button"
                    tabIndex={0}
                  >
                    <div className="layer-card-main">
                      <div className="layer-title-row">
                        {editingTemplateId === template.id ? (
                          <input
                            autoFocus
                            type="text"
                            value={templateDraftName}
                            onBlur={() => commitEditingTemplate(template)}
                            onChange={(event) =>
                              setTemplateDraftName(event.target.value)
                            }
                            onClick={(event) => event.stopPropagation()}
                            onDoubleClick={(event) => event.stopPropagation()}
                            onKeyDown={(event) => {
                              if (event.key === "Enter") {
                                commitEditingTemplate(template);
                                return;
                              }

                              if (event.key === "Escape") {
                                setEditingTemplateId(null);
                                setTemplateDraftName("");
                              }
                            }}
                            className="editor-input layer-card-name-input"
                          />
                        ) : (
                          <p
                            className="layer-card-title"
                            onDoubleClick={(event) => {
                              event.stopPropagation();
                              startEditingTemplate(template);
                            }}
                          >
                            {template.name}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="layer-actions">
                      <ContextMenu
                        items={[
                          {
                            type: "action",
                            label: copy.renameObject,
                            onClick: () => startEditingTemplate(template),
                          },
                          ...(template.camera
                            ? [
                                {
                                  type: "action" as const,
                                  label: copy.restoreTemplateView,
                                  onClick: () =>
                                    onRestoreTemplateView?.(template.id),
                                },
                              ]
                            : []),
                          {
                            type: "action",
                            label: copy.deleteObject,
                            variant: "danger",
                            onClick: () => onRemoveTemplate?.(template.id),
                          },
                        ]}
                        triggerAriaLabel={copy.templateOptionsLabel}
                        triggerClassName="layer-menu-trigger context-menu-trigger-quiet editor-icon-button-no-hover-bg"
                        triggerStopPropagation
                        triggerTitle={copy.templateOptionsLabel}
                        triggerIcon={<MoreVertical size={12} />}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <button
                type="button"
                className="editor-button-outline templates-save-button"
                onClick={onSaveTemplate}
                title={copy.saveTemplate}
              >
                <Bookmark size={14} />
                {copy.saveTemplate}
              </button>
              </div>
            </PanelSection>
        </div>

        <footer className="sidebar-footer">
          <div className="sidebar-footer-row">
            <p>Made with </p>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="9"
              height="9"
              fill="none"
              aria-hidden="true"
              focusable="false"
            >
              <path
                fill="var(--sidebar-muted)"
                stroke="var(--sidebar-muted)"
                strokeWidth=".264"
                d="m4.215 8.386-.018-.008-.013-.01-.024-.02-.032-.034-.111-.116-.39-.414A417 417 0 0 1 1.272 5.24l-.4-.44-.121-.133-.06-.07v-.001a2.9 2.9 0 0 1-.55-1.513L.133 2.85c.003-.47.129-.952.355-1.37l.122-.205A3.2 3.2 0 0 1 1.04.78l.15-.129A2.44 2.44 0 0 1 3.82.414h.001c.15.079.336.202.445.296l.066-.048c.182-.14.508-.32.707-.39.185-.064.39-.107.594-.127.189-.018.248-.017.446.001h.001c.614.06 1.177.35 1.608.828.312.347.519.741.635 1.21l.044.205c.02.11.029.306.029.492a3 3 0 0 1-.029.491v.001a3 3 0 0 1-.452 1.134c-.012.016-.037.045-.062.074l-.123.137-.409.45a371 371 0 0 1-2.406 2.603l-.397.423-.15.155-.014.012-.027.019c-.001 0-.027.015-.062.016a.2.2 0 0 1-.05-.01Zm1.532-2.44c.505-.543.906-.977 1.188-1.285l.33-.365.132-.153c.161-.23.29-.539.352-.858a2.4 2.4 0 0 0 .03-.388 2.4 2.4 0 0 0-.022-.385 2.4 2.4 0 0 0-.359-.892 2.1 2.1 0 0 0-.612-.574L6.688.99a2.1 2.1 0 0 0-.625-.198l-.12-.004q-.081 0-.183.005c-.133.007-.257.02-.312.032l-.13.035a2 2 0 0 0-.816.504l-.138.14-.09.094-.095-.09-.036-.035-.152-.149-.087-.082A1.85 1.85 0 0 0 2.032.904C1.097 1.27.563 2.35.818 3.408c.067.276.175.517.33.736l.002.004.008.01q.01.013.028.032l.094.109q.121.136.335.369c.284.31.685.745 1.18 1.278l1.476 1.588z"
              />
            </svg>{" "}
            <p>
              by{" "}
              <a
                href="https://www.garosa.com.br/"
                target="_blank"
                rel="noopener noreferrer"
                className="sidebar-footer-link"
              >
                Gabriel Rosa
              </a>
            </p>
            <span className="sidebar-footer-separator" aria-hidden="true">
              ·
            </span>
            <a
              href={REPOSITORY_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="sidebar-footer-icon-link"
              aria-label="View source on GitHub"
              title="View source on GitHub"
            >
              <Github size={12} aria-hidden="true" />
            </a>
          </div>

          <p>
            <button
              type="button"
              className="sidebar-footer-link"
              onClick={() => setIsCreditsOpen(true)}
              aria-label={copy.creditsLabel}
            >
              {copy.creditsLabel}
            </button>{" "}
            {copy.creditsDescription}
          </p>
        </footer>
      </div>
    </aside>
  );
}
