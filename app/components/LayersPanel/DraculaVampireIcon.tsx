"use client";

/**
 * Ícone do Drácula exibido no hover do menu de temas. Usa os tokens da paleta
 * oficial do Drácula definidos em `tokens.css`.
 */
export default function DraculaVampireIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Capa / gola roxa */}
      <path
        d="M3.5 11.5L7 20.5H17L20.5 11.5L16.5 14L12 19L7.5 14L3.5 11.5Z"
        fill="var(--dracula-purple)"
      />
      {/* Rosto claro */}
      <path
        d="M7 10.5C7 7.4 9.2 5.2 12 5.2C14.8 5.2 17 7.4 17 10.5V13.4C17 16.3 14.8 18.6 12 18.6C9.2 18.6 7 16.3 7 13.4V10.5Z"
        fill="var(--dracula-fg)"
      />
      {/* Cabelo em bico de viúva */}
      <path
        d="M6.6 10.5C6.4 6.6 8.8 4 12 4C15.2 4 17.6 6.6 17.4 10.5C16.2 8.7 14.7 7.8 13.4 8.2L12 10.3L10.6 8.2C9.3 7.8 7.8 8.7 6.6 10.5Z"
        fill="var(--dracula-bg)"
      />
      {/* Olhos */}
      <circle cx="9.8" cy="12" r="1.05" fill="var(--dracula-bg)" />
      <circle cx="14.2" cy="12" r="1.05" fill="var(--dracula-bg)" />
      {/* Boca + presas */}
      <path
        d="M9.7 14.8C10.5 15.5 13.5 15.5 14.3 14.8"
        stroke="var(--dracula-bg)"
        strokeWidth="1.15"
        strokeLinecap="round"
      />
      <path d="M10.2 15.1L10.7 16.5L11.3 15.3Z" fill="var(--dracula-pink)" />
      <path d="M13.8 15.1L13.3 16.5L12.7 15.3Z" fill="var(--dracula-pink)" />
    </svg>
  );
}
