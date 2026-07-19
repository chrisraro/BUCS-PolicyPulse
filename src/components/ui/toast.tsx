"use client";

import * as React from "react";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/button";

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface ToastOptions {
  title: string;
  description?: string;
  action?: ToastAction;
  /** Milliseconds before auto-dismiss. Default 4000 per DESIGN.md. */
  durationMs?: number;
}

interface ToastItem extends ToastOptions {
  id: string;
}

interface ToastContextValue {
  toasts: ToastItem[];
  showToast: (options: ToastOptions) => string;
  dismissToast: (id: string) => void;
}

const ToastContext = React.createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<ToastItem[]>([]);
  const timers = React.useRef(
    new Map<string, ReturnType<typeof setTimeout>>(),
  );

  const dismissToast = React.useCallback((id: string) => {
    setToasts((current) => current.filter((t) => t.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const showToast = React.useCallback(
    (options: ToastOptions) => {
      const id =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `toast-${Date.now()}-${Math.random().toString(16).slice(2)}`;
      const duration = options.durationMs ?? 4000;
      setToasts((current) => [...current, { ...options, id }]);
      const timer = setTimeout(() => dismissToast(id), duration);
      timers.current.set(id, timer);
      return id;
    },
    [dismissToast],
  );

  React.useEffect(() => {
    const timersMap = timers.current;
    return () => {
      timersMap.forEach((timer) => clearTimeout(timer));
      timersMap.clear();
    };
  }, []);

  const value = React.useMemo<ToastContextValue>(
    () => ({ toasts, showToast, dismissToast }),
    [toasts, showToast, dismissToast],
  );

  return (
    <ToastContext.Provider value={value}>{children}</ToastContext.Provider>
  );
}

function useToastContext(): ToastContextValue {
  const ctx = React.useContext(ToastContext);
  if (!ctx) {
    throw new Error(
      "useToast/Toaster must be used within a <ToastProvider>.",
    );
  }
  return ctx;
}

export function useToast() {
  const ctx = useToastContext();
  return { showToast: ctx.showToast, dismissToast: ctx.dismissToast };
}

/** Renderer — mount once inside <ToastProvider>, anywhere in the tree. */
export function Toaster() {
  const { toasts, dismissToast } = useToastContext();

  return (
    <div
      aria-live="polite"
      aria-atomic="false"
      className={cn(
        "pointer-events-none fixed z-[var(--z-toast)] flex w-full flex-col items-center gap-2 p-4",
        "inset-x-0 bottom-0",
        "sm:inset-x-auto sm:right-0 sm:items-end",
      )}
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          role="status"
          className={cn(
            "pointer-events-auto w-full max-w-sm rounded-card border border-border bg-surface p-4 text-ink shadow-float",
          )}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <p className="text-sm font-medium">{t.title}</p>
              {t.description ? (
                <p className="mt-1 text-sm text-muted">{t.description}</p>
              ) : null}
            </div>
            <button
              type="button"
              aria-label="Dismiss notification"
              onClick={() => dismissToast(t.id)}
              className={cn(
                "shrink-0 rounded-input p-1 text-muted",
                "hover:bg-surface-2 hover:text-ink",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface",
                "transition-colors duration-[var(--duration-fast)] ease-[var(--ease-out)]",
              )}
            >
              <span aria-hidden="true" className="block leading-none">
                &times;
              </span>
            </button>
          </div>
          {t.action ? (
            <div className="mt-3">
              <Button
                variant="secondary"
                onClick={() => {
                  t.action?.onClick();
                  dismissToast(t.id);
                }}
              >
                {t.action.label}
              </Button>
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}
