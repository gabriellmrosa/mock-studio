type IconProps = {
  className?: string;
};

function iconProps(className?: string) {
  return {
    "aria-hidden": true,
    className,
    fill: "none",
    stroke: "currentColor",
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    strokeWidth: 1.8,
    viewBox: "0 0 24 24",
  };
}

export function PlusIcon({ className }: IconProps) {
  return (
    <svg {...iconProps(className)}>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  );
}

export function TrashIcon({ className }: IconProps) {
  return (
    <svg {...iconProps(className)}>
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="M19 6l-1 14H6L5 6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
    </svg>
  );
}

export function RotateCcwIcon({ className }: IconProps) {
  return (
    <svg {...iconProps(className)}>
      <path d="M3 12a9 9 0 1 0 3-6.7" />
      <path d="M3 3v6h6" />
    </svg>
  );
}

export function UploadIcon({ className }: IconProps) {
  return (
    <svg {...iconProps(className)}>
      <path d="M12 16V5" />
      <path d="m7 10 5-5 5 5" />
      <path d="M5 19h14" />
    </svg>
  );
}

export function DownloadIcon({ className }: IconProps) {
  return (
    <svg {...iconProps(className)}>
      <path d="M12 5v11" />
      <path d="m7 11 5 5 5-5" />
      <path d="M5 19h14" />
    </svg>
  );
}

export function ZoomInIcon({ className }: IconProps) {
  return (
    <svg {...iconProps(className)}>
      <circle cx="11" cy="11" r="6.5" />
      <path d="M21 21l-4.35-4.35" />
      <path d="M11 8.5v5" />
      <path d="M8.5 11h5" />
    </svg>
  );
}

export function ZoomOutIcon({ className }: IconProps) {
  return (
    <svg {...iconProps(className)}>
      <circle cx="11" cy="11" r="6.5" />
      <path d="M21 21l-4.35-4.35" />
      <path d="M8.5 11h5" />
    </svg>
  );
}

export function FocusIcon({ className }: IconProps) {
  return (
    <svg {...iconProps(className)}>
      <path d="M9 4H5v4" />
      <path d="M15 4h4v4" />
      <path d="M19 15v4h-4" />
      <path d="M5 15v4h4" />
      <circle cx="12" cy="12" r="2.5" />
    </svg>
  );
}
