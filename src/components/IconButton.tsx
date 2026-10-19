import type { LucideIcon } from "lucide-react";

export function IconButton({
  icon: Icon,
  label,
  onClick,
  active,
  disabled = false,
  className = "",
}: {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      className={`icon-button ${active ? "is-active" : ""} ${className}`}
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      onClick={onClick}
      disabled={disabled}
    >
      <Icon size={20} strokeWidth={1.8} />
    </button>
  );
}
