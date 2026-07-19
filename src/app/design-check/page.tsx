"use client";

/**
 * INTERNAL — throwaway visual QA gallery for Task 2.2 (design tokens, fonts,
 * primitives). Not linked from product navigation and not meant to ship;
 * a later task can delete this route once the real screens exist.
 *
 * Renders every primitive (Button, Dialog/BottomSheet, StatusPill, Toast,
 * ThemeToggle) plus a body-text paragraph, so contrast/focus/motion can be
 * spot-checked at 375/768/1440 in both themes from one URL.
 */

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { StatusPill, type StatusPillKind } from "@/components/ui/status-pill";
import { ToastProvider, Toaster, useToast } from "@/components/ui/toast";
import { ThemeToggle } from "@/components/theme-toggle";

const statusKinds: StatusPillKind[] = [
  "indexed",
  "processing",
  "failed",
  "pending",
  "open",
  "resolved",
];

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-t border-border py-8 first:border-t-0 first:pt-0">
      <h2 className="mb-4 text-xl font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function ToastTriggers() {
  const { showToast } = useToast();
  return (
    <div className="flex flex-wrap gap-3">
      <Button
        variant="secondary"
        onClick={() =>
          showToast({
            title: "Document indexed",
            description: "student-handbook.pdf is ready to answer questions.",
          })
        }
      >
        Show toast
      </Button>
      <Button
        variant="secondary"
        onClick={() =>
          showToast({
            title: "Free-tier limit reached",
            description: "Retrying in 20s.",
            action: { label: "Retry now", onClick: () => {} },
          })
        }
      >
        Show toast with action
      </Button>
    </div>
  );
}

export default function DesignCheckPage() {
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [sheetOpen, setSheetOpen] = React.useState(false);

  return (
    <ToastProvider>
      <main className="mx-auto max-w-3xl px-4 py-10">
        <div className="mb-8 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-danger">
              Internal — design-check gallery
            </p>
            <h1 className="font-serif text-3xl font-semibold text-ink">
              PolicyPulse design tokens
            </h1>
          </div>
          <ThemeToggle />
        </div>

        <Section title="Body text (contrast check)">
          <p className="max-w-[46rem] text-base text-ink">
            Grades are final 14 days after posting. Students who believe a
            grade was recorded in error may file a written appeal with the
            Office of the Registrar within that window; late appeals are
            considered only when accompanied by documented extenuating
            circumstances. This paragraph exists to spot-check body text
            contrast (target &ge;4.5:1) against <code>--bg</code> in both
            light and dark themes.
          </p>
          <p className="mt-3 max-w-[46rem] text-sm text-muted">
            Secondary/muted text sample — used for helper copy, timestamps,
            and source lines under citation snippets.
          </p>
        </Section>

        <Section title="Type scale">
          <div className="flex flex-col gap-2">
            <p className="text-xs">text-xs — 0.75rem</p>
            <p className="text-sm">text-sm — 0.875rem</p>
            <p className="text-base">text-base — 1rem</p>
            <p className="text-lg">text-lg — 1.125rem</p>
            <p className="text-xl">text-xl — 1.375rem</p>
            <p className="text-2xl">text-2xl — 1.75rem</p>
            <p className="font-serif text-3xl">text-3xl — 2.25rem (serif)</p>
          </div>
        </Section>

        <Section title="Button — variants x states">
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="primary">Primary</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="danger">Danger</Button>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="primary" disabled>
                Primary disabled
              </Button>
              <Button variant="primary" loading>
                Primary loading
              </Button>
              <Button variant="secondary" size="touch">
                Secondary touch (44px)
              </Button>
            </div>
            <p className="text-sm text-muted">
              Tab to each button to verify the focus-visible ring (2px
              primary, 2px offset); hover/active with a pointer.
            </p>
          </div>
        </Section>

        <Section title="Status pill">
          <div className="flex flex-wrap gap-3">
            {statusKinds.map((kind) => (
              <StatusPill key={kind} kind={kind} />
            ))}
          </div>
        </Section>

        <Section title="Dialog / bottom sheet">
          <div className="flex flex-wrap gap-3">
            <Button variant="secondary" onClick={() => setDialogOpen(true)}>
              Open dialog
            </Button>
            <Button variant="secondary" onClick={() => setSheetOpen(true)}>
              Open bottom sheet (resize &lt;640px)
            </Button>
          </div>
          <Dialog
            open={dialogOpen}
            onClose={() => setDialogOpen(false)}
            title="Delete this session?"
          >
            <p className="text-sm text-ink">
              This removes the conversation and its citations. This cannot be
              undone.
            </p>
            <div className="mt-4 flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button variant="danger" onClick={() => setDialogOpen(false)}>
                Delete
              </Button>
            </div>
          </Dialog>
          <Dialog
            open={sheetOpen}
            onClose={() => setSheetOpen(false)}
            title="Tell us more"
            bottomSheet
          >
            <textarea
              className="h-24 w-full rounded-input border border-border bg-bg p-3 text-sm text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              placeholder="What was wrong with this answer?"
            />
            <div className="mt-4 flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setSheetOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" onClick={() => setSheetOpen(false)}>
                Submit
              </Button>
            </div>
          </Dialog>
        </Section>

        <Section title="Toast">
          <ToastTriggers />
        </Section>

        <Section title="Surfaces & borders">
          <div className="flex flex-wrap gap-4">
            <div className="rounded-card border border-border bg-surface p-4 text-sm text-ink">
              --surface card, rounded-card (12px), 1px --border
            </div>
            <div className="rounded-card bg-surface-2 p-4 text-sm text-ink">
              --surface-2 (hover/stripe fill)
            </div>
          </div>
        </Section>
      </main>
      <Toaster />
    </ToastProvider>
  );
}
