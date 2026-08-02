import type { ButtonHTMLAttributes, ReactNode } from "react";

export type ButtonVariant = "primary" | "outline" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  leadingIcon?: ReactNode;
  loading?: boolean;
};

export default function Button({
  variant = "primary",
  size = "md",
  leadingIcon,
  loading = false,
  className = "",
  disabled,
  children,
  type = "button",
  ...props
}: ButtonProps) {
  const classes = ["mfi-button", `mfi-button--${variant}`, `mfi-button--${size}`, className]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      {...props}
      type={type}
      className={classes}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
    >
      {leadingIcon ? <span className="mfi-button__icon" aria-hidden="true">{leadingIcon}</span> : null}
      <span className="mfi-button__label">{children}</span>
    </button>
  );
}
