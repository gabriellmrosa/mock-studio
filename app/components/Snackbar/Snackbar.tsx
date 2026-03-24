"use client";

import "./Snackbar.css";
import { useEffect } from "react";
import { X } from "lucide-react";

export type SnackbarNotification = {
  id: number;
  message: string;
  tone: "error" | "success";
};

type SnackbarProps = {
  dismissLabel: string;
  durationMs?: number;
  notification: SnackbarNotification | null;
  onDismiss: () => void;
};

const DEFAULT_DURATION_MS = 4000;

export default function Snackbar({
  dismissLabel,
  durationMs = DEFAULT_DURATION_MS,
  notification,
  onDismiss,
}: SnackbarProps) {
  useEffect(() => {
    if (!notification) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      onDismiss();
    }, durationMs);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [durationMs, notification, onDismiss]);

  if (!notification) {
    return null;
  }

  return (
    <div className="snackbar-root">
      <div
        className={`snackbar snackbar-tone-${notification.tone}`}
        role={notification.tone === "error" ? "alert" : "status"}
        aria-live={notification.tone === "error" ? "assertive" : "polite"}
      >
        <p className="snackbar-message">{notification.message}</p>
        <button
          type="button"
          className="snackbar-close"
          onClick={onDismiss}
          aria-label={dismissLabel}
          title={dismissLabel}
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
