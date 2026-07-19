'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import ReactMarkdown, { type Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { ChatStatus } from 'ai'
import { cn } from '@/lib/cn'
import { citedInText } from '@/lib/rag/citations'
import { Citations } from './citations'
import { Feedback } from './feedback'
import { DegradedNotice } from './degraded-notice'
import { EscalationCard } from './escalation'
import { lastUserQuestion, textOfParts } from './message-text'
import type { ChatMessageMetadata, ChatUIMessage, ClassifiedChatError } from './types'

export interface MessageListProps {
  messages: ChatUIMessage[]
  status: ChatStatus
  error: ClassifiedChatError | null
  isAdmin: boolean
  onRetry: () => void
  onFeedback: (messageId: string, rating: 'up' | 'down', comment?: string) => Promise<void>
  onEscalate: (question: string) => void
}

// Markdown answer styling per DESIGN.md Typography: h2/h3 map to
// 1.125/1rem semibold, tables scroll horizontally, code uses --surface-2.
const markdownComponents: Components = {
  h1: ({ children }) => <h2 className="mt-4 text-lg font-semibold text-ink first:mt-0">{children}</h2>,
  h2: ({ children }) => <h2 className="mt-4 text-lg font-semibold text-ink first:mt-0">{children}</h2>,
  h3: ({ children }) => <h3 className="mt-3 text-base font-semibold text-ink first:mt-0">{children}</h3>,
  p: ({ children }) => <p className="mt-3 leading-relaxed first:mt-0">{children}</p>,
  ul: ({ children }) => <ul className="mt-3 list-disc space-y-1 pl-5 first:mt-0">{children}</ul>,
  ol: ({ children }) => <ol className="mt-3 list-decimal space-y-1 pl-5 first:mt-0">{children}</ol>,
  li: ({ children }) => <li className="pl-1">{children}</li>,
  a: ({ children, ...props }) => (
    <a {...props} className="text-primary underline-offset-4 hover:underline" target="_blank" rel="noreferrer">
      {children}
    </a>
  ),
  strong: ({ children }) => <strong className="font-semibold text-ink">{children}</strong>,
  table: ({ children }) => (
    <div className="mt-3 overflow-x-auto">
      <table className="w-full border-collapse text-sm">{children}</table>
    </div>
  ),
  th: ({ children }) => <th className="border-b border-border px-3 py-2 text-left font-semibold">{children}</th>,
  td: ({ children }) => <td className="border-b border-border px-3 py-2 align-top">{children}</td>,
  code: ({ children, className }) => {
    const isBlock = /language-/.test(className ?? '')
    return isBlock ? (
      <code className={cn('block overflow-x-auto rounded-input bg-surface-2 p-3 text-xs', className)}>{children}</code>
    ) : (
      <code className="rounded-input bg-surface-2 px-1.5 py-0.5 text-[0.85em]">{children}</code>
    )
  },
  pre: ({ children }) => <pre className="mt-3 overflow-x-auto rounded-input bg-surface-2 p-0 first:mt-0">{children}</pre>,
  blockquote: ({ children }) => (
    <blockquote className="mt-3 border-l-2 border-border pl-3 text-muted first:mt-0">{children}</blockquote>
  ),
}

/**
 * Conversation column. User bubbles right-aligned on `--surface-2`; assistant
 * answers render full-column markdown. Auto-scroll only pins to bottom while
 * the user is already there — otherwise a "jump to latest" pill appears.
 */
export function MessageList({ messages, status, error, isAdmin, onRetry, onFeedback, onEscalate }: MessageListProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const isAtBottomRef = useRef(true)
  const [isAtBottom, setIsAtBottom] = useState(true)

  const handleScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 48
    isAtBottomRef.current = atBottom
    setIsAtBottom(atBottom)
  }, [])

  useEffect(() => {
    if (!isAtBottomRef.current) return
    const el = scrollRef.current
    if (!el) return
    const reduceMotion =
      typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
    el.scrollTo({ top: el.scrollHeight, behavior: reduceMotion ? 'auto' : 'smooth' })
  }, [messages, error])

  function jumpToLatest() {
    const el = scrollRef.current
    if (!el) return
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    el.scrollTo({ top: el.scrollHeight, behavior: reduceMotion ? 'auto' : 'smooth' })
    isAtBottomRef.current = true
    setIsAtBottom(true)
  }

  const lastMessage = messages[messages.length - 1]
  const isBusy = status === 'submitted' || status === 'streaming'

  return (
    <div className="relative min-h-0 flex-1">
      <div ref={scrollRef} onScroll={handleScroll} className="absolute inset-0 overflow-y-auto py-6">
        <ul className="flex flex-col gap-6">
          {messages.map((message, index) => {
            const isLast = message.id === lastMessage?.id
            const isStreamingThis = isLast && message.role === 'assistant' && status === 'streaming'
            const text = textOfParts(message)
            const metadata = message.metadata as ChatMessageMetadata | undefined

            if (message.role === 'user') {
              return (
                <li key={message.id} className="flex justify-end">
                  <div className="max-w-[85%] rounded-card bg-surface-2 px-4 py-2.5 text-sm text-ink">
                    <p className="whitespace-pre-wrap">{text}</p>
                  </div>
                </li>
              )
            }

            if (message.role !== 'assistant') return null

            const citations = citedInText(metadata?.citations ?? [], text)
            const isComplete = !isLast || status === 'ready' || status === 'error'
            const showEscalationCard = isComplete && text.length > 0 && citations.length === 0

            return (
              <li key={message.id} className="flex gap-3">
                <span className="mt-1 h-5 w-5 shrink-0 rounded-full bg-primary" aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  {text ? (
                    <div className="markdown-body text-sm text-ink">
                      <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                        {text}
                      </ReactMarkdown>
                    </div>
                  ) : isLast && status === 'submitted' ? (
                    <p className="text-sm text-muted">Answering…</p>
                  ) : null}

                  {isStreamingThis ? (
                    <span className="ml-0.5 inline-block animate-pulse text-muted" aria-hidden="true">
                      ▍
                    </span>
                  ) : null}

                  <Citations citations={citations} />

                  {isComplete && text ? (
                    <Feedback
                      messageId={metadata?.dbId}
                      onSubmit={async (rating, comment) => {
                        if (metadata?.dbId) await onFeedback(metadata.dbId, rating, comment)
                      }}
                    />
                  ) : null}

                  {showEscalationCard ? (
                    <EscalationCard onAskHuman={() => onEscalate(lastUserQuestion(messages, index))} />
                  ) : null}
                </div>
              </li>
            )
          })}

          {error ? (
            <li key={`error-${messages.length}`}>
              <DegradedNotice
                key={`${error.kind}:${error.message}:${messages.length}`}
                error={error}
                isAdmin={isAdmin}
                onRetry={onRetry}
              />
            </li>
          ) : null}
        </ul>
      </div>

      {!isAtBottom ? (
        <button
          type="button"
          onClick={jumpToLatest}
          className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full border border-border bg-surface px-4 py-2 text-xs font-medium text-ink shadow-float hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
        >
          Jump to latest
        </button>
      ) : null}

      <p className="sr-only" role="status" aria-live="polite">
        {isBusy ? 'Answer in progress' : 'Answer complete'}
      </p>
    </div>
  )
}
