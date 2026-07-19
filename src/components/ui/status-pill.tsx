import * as React from "react";
import { cn } from "@/lib/cn";
import { Spinner } from "@/components/ui/button";

export type StatusPillKind =
  | "indexed"
  | "processing"
  | "failed"
  | "pending"
  | "open"
  | "resolved";

export interface StatusPillProps {
  kind: StatusPillKind;
  /** Override the label; defaults to the capitalized kind. */
  label?: string;
  className?: string;
}

// Subtle-background + strong-text pairs per DESIGN.md — never full-saturation fills.
const kindClasses: Record<StatusPillKind, string> = {
  indexed: "bg-success-subtle text-success",
  processing: "bg-primary-subtle text-primary",
  failed: "bg-danger-subtle text-danger",
  pending: "bg-surface-2 text-muted",
  open: "bg-primary-subtle text-primary",
  resolved: "bg-success-subtle text-success",
};

const defaultLabels: Record<StatusPillKind, string> = {
  indexed: "Indexed",
  processing: "Processing",
  failed: "Failed",
  pending: "Pending",
  open: "Open",
  resolved: "Resolved",
};

export function StatusPill({ kind, label, className }: StatusPillProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
        kindClasses[kind],
        className,
      )}
    >
      {kind === "processing" ? (
        <Spinner size={12} className="shrink-0" />
      ) : null}
      {label ?? defaultLabels[kind]}
    </span>
  );
}
