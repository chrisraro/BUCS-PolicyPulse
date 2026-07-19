'use client'

import type { CSSProperties } from 'react'
import Link from 'next/link'
import { cn } from '@/lib/cn'

export interface WelcomeProps {
  hasIndexedDocs: boolean
  isAdmin: boolean
  /** True when no AI provider key is configured — takes priority over the no-indexed-docs state. */
  assistantOffline: boolean
  onPrompt: (text: string) => void
}

// Prompts chosen against the ACTUAL indexed handbook (scripts/pick-prompts.mjs
// runs the real semantic retrieval): each surfaces a chunk that DIRECTLY
// answers it. "Leave of absence" / "academic appeal" were dropped — no
// substantive coverage in the document, they returned "not found".
const SUGGESTED_PROMPTS = [
  'What is the grading policy?',
  'How do I drop a subject?',
  'What are the rules on academic probation and dismissal?',
  'How do I shift to another course?',
]

export function Welcome({ hasIndexedDocs, isAdmin, assistantOffline, onPrompt }: WelcomeProps) {
  // The assistant being unconfigured is the more fundamental blocker — if
  // both conditions hold (no key AND no indexed docs), this state wins.
  if (assistantOffline) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 py-16 text-center">
        <h1 className="text-balance font-serif text-2xl font-semibold text-ink sm:text-3xl">
          Ask about any BUCS policy
        </h1>
        <p className="max-w-sm text-sm text-muted">The assistant is offline — no AI key is configured.</p>
        {isAdmin ? (
          <div className="mt-2 flex flex-wrap justify-center gap-3">
            <Link
              href="/admin/settings"
              className="inline-flex h-11 min-h-11 items-center rounded-input bg-primary px-4 text-sm font-medium text-primary-ink hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
            >
              Add your API key in AI Settings
            </Link>
          </div>
        ) : null}
      </div>
    )
  }

  if (!hasIndexedDocs) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 py-16 text-center">
        <h1 className="text-balance font-serif text-2xl font-semibold text-ink sm:text-3xl">
          Ask about any BUCS policy
        </h1>
        <p className="max-w-sm text-sm text-muted">
          {isAdmin
            ? 'The chat can’t answer until at least one policy document is indexed.'
            : 'The assistant isn’t ready yet — ask an administrator to add policy documents.'}
        </p>
        {isAdmin ? (
          <div className="mt-2 flex flex-wrap justify-center gap-3">
            <Link
              href="/admin/documents"
              className="inline-flex h-10 items-center rounded-input bg-primary px-4 text-sm font-medium text-primary-ink hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
            >
              Upload a document
            </Link>
          </div>
        ) : null}
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 py-16 text-center">
      <div>
        <h1 className="text-balance font-serif text-2xl font-semibold text-ink sm:text-3xl">
          Ask about any BUCS policy
        </h1>
        <p className="mt-2 text-sm text-muted">
          Answers are grounded in the official policy documents, with citations you can verify.
        </p>
      </div>
      <div className="grid w-full max-w-md grid-cols-1 gap-3 sm:grid-cols-2">
        {SUGGESTED_PROMPTS.map((prompt, index) => (
          <button
            key={prompt}
            type="button"
            onClick={() => onPrompt(prompt)}
            style={{ '--i': index } as CSSProperties}
            className={cn(
              'pp-stagger min-h-11 rounded-card border border-border bg-surface px-4 py-3 text-left text-sm text-ink',
              'hover:-translate-y-0.5 hover:border-primary/40 hover:bg-surface-2 hover:shadow-float',
              'active:translate-y-0 active:bg-surface-2',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-bg',
              'transition-[transform,background-color,border-color,box-shadow] duration-[var(--duration-fast)] ease-[var(--ease-out)]',
            )}
          >
            {prompt}
          </button>
        ))}
      </div>
    </div>
  )
}
