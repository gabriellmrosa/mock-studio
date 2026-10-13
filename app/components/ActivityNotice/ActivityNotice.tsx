import "./ActivityNotice.css";

type ActivityNoticeProps = {
  className?: string;
  label: string;
  variant?: "centered" | "inline";
};

export default function ActivityNotice({
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
      </div>
    </div>
  );
}
