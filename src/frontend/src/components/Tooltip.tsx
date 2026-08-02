import {
  useId,
  useRef,
  useState,
  type FocusEvent,
  type MouseEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import "./Tooltip.css";

interface TooltipProps {
  content: string;
  children: ReactNode;
}

interface TooltipPosition {
  left: number;
  top: number;
  placement: "top" | "bottom";
}

export default function Tooltip({ content, children }: TooltipProps) {
  const tooltipId = useId();
  const triggerRef = useRef<HTMLSpanElement | null>(null);
  const [position, setPosition] = useState<TooltipPosition | null>(null);

  function showTooltip(element: HTMLElement) {
    const rect = element.getBoundingClientRect();
    const placement = rect.top < 72 ? "bottom" : "top";

    setPosition({
      left: rect.left + rect.width / 2,
      top: placement === "top" ? rect.top - 10 : rect.bottom + 10,
      placement,
    });
  }

  function hideTooltip() {
    setPosition(null);
  }

  function handleMouseEnter(event: MouseEvent<HTMLSpanElement>) {
    showTooltip(event.currentTarget);
  }

  function handleFocus(event: FocusEvent<HTMLSpanElement>) {
    showTooltip(event.currentTarget);
  }

  return (
    <>
      <span
        ref={triggerRef}
        className="mfi-tooltip-trigger"
        aria-describedby={position ? tooltipId : undefined}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={hideTooltip}
        onFocus={handleFocus}
        onBlur={hideTooltip}
      >
        {children}
      </span>
      {position &&
        createPortal(
          <span
            id={tooltipId}
            role="tooltip"
            className={`mfi-tooltip-content ${position.placement}`}
            style={{ left: position.left, top: position.top }}
          >
            {content}
          </span>,
          document.body
        )}
    </>
  );
}
