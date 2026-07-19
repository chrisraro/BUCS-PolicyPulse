'use client'

import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { cn } from '@/lib/cn'

export interface EscalationButtonProps {
  onClick: () => void
  className?: string
}

/** Persistent ghost "Ask a human" button, shown in the header on every screen. */
export function EscalationButton({ onClick, className }: EscalationButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex h-11 min-h-11 items-center gap-1.5 rounded-input px-3 text-sm font-medium text-ink',
        'hover:bg-surface-2 active:bg-surface-2',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface',
        'transition-colors duration-[var(--duration-fast)] ease-[var(--ease-out)]',
        className,
      )}
    >
      Ask a human
    </button>
  )
}

export interface EscalationCardProps {
  onAskHuman: () => void
}

/** Inline card auto-shown under a completed assistant answer with zero citations. */
export function EscalationCard({ onAskHuman }: EscalationCardProps) {
  return (
    <div className="mt-3 rounded-card border border-border bg-surface-2 px-4 py-3 text-sm text-ink">
      <p>This wasn&apos;t found in the policy documents — send it to an administrator?</p>
      <Button variant="secondary" className="mt-2" onClick={onAskHuman}>
        Ask a human
      </Button>
    </div>
  )
}

export interface EscalationDialogProps {
  open: boolean
  onClose: () => void
  question: string
  onQuestionChange: (value: string) => void
  onSubmit: () => Promise<void>
  submitting: boolean
}

/** Shared dialog for both the header button and the per-message inline card. */
export function EscalationDialog({
  open,
  onClose,
  question,
  onQuestionChange,
  onSubmit,
  submitting,
}: EscalationDialogProps) {
  return (
    <Dialog open={open} onClose={onClose} title="Ask a human" bottomSheet>
      <div className="flex flex-col gap-3">
        <p className="text-sm text-muted">
          Send this question to an administrator. They will follow up outside the chat.
        </p>
        <textarea
          value={question}
          onChange={(event) => onQuestionChange(event.target.value)}
          rows={4}
          placeholder="What do you need help with?"
          className="resize-none rounded-input border border-border bg-bg px-3 py-2 text-sm text-ink placeholder:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
        />
        <Button
          variant="primary"
          size="touch"
          loading={submitting}
          disabled={!question.trim()}
          onClick={() => void onSubmit()}
        >
          Send to administrator
        </Button>
      </div>
    </Dialog>
  )
}
