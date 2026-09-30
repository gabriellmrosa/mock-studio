import "./ActivityNotice.css";
import type { ReactNode } from "react";

type ActivityNoticeProps = {
  /** Uma ação ao lado do texto, como cancelar uma exportação longa. */
  action?: ReactNode;
  className?: string;
  label: string;
  variant?: "centered" | "inline";
};

export default function ActivityNotice({
  action,
  className,
  label,
  variant = "inline",
}: ActivityNoticeProps) {
  return (
    <div
      className={`activity-notice activity-notice-${variant} ${className ?? ""}`.trim()}
      role="status"
      aria-live="polite"
    >
      <div
        className={`activity-notice-surface activity-notice-surface-${variant}`}
      >
        <div
          className={`activity-notice-spinner ${variant === "inline" ? "activity-notice-spinner-inline" : ""}`.trim()}
          aria-hidden="true"
        />
        <p
          className={`activity-notice-label activity-notice-label-${variant}`}
        >
          {label}
        </p>
        {action}
      </div>
    </div>
  );
}
