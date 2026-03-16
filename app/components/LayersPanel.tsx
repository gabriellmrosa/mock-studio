"use client";

import type { AppCopy, Locale, UiTheme } from "../lib/i18n";
import type { SceneObject } from "../lib/scene-objects";
import { DEVICE_MODELS } from "../models/device-models";
import { PlusIcon, TrashIcon } from "./Icons";
import ToggleSwitch from "./toggleSwitch";

type LayersPanelProps = {
  copy: AppCopy;
  locale: Locale;
  objects: SceneObject[];
  onAddObject: () => void;
  onLocaleChange: (locale: Locale) => void;
  onRemoveObject: (id: string) => void;
  onSelectObject: (id: string) => void;
  onUiThemeChange: (theme: UiTheme) => void;
  selectedObjectId: string;
  uiTheme: UiTheme;
};

export default function LayersPanel({
  copy,
  locale,
  objects,
  onAddObject,
  onLocaleChange,
  onRemoveObject,
  onSelectObject,
  onUiThemeChange,
  selectedObjectId,
  uiTheme,
}: LayersPanelProps) {
  return (
    <aside className="editor-sidebar layers-sidebar w-[280px] h-screen flex flex-col shrink-0">
      <div className="px-5 py-4 border-b border-[var(--sidebar-border)]">
        <h1 className="text-sm font-semibold tracking-[0.22em] uppercase">
          {copy.appTitle}
        </h1>
        <p className="editor-sidebar-muted text-xs mt-1">{copy.appSubtitle}</p>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-5">
        <div className="flex items-center justify-between mb-3">
          <p className="editor-sidebar-label">{copy.layersSectionTitle}</p>
          <button
            className="editor-button editor-button-compact inline-flex items-center gap-2 px-2.5 py-1.5 text-[11px]"
            onClick={onAddObject}
          >
            <PlusIcon className="h-3.5 w-3.5" />
            {copy.addObject}
          </button>
        </div>

        <div className="flex flex-col gap-1">
          {objects.map((object) => {
            const model = DEVICE_MODELS[object.modelId];
            const isSelected = object.id === selectedObjectId;

            return (
              <button
                key={object.id}
                onClick={() => onSelectObject(object.id)}
                className={`layer-card ${isSelected ? "layer-card-active" : "layer-card-inactive"}`}
              >
                <div className="flex-1 min-w-0 text-left">
                  <div className="flex items-center gap-2">
                    <p className="text-[13px] font-medium truncate">
                      {object.name}
                    </p>
                    {!object.deletable ? (
                      <span className="layer-badge">{copy.baseObject}</span>
                    ) : null}
                  </div>
                  <p className="text-[11px] mt-1 opacity-70 truncate">
                    {model.name}
                  </p>
                </div>
                {object.deletable ? (
                  <button
                    type="button"
                    className="layer-delete"
                    aria-label={copy.deleteObject}
                    title={copy.deleteObject}
                    onClick={(event) => {
                      event.stopPropagation();
                      onRemoveObject(object.id);
                    }}
                  >
                    <TrashIcon className="h-3.5 w-3.5" />
                  </button>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      <div className="px-5 py-4 border-t border-[var(--sidebar-border)]">
        <div className="flex gap-3">
          <ToggleSwitch
            ariaLabel={copy.themeLabel}
            value={uiTheme}
            onChange={onUiThemeChange}
            options={[
              {
                value: "dark",
                label: copy.darkMode,
                iconAlt: copy.darkMode,
                iconSrc: "/icons/moon-and-stars.png",
              },
              {
                value: "light",
                label: copy.lightMode,
                iconAlt: copy.lightMode,
                iconSrc: "/icons/sun.png",
              },
            ]}
          />

          <ToggleSwitch
            ariaLabel={copy.languageLabel}
            value={locale}
            onChange={onLocaleChange}
            options={[
              {
                value: "pt-BR",
                label: copy.portuguese,
                iconAlt: copy.portuguese,
                iconClassName: "toggle-switch-icon-flag",
                iconSrc: "/icons/brazil-flag.png",
              },
              {
                value: "en-US",
                label: copy.english,
                iconAlt: copy.english,
                iconClassName: "toggle-switch-icon-flag",
                iconSrc: "/icons/eua-flag.png",
              },
            ]}
          />
        </div>

        <p className="editor-sidebar-muted mt-3 text-[10px] text-center tracking-[0.08em] uppercase">
          Made with love by Gabriel Rosa
        </p>
      </div>
    </aside>
  );
}
