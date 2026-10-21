"use client";

import "../Dialog/Dialog.css";
import "./AnalyticsConsent.css";
import { useEffect, useState, useSyncExternalStore } from "react";
import type { AppCopy } from "../../lib/i18n";
import {
  isAnalyticsAvailable,
  readAnalyticsConsent,
  saveAnalyticsConsent,
  startAnalytics,
  type AnalyticsConsent as Consent,
} from "../../lib/analytics";

/** A escolha guardada não muda por fora desta aba enquanto ela está aberta. */
function subscribe() {
  return () => undefined;
}

/** Fora do site publicado não há o que perguntar: `"off"`. */
function readStoredConsent() {
  return isAnalyticsAvailable() ? readAnalyticsConsent() : "off";
}

/**
 * Pede consentimento para o analytics na primeira visita e liga o Clarity só
 * depois do "Aceitar". Um cartão discreto no canto, que não bloqueia o
 * editor: dá para usar tudo sem responder, e nada é gravado enquanto isso.
 */
export default function AnalyticsConsent({ copy }: { copy: AppCopy }) {
  // No servidor (`undefined`) ainda não se sabe da escolha: o cartão só
  // aparece no navegador, e não pisca para quem já respondeu.
  const stored = useSyncExternalStore(subscribe, readStoredConsent, () => undefined);
  const [choice, setChoice] = useState<Consent | null>(null);
  const consent = choice ?? stored;

  useEffect(() => {
    if (consent === "granted") {
      void startAnalytics();
    }
  }, [consent]);

  function choose(next: Consent) {
    saveAnalyticsConsent(next);
    setChoice(next);
  }

  if (consent !== null) {
    return null;
  }

  return (
    <section
      className="analytics-consent"
      role="region"
      aria-labelledby="analytics-consent-title"
    >
      <h2 id="analytics-consent-title" className="analytics-consent-title">
        {copy.analyticsConsentTitle}
      </h2>
      <p className="analytics-consent-text">{copy.analyticsConsentText}</p>
      <div className="analytics-consent-actions">
        <button
          type="button"
          className="dialog-button dialog-button-ghost"
          onClick={() => choose("denied")}
        >
          {copy.analyticsConsentDecline}
        </button>
        <button
          type="button"
          className="dialog-button dialog-button-primary"
          onClick={() => choose("granted")}
        >
          {copy.analyticsConsentAccept}
        </button>
      </div>
    </section>
  );
}
