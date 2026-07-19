'use client'

import { useState } from 'react'
import { cn } from '@/lib/cn'
import type { Citation } from '@/lib/rag/citations'

export interface CitationsProps {
  citations: Citation[]
}

/**
 * Chip row under an assistant message. One quote block open at a time;
 * `aria-expanded` on the toggling chip. The expand/collapse uses the
 * grid-template-rows trick (DESIGN.md Motion) so nothing animates `height`
 * directly; `globals.css`'s reduced-motion override already collapses the
 * transition duration to ~0 globally, so this is instant under
 * `prefers-reduced-motion: reduce` with no extra branching here.
 */
export function Citations({ citations }: CitationsProps) {
  const [openRef, setOpenRef] = useState<number | null>(null)

  if (citations.length === 0) return null

  const active = citations.find((c) => c.ref === openRef) ?? null

  return (
    <div className="mt-3">
      <div className="flex flex-wrap gap-2">
        {citations.map((citation) => {
          const isOpen = citation.ref === openRef
          return (
            <button
              key={citation.chunkId}
              type="button"
              aria-expanded={isOpen}
              onClick={() => setOpenRef(isOpen ? null : citation.ref)}
              className={cn(
                'inline-flex min-h-9 items-center gap-1.5 rounded-full border bg-accent-subtle px-3 py-1.5 text-xs text-ink',
                isOpen ? 'border-accent' : 'border-transparent hover:border-border',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-bg',
                'transition-colors duration-[var(--duration-fast)] ease-[var(--ease-out)]',
              )}
            >
              <span className="font-semibold text-accent">{citation.ref}</span>
              <span className="max-w-[16rem] truncate">{citation.documentTitle}</span>
            </button>
          )
        })}
      </div>

      <div
        className={cn(
          'grid transition-[grid-template-rows] duration-200 ease-[var(--ease-out)]',
          active ? 'mt-2 grid-rows-[1fr]' : 'grid-rows-[0fr]',
        )}
      >
        <div className="overflow-hidden">
          {active ? (
            <div className="rounded-card border-l-2 border-accent bg-accent-subtle p-3 text-sm text-ink">
              <p className="whitespace-pre-wrap">{active.snippet}</p>
              <p className="mt-2 text-xs text-muted">— {active.documentTitle}</p>
              <button
                type="button"
                onClick={() => setOpenRef(null)}
                className="mt-2 rounded-input text-xs font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
              >
                Close
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
