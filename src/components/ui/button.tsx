import * as React from "react";
import { cn as cx } from "@/lib/cn";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "default" | "touch";

export interface ButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Shows a small spinner and disables the button while true. */
  loading?: boolean;
  children?: React.ReactNode;
}

const base = [
  "inline-flex items-center justify-center gap-2",
  "rounded-input px-4 text-sm font-medium",
  "transition-[background-color,border-color,color,opacity] duration-[var(--duration-fast)] ease-[var(--ease-out)]",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-bg",
  "disabled:opacity-50 disabled:cursor-not-allowed",
].join(" ");

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-primary text-primary-ink hover:opacity-90 active:opacity-80 disabled:hover:opacity-100",
  secondary:
    "border border-border text-ink bg-transparent hover:bg-surface-2 active:bg-surface-2 disabled:hover:bg-transparent",
  ghost:
    "text-ink bg-transparent hover:bg-surface-2 active:bg-surface-2 disabled:hover:bg-transparent",
  danger:
    "bg-danger text-primary-ink hover:opacity-90 active:opacity-80 disabled:hover:opacity-100",
};

const sizeClasses: Record<ButtonSize, string> = {
  default: "h-10",
  touch: "min-h-11 h-11",
};

/** Small inline spinner, reused by StatusPill/Toast. Static ring under reduced-motion (global override sets its animation-duration to ~0). */
export function Spinner({
  className,
  size = 16,
}: {
  className?: string;
  size?: number;
}) {
  return (
    <svg
      className={cx("animate-spin", className)}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-90"
        fill="currentColor"
        d="M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4z"
      />
    </svg>
  );
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    {
      variant = "primary",
      size = "default",
      loading = false,
      disabled,
      className,
      children,
      ...props
    },
    ref,
  ) {
    const isDisabled = disabled || loading;
    return (
      <button
        ref={ref}
        type={props.type ?? "button"}
        aria-busy={loading || undefined}
        disabled={isDisabled}
        className={cx(
          base,
          variantClasses[variant],
          sizeClasses[size],
          className,
        )}
        {...props}
      >
        {loading ? <Spinner /> : null}
        {children}
      </button>
    );
  },
);
