'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/theme-toggle'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/cn'
import type { ChatAppUser, ChatSessionSummary } from './types'

export interface SidebarProps {
  sessions: ChatSessionSummary[]
  activeSessionId: string | undefined
  loadingSessionId: string | null
  onSelectSession: (id: string) => void
  onNewChat: () => void
  onRequestDelete: (id: string) => void
  user: ChatAppUser
  isAdmin: boolean
  /** Closes the mobile drawer after a navigating action. No-op on desktop. */
  onNavigate?: () => void
}

function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime()
  const diffMin = Math.round(diffMs / 60000)
  if (diffMin < 1) return 'just now'
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHr = Math.round(diffMin / 60)
  if (diffHr < 24) return `${diffHr}h ago`
  const diffDay = Math.round(diffHr / 24)
  if (diffDay < 7) return `${diffDay}d ago`
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export function Sidebar({
  sessions,
  activeSessionId,
  loadingSessionId,
  onSelectSession,
  onNewChat,
  onRequestDelete,
  user,
  isAdmin,
  onNavigate,
}: SidebarProps) {
  const [signingOut, setSigningOut] = useState(false)
  const initial = (user.name || 'U').trim().charAt(0).toUpperCase() || 'U'

  async function handleSignOut() {
    setSigningOut(true)
    try {
      const supabase = createClient()
      await supabase.auth.signOut()
      window.location.href = '/login'
    } catch {
      setSigningOut(false)
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="p-4">
        <Button
          variant="primary"
          className="w-full"
          onClick={() => {
            onNewChat()
            onNavigate?.()
          }}
        >
          New chat
        </Button>
      </div>

      <nav className="min-h-0 flex-1 overflow-y-auto px-2 pb-2" aria-label="Chat sessions">
        {sessions.length === 0 ? (
          <p className="px-2 py-4 text-sm text-muted">No chats yet — ask a question to start one.</p>
        ) : (
          <ul className="flex flex-col gap-1">
            {sessions.map((session) => {
              const isActive = session.id === activeSessionId
              const isLoading = session.id === loadingSessionId
              return (
                <li key={session.id} className="group relative">
                  <button
                    type="button"
                    onClick={() => {
                      onSelectSession(session.id)
                      onNavigate?.()
                    }}
                    aria-current={isActive ? 'page' : undefined}
                    className={cn(
                      'flex w-full flex-col items-start gap-0.5 rounded-input px-3 py-2.5 pr-12 text-left text-sm',
                      isActive ? 'bg-primary-subtle text-primary' : 'text-ink hover:bg-surface-2',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface',
                      'transition-colors duration-[var(--duration-fast)] ease-[var(--ease-out)]',
                    )}
                  >
                    {isLoading ? (
                      <span className="h-4 w-3/4 animate-pulse rounded bg-surface-2" aria-hidden="true" />
                    ) : (
                      <>
                        <span className="w-full truncate font-medium">{session.title}</span>
                        <span className="text-xs text-muted">{relativeTime(session.updated_at)}</span>
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    aria-label={`Delete "${session.title}"`}
                    onClick={(event) => {
                      event.stopPropagation()
                      onRequestDelete(session.id)
                    }}
                    className={cn(
                      // Hidden by default on hover-capable (mouse) pointers, revealed on
                      // hover or keyboard focus-within — but on coarse/touch pointers
                      // (no hover concept) it stays persistently visible at reduced
                      // opacity, since group-hover would never trigger there.
                      'absolute top-1/2 right-1 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-input text-muted opacity-0',
                      'pointer-coarse:opacity-60',
                      'group-hover:opacity-100 group-focus-within:opacity-100 hover:bg-surface-2 hover:text-danger',
                      'focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                      'transition-opacity duration-[var(--duration-fast)] ease-[var(--ease-out)]',
                    )}
                  >
                    <span aria-hidden="true" className="text-base leading-none">
                      &times;
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </nav>

      <div className="border-t border-border p-3">
        <div className="flex items-center gap-2 px-1 py-1">
          <span
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-ink"
            aria-hidden="true"
          >
            {initial}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-ink">{user.name}</p>
            <span className="inline-flex items-center rounded-full bg-surface-2 px-2 py-0.5 text-xs text-muted capitalize">
              {user.role}
            </span>
          </div>
          <ThemeToggle />
        </div>
        <div className="mt-2 flex items-center gap-1">
          {isAdmin ? (
            <Link
              href="/admin"
              className="flex h-10 flex-1 items-center justify-center rounded-input px-3 text-center text-sm font-medium text-ink hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
            >
              Admin
            </Link>
          ) : null}
          <button
            type="button"
            onClick={handleSignOut}
            disabled={signingOut}
            className="flex h-10 flex-1 items-center justify-center rounded-input px-3 text-center text-sm font-medium text-ink hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface disabled:cursor-not-allowed disabled:opacity-60"
          >
            {signingOut ? 'Signing out…' : 'Sign out'}
          </button>
        </div>
      </div>
    </div>
  )
}
