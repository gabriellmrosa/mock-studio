import type { DeviceModelDefinition } from "../models/device-models";

export function buildNextDeviceColors({
  currentColors,
  hex,
  model,
  part,
}: {
  currentColors: Record<string, string>;
  hex: string;
  model: DeviceModelDefinition;
  part: string;
}) {
  if (currentColors[part] === hex) {
    return currentColors;
  }

  const primaryColorKey = model.primaryColorKey;
  const isPrimaryColorUpdate = Boolean(primaryColorKey && part === primaryColorKey);

  if (!isPrimaryColorUpdate) {
    return {
      ...currentColors,
      [part]: hex,
    };
  }

  const nextThemeColors = model.buildColorsFromPrimary(hex);

  return {
    ...nextThemeColors,
    ...Object.fromEntries(
      model.customizableColorKeys.map((key) => [
        key,
        key === part ? hex : (currentColors[key] ?? nextThemeColors[key]),
      ]),
    ),
  };
}

/**
 * Se o objeto tem alguma parte pintada à mão: compara as cores dele com as do
 * tema escolhido. Sem isso, o nome do tema continuaria na tela depois de uma
 * edição, e a cor mostrada não seria a dele.
 */
export function isCustomDeviceTheme(
  model: DeviceModelDefinition,
  deviceTheme: string,
  colors: Record<string, string>,
) {
  const theme = model.themes[deviceTheme];

  return !theme || model.customizableColorKeys.some((key) => colors[key] !== theme[key]);
}
