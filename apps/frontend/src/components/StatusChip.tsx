import { Icon } from "./Icon";
import type { ReactNode } from "react";

type Tone = "default" | "primary" | "info" | "success" | "warning" | "danger";

interface StatusChipProps {
  children: ReactNode;
  tone?: Tone;
  icon?: string;
}

export function StatusChip({ children, tone = "default", icon }: StatusChipProps) {
  return (
    <span className={`chip chip-${tone}`}>
      {icon ? <Icon name={icon} size={14} /> : null}
      {children}
    </span>
  );
}
