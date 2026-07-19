'use client'

import { useActionState } from 'react'
import { Button } from '@/components/ui/button'
import { initialActionState } from '../_lib/action-state'
import { saveRagSettings } from './actions'

const inputClass =
  'h-11 rounded-input border border-border bg-bg px-3 text-sm text-ink ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface'

export function RetrievalTuningForm({
  chunkSize,
  chunkOverlap,
  matchThreshold,
  matchCount,
}: {
  chunkSize: number
  chunkOverlap: number
  matchThreshold: number
  matchCount: number
}) {
  const [state, formAction, pending] = useActionState(saveRagSettings, initialActionState)

  return (
    <form
      action={formAction}
      className="flex flex-col gap-5 rounded-card border border-border bg-surface p-4"
    >
      <div>
        <h2 className="text-sm font-semibold text-ink">Retrieval tuning</h2>
        <p className="mt-1 text-sm text-muted">
          Applies to documents indexed after the change — re-index existing documents to apply.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="chunkSize" className="text-sm font-medium text-ink">
            Chunk size
          </label>
          <input
            id="chunkSize"
            name="chunkSize"
            type="number"
            min={128}
            max={4096}
            defaultValue={chunkSize}
            required
            className={inputClass}
          />
          <p className="text-xs text-muted">Characters per chunk, 128–4096.</p>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="chunkOverlap" className="text-sm font-medium text-ink">
            Chunk overlap
          </label>
          <input
            id="chunkOverlap"
            name="chunkOverlap"
            type="number"
            min={0}
            defaultValue={chunkOverlap}
            required
            className={inputClass}
          />
          <p className="text-xs text-muted">Characters shared between adjacent chunks, 0 or more.</p>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="matchThreshold" className="text-sm font-medium text-ink">
            Match threshold
          </label>
          <input
            id="matchThreshold"
            name="matchThreshold"
            type="number"
            min={0}
            max={1}
            step={0.01}
            defaultValue={matchThreshold}
            required
            className={inputClass}
          />
          <p className="text-xs text-muted">Minimum similarity to include a passage, 0–1.</p>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="matchCount" className="text-sm font-medium text-ink">
            Match count
          </label>
          <input
            id="matchCount"
            name="matchCount"
            type="number"
            min={1}
            max={20}
            defaultValue={matchCount}
            required
            className={inputClass}
          />
          <p className="text-xs text-muted">Passages retrieved per question, 1–20.</p>
        </div>
      </div>

      {state.status === 'error' ? (
        <p
          role="alert"
          className="rounded-input border border-danger bg-danger-subtle px-3 py-2 text-sm text-danger"
        >
          {state.message}
        </p>
      ) : null}
      {state.status === 'success' ? (
        <p
          role="status"
          className="rounded-input border border-success bg-success-subtle px-3 py-2 text-sm text-success"
        >
          {state.message}
        </p>
      ) : null}

      <div>
        <Button type="submit" variant="primary" size="touch" loading={pending}>
          Save retrieval settings
        </Button>
      </div>
    </form>
  )
}
