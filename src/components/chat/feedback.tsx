'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { cn } from '@/lib/cn'

export interface FeedbackProps {
  /** The DB `chat_messages.id`. Undefined while the live turn hasn't been backfilled yet. */
  messageId: string | undefined
  onSubmit: (rating: 'up' | 'down', comment?: string) => Promise<void>
}

/**
 * Ghost 👍/👎 buttons under a completed assistant message. Per spec these are
 * disabled — not hidden — while `messageId` is unknown (the live stream has
 * no DB row id until `ChatApp`'s post-stream backfill completes).
 */
export function Feedback({ messageId, onSubmit }: FeedbackProps) {
  const [sent, setSent] = useState<'up' | 'down' | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (sent) {
    return <p className="mt-3 text-xs text-muted">Thanks for the feedback.</p>
  }

  async function handleUp() {
    if (!messageId || submitting) return
    setSubmitting(true)
    try {
      await onSubmit('up')
      setSent('up')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDownSubmit() {
    if (!messageId || submitting) return
    setSubmitting(true)
    try {
      await onSubmit('down', comment.trim() || undefined)
      setSent('down')
      setDialogOpen(false)
    } finally {
      setSubmitting(false)
    }
  }

  const iconButtonClasses = cn(
    'flex h-11 min-h-11 w-11 items-center justify-center rounded-input text-lg leading-none text-muted',
    'hover:bg-surface-2 hover:text-ink active:bg-surface-2',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-bg',
    'disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-muted',
    'transition-colors duration-[var(--duration-fast)] ease-[var(--ease-out)]',
  )

  return (
    <div className="mt-3 flex items-center gap-1">
      <button
        type="button"
        aria-label="Good answer"
        title={messageId ? 'Good answer' : 'Feedback will be available in a moment'}
        disabled={!messageId || submitting}
        onClick={handleUp}
        className={iconButtonClasses}
      >
        <span aria-hidden="true">👍</span>
      </button>
      <button
        type="button"
        aria-label="Bad answer"
        title={messageId ? 'Bad answer' : 'Feedback will be available in a moment'}
        disabled={!messageId || submitting}
        onClick={() => setDialogOpen(true)}
        className={iconButtonClasses}
      >
        <span aria-hidden="true">👎</span>
      </button>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} title="What was wrong or missing?" bottomSheet>
        <div className="flex flex-col gap-3">
          <textarea
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            rows={4}
            placeholder="Tell us what was wrong or missing (optional)"
            className="resize-none rounded-input border border-border bg-bg px-3 py-2 text-sm text-ink placeholder:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
          />
          <Button variant="primary" size="touch" loading={submitting} onClick={handleDownSubmit}>
            Submit feedback
          </Button>
        </div>
      </Dialog>
    </div>
  )
}
