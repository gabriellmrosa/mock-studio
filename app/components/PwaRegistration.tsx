"use client";

import { useEffect } from "react";

const SERVICE_WORKER_URL = "/sw.js";

export default function PwaRegistration() {
  useEffect(() => {
    if (
      typeof window === "undefined" ||
      !("serviceWorker" in navigator) ||
      process.env.NODE_ENV !== "production"
    ) {
      return;
    }

    const register = () => {
      void navigator.serviceWorker.register(SERVICE_WORKER_URL).catch(() => {
        // Navegador com SW bloqueado ou contexto sem suporte: o app segue normal.
      });
    };

    // Quando o React hidrata depois do `load`, o evento já disparou: registrar
    // direto evita que o service worker nunca seja instalado nem atualizado.
    if (document.readyState === "complete") {
      register();
      return;
    }

    window.addEventListener("load", register, { once: true });

    return () => {
      window.removeEventListener("load", register);
    };
  }, []);

  return null;
}
