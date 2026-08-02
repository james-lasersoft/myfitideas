import type { ReactNode } from "react";
import "./Tooltip.css";

interface TooltipProps {
  content: string;
  children: ReactNode;
}

export default function Tooltip({ content, children }: TooltipProps) {
  return (
    <span className="mfi-tooltip" data-tooltip={content}>
      {children}
    </span>
  );
}
