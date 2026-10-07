import type { ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
  tone?: "default" | "muted" | "primary";
  hidden?: boolean;
}

export function Card({ children, className = "", tone = "default", hidden }: CardProps) {
  return <section hidden={hidden} className={`card card-${tone} ${className}`}>{children}</section>;
}
