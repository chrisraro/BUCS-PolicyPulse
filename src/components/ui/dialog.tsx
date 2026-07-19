"use client";

import * as React from "react";
import { cn } from "@/lib/cn";

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  children: React.ReactNode;
  /**
   * Renders as a bottom sheet on small screens (<640px): rounded top only,
   * slides up from the bottom edge. On >=640px it renders as a centered
   * dialog regardless of this flag's value (per DESIGN.md dialog/drawer spec).
   */
  bottomSheet?: boolean;
  className?: string;
}

/**
 * Dialog built on the native <dialog> element (showModal): focus trap and
 * Escape-to-close come for free from the platform. Entrance/exit are pure
 * CSS (fade + 8px rise, ~200ms, `@starting-style` + `allow-discrete` — see
 * globals.css `.pp-dialog`), so `prefers-reduced-motion` is honored via the
 * global transition-duration override without any extra JS branching.
 */
export function Dialog({
  open,
  onClose,
  title,
  children,
  bottomSheet = false,
  className,
}: DialogProps) {
  const ref = React.useRef<HTMLDialogElement>(null);
  const titleId = React.useId();

  React.useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  React.useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    // Fires on Escape-close, backdrop-close (below), and programmatic .close().
    const handleClose = () => onClose();
    dialog.addEventListener("close", handleClose);
    return () => dialog.removeEventListener("close", handleClose);
  }, [onClose]);

  function handleBackdropClick(event: React.MouseEvent<HTMLDialogElement>) {
    // A click that lands on the ::backdrop bubbles with the dialog itself as
    // the target (it never hits a descendant), so this reliably distinguishes
    // backdrop clicks from clicks inside the dialog's content.
    if (event.target === ref.current) {
      ref.current?.close();
    }
  }

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClick={handleBackdropClick}
      className={cn(
        "pp-dialog",
        bottomSheet && "pp-dialog-sheet",
        "m-auto w-full max-w-md border-none bg-surface p-0 text-ink",
        "rounded-card shadow-float",
        "max-sm:fixed max-sm:inset-x-0 max-sm:top-auto max-sm:bottom-0 max-sm:m-0 max-sm:max-w-none max-sm:rounded-b-none",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-4 border-b border-border p-4">
        <h2 id={titleId} className="text-lg font-semibold text-ink">
          {title}
        </h2>
        <button
          type="button"
          aria-label="Close"
          onClick={() => ref.current?.close()}
          className={cn(
            "flex h-11 w-11 min-h-11 items-center justify-center rounded-input text-muted",
            "hover:bg-surface-2 hover:text-ink",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface",
            "transition-colors duration-[var(--duration-fast)] ease-[var(--ease-out)]",
          )}
        >
          <span aria-hidden="true" className="text-lg leading-none">
            &times;
          </span>
        </button>
      </div>
      <div className="p-4">{children}</div>
    </dialog>
  );
}
