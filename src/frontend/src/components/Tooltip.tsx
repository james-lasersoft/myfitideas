import {
  cloneElement,
  isValidElement,
  useId,
  useRef,
  useState,
  type FocusEvent,
  type MouseEvent,
  type ReactElement,
} from "react";
import { createPortal } from "react-dom";
import "./Tooltip.css";

interface TooltipProps {
  content: string;
  children: ReactElement;
}

interface TooltipPosition {
  left: number;
  top: number;
  placement: "top" | "bottom";
}

export default function Tooltip({ content, children }: TooltipProps) {
  const tooltipId = useId();
  const triggerRef = useRef<HTMLElement | null>(null);
  const [position, setPosition] = useState<TooltipPosition | null>(null);

  function showTooltip(element: HTMLElement) {
    triggerRef.current = element;
    const rect = element.getBoundingClientRect();
    const placement = rect.top < 72 ? "bottom" : "top";

    setPosition({
      left: rect.left + rect.width / 2,
      top: placement === "top" ? rect.top - 10 : rect.bottom + 10,
      placement,
    });
  }

  function hideTooltip() {
    triggerRef.current = null;
    setPosition(null);
  }

  const child = isValidElement(children)
    ? cloneElement(children, {
        "aria-describedby": position ? tooltipId : undefined,
        onMouseEnter: (event: MouseEvent<HTMLElement>) => {
          children.props.onMouseEnter?.(event);
          showTooltip(event.currentTarget);
        },
        onMouseLeave: (event: MouseEvent<HTMLElement>) => {
          children.props.onMouseLeave?.(event);
          hideTooltip();
        },
        onFocus: (event: FocusEvent<HTMLElement>) => {
          children.props.onFocus?.(event);
          showTooltip(event.currentTarget);
        },
        onBlur: (event: FocusEvent<HTMLElement>) => {
          children.props.onBlur?.(event);
          hideTooltip();
        },
      })
    : children;

  return (
    <>
      {child}
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
