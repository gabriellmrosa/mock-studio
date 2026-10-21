import { clearSceneLinkFromUrl } from "./scene-link";

/**
 * Microsoft Clarity: mapas de calor e gravações da interface, para entender
 * como o editor é usado. O ID do projeto não é segredo — vai no site de
 * qualquer jeito —, por isso fica aqui, e não numa variável de ambiente.
 */
const CLARITY_PROJECT_ID = "z1bd9medbq";

const CONSENT_KEY = "mock-photo-analytics-consent";

export type AnalyticsConsent = "denied" | "granted";

/**
 * Só o site publicado é medido: `localhost` e os previews sujariam os dados.
 * A Vercel define `NEXT_PUBLIC_VERCEL_ENV` em cada deploy.
 */
export function isAnalyticsAvailable() {
  return process.env.NEXT_PUBLIC_VERCEL_ENV === "production";
}

/** A escolha já feita neste navegador; `null` enquanto a pessoa não escolheu. */
export function readAnalyticsConsent(): AnalyticsConsent | null {
  try {
    const value = window.localStorage.getItem(CONSENT_KEY);

    return value === "granted" || value === "denied" ? value : null;
  } catch {
    return null;
  }
}

export function saveAnalyticsConsent(consent: AnalyticsConsent) {
  try {
    window.localStorage.setItem(CONSENT_KEY, consent);
  } catch {
    // Modo privado ou cota cheia: vale só para esta visita.
  }
}

let isStarted = false;

/**
 * Liga o Clarity — só depois do "Aceitar": antes disso nem o pacote é
 * baixado, então não há cookie nem gravação, e quem recusa nunca carrega
 * nada dele. Uma vez por página.
 */
export async function startAnalytics() {
  if (isStarted) {
    return;
  }

  isStarted = true;
  // O Clarity registra a URL: a cena de um link de projeto não pode ir junto.
  clearSceneLinkFromUrl();

  const { default: Clarity } = await import("@microsoft/clarity");

  Clarity.init(CLARITY_PROJECT_ID);
  // Só medir o uso: nada de cookies de anúncio.
  Clarity.consentV2({ ad_Storage: "denied", analytics_Storage: "granted" });
}
