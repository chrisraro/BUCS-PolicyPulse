'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import type { ClassifiedChatError } from './types'

export interface DegradedNoticeProps {
  error: ClassifiedChatError
  isAdmin: boolean
  onRetry: () => void
}

const RETRY_COUNTDOWN_SECONDS = 5

/**
 * Inline, registrar-plain notice for the four degraded states the spec
 * defines: offline (no key), config error, mid-stream/rate-limit error, and
 * network disconnect. Free-tier "retrying in Ns" auto-retry (once) is
 * implemented for the rate-limit case only; the parent remounts this
 * component per distinct error occurrence, so the countdown always starts
 * fresh.
 */
export function DegradedNotice({ error, isAdmin, onRetry }: DegradedNoticeProps) {
  const isRateLimit = error.kind === 'stream' && error.message.startsWith('Free-tier limit reached')
  const [secondsLeft, setSecondsLeft] = useState(isRateLimit ? RETRY_COUNTDOWN_SECONDS : 0)
  const [autoRetried, setAutoRetried] = useState(false)

  useEffect(() => {
    if (!isRateLimit) return
    // setState calls live inside the interval's callback (an event-like,
    // deferred context), not synchronously in the effect body itself.
    const interval = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(interval)
          setAutoRetried(true)
          onRetry()
          return 0
        }
        return s - 1
      })
    }, 1000)
    return () => clearInterval(interval)
    // Runs once per distinct error occurrence — the parent remounts this
    // component (via a `key` keyed on the error) for every new error, so a
    // fresh effect run here always means "start counting down again".
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRateLimit])

  const showAdminLink = isAdmin && (error.kind === 'offline' || error.kind === 'config')
  const showRetryButton = error.kind === 'disconnect' || (error.kind === 'stream' && (!isRateLimit || autoRetried))

  return (
    <div
      role="alert"
      className="rounded-card border border-border bg-surface-2 px-4 py-3 text-sm text-ink"
    >
      <p>{isRateLimit && !autoRetried ? `Free-tier limit reached — retrying in ${secondsLeft}s…` : error.message}</p>
      {showAdminLink ? (
        <Link
          href="/admin/settings"
          className="mt-1 inline-block text-sm font-medium text-primary underline-offset-4 hover:underline"
        >
          Fix in AI Settings
        </Link>
      ) : null}
      {showRetryButton ? (
        <Button variant="secondary" className="mt-2" onClick={onRetry}>
          Retry
        </Button>
      ) : null}
    </div>
  )
}
