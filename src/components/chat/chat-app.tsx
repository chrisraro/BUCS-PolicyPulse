'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import { AuthGateDialog } from './auth-gate-dialog'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { useToast } from '@/components/ui/toast'
import { cn } from '@/lib/cn'
import type { Citation } from '@/lib/rag/citations'
import { classifyChatError } from './chat-error'
import { Composer } from './composer'
import { EscalationButton, EscalationDialog } from './escalation'
import { lastUserQuestion } from './message-text'
import { MessageList } from './message-list'
import { savePending, takePending } from './pending-message'
import { Sidebar } from './sidebar'
import type { ChatAppUser, ChatMessageMetadata, ChatSessionSummary, ChatUIMessage } from './types'
import { Welcome } from './welcome'

export interface ChatAppProps {
  initialSessions: ChatSessionSummary[]
  /** `null` for a signed-out guest — see the guest branch in `src/app/page.tsx`. */
  user: ChatAppUser | null
  hasIndexedDocs: boolean
  isAdmin: boolean
  /** True when no AI provider key is configured yet — surfaced on the welcome screen. */
  assistantOffline: boolean
}

interface SessionMessageRow {
  id: string
  role: 'user' | 'assistant'
  content: string
  citations: Citation[]
  created_at: string
}

function dbRowsToMessages(rows: SessionMessageRow[]): ChatUIMessage[] {
  return rows.map((row) => ({
    id: row.id,
    role: row.role,
    parts: [{ type: 'text' as const, text: row.content, state: 'done' as const }],
    metadata: { dbId: row.id, citations: row.citations ?? [] },
  }))
}

/**
 * Fetches the persisted DB rows for a session, retrying once (server-side
 * persistence in the chat route's `onEnd` can lag the client's "ready"
 * status by a beat) if fewer rows than expected have landed yet.
 */
async function fetchSessionMessagesWithRetry(
  sessionId: string,
  expectedCount: number,
): Promise<SessionMessageRow[] | null> {
  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await fetch(`/api/sessions/${sessionId}`)
    if (!res.ok) return null
    const data = (await res.json()) as { messages: SessionMessageRow[] }
    if (data.messages.length >= expectedCount || attempt === 1) return data.messages
    await new Promise((resolve) => setTimeout(resolve, 500))
  }
  return null
}

/**
 * Client orchestrator: `useChat` wiring, session switching/history hydration,
 * new chat / delete, and the shared feedback/escalation dialog state.
 *
 * `useChat` verified against the installed `@ai-sdk/react`/`ai` packages:
 * - `sendMessage({ text })`, `regenerate()`, `stop()`, `setMessages()`, `clearError()`,
 *   `status` (`'submitted' | 'streaming' | 'ready' | 'error'`), `messages`, `error`.
 *   `clearError` is called before every `setMessages` swap (new chat / session
 *   select) so a failed request's error banner never leaks into a different
 *   conversation — `useChat`'s `error` state is sticky across `setMessages`
 *   calls and is only otherwise cleared by the next `sendMessage`/`regenerate`.
 * - `sessionId` rides in the request body via `DefaultChatTransport`'s
 *   `body` option, closing over `activeSessionId` state. `useChat` itself
 *   re-reads whatever `transport` was passed on the *last* render through an
 *   internal `latestRef` (see `@ai-sdk/react`'s `useChat` source) before every
 *   actual send, so a plain per-render transport object — no manual ref
 *   plumbing needed here — always carries the current session id.
 */
export function ChatApp({ initialSessions, user, hasIndexedDocs, isAdmin, assistantOffline }: ChatAppProps) {
  const { showToast } = useToast()
  const isGuest = user === null

  const [sessions, setSessions] = useState<ChatSessionSummary[]>(initialSessions)
  const [activeSessionId, setActiveSessionId] = useState<string | undefined>(undefined)
  const [loadingSessionId, setLoadingSessionId] = useState<string | null>(null)

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<ChatSessionSummary | null>(null)
  const [deleting, setDeleting] = useState(false)

  const [escalationOpen, setEscalationOpen] = useState(false)
  const [escalationQuestion, setEscalationQuestion] = useState('')
  const [escalating, setEscalating] = useState(false)

  // Guest-first chat: a signed-out visitor's typed message is held here
  // (rather than sent) until they sign in through `AuthGateDialog`.
  const [authGateOpen, setAuthGateOpen] = useState(false)
  const [pendingGuestText, setPendingGuestText] = useState<string | null>(null)

  const pendingTitleRef = useRef<string | null>(null)
  const lastBackfilledKeyRef = useRef<string | null>(null)
  const autoSentRef = useRef(false)

  const transport = useMemo(
    () =>
      new DefaultChatTransport<ChatUIMessage>({
        api: '/api/chat',
        body: { sessionId: activeSessionId },
      }),
    [activeSessionId],
  )

  const chat = useChat<ChatUIMessage>({ transport })
  const error = chat.error ? classifyChatError(chat.error) : null

  // Guest-first chat's other half: a message held in sessionStorage across
  // the sign-in reload (see `AuthGateDialog`'s `onAuthenticated` handler
  // below) auto-sends once this component mounts signed-in. Guarded by a
  // ref (not just the empty dep array) so React 19 Strict Mode's
  // mount-unmount-remount in dev can't double-send it.
  useEffect(() => {
    if (isGuest || autoSentRef.current) return
    autoSentRef.current = true
    const pending = takePending()
    if (!pending) return
    if (!activeSessionId) {
      pendingTitleRef.current = pending.slice(0, 60) || 'New chat'
    }
    void chat.sendMessage({ text: pending })
    // Intentionally mount-only: `chat`/`activeSessionId` identity changes
    // shouldn't re-trigger this, only the guard ref should.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Track the session id as soon as the server assigns one (it rides on the
  // 'start' stream part's metadata), keeping the sidebar list in sync: a
  // brand-new session gets inserted at the top, an existing one gets bumped.
  useEffect(() => {
    const last = chat.messages[chat.messages.length - 1]
    const sid = (last?.metadata as ChatMessageMetadata | undefined)?.sessionId
    if (!sid || sid === activeSessionId) return
    setActiveSessionId(sid)
    setSessions((prev) => {
      const existing = prev.find((s) => s.id === sid)
      const title = existing?.title ?? pendingTitleRef.current ?? 'New chat'
      pendingTitleRef.current = null
      const rest = prev.filter((s) => s.id !== sid)
      return [{ id: sid, title, updated_at: new Date().toISOString() }, ...rest]
    })
  }, [chat.messages, activeSessionId])

  const backfillMessageIds = useCallback(
    async (sessionId: string, expectedCount: number): Promise<void> => {
      try {
        const rows = await fetchSessionMessagesWithRetry(sessionId, expectedCount)
        if (!rows) return
        chat.setMessages((current) =>
          current.map((message, index) => {
            const row = rows[index]
            if (!row) return message
            const prevMeta = (message.metadata ?? {}) as ChatMessageMetadata
            const nextMeta: ChatMessageMetadata = { ...prevMeta, dbId: row.id }
            if (message.role === 'assistant' && !prevMeta.citations) {
              nextMeta.citations = row.citations
            }
            return { ...message, metadata: nextMeta }
          }),
        )
      } catch {
        // Network hiccup — feedback stays disabled until the next successful backfill.
      }
    },
    [chat],
  )

  // Once a turn finishes, quietly fetch the persisted DB rows and backfill
  // their ids onto the rendered messages (the live stream never carries one).
  useEffect(() => {
    if (chat.status !== 'ready') return
    const sid = activeSessionId
    if (!sid) return
    const key = `${sid}:${chat.messages.length}`
    if (lastBackfilledKeyRef.current === key) return
    lastBackfilledKeyRef.current = key
    void backfillMessageIds(sid, chat.messages.length)
  }, [chat.status, chat.messages.length, activeSessionId, backfillMessageIds])

  function closeDrawer() {
    setDrawerOpen(false)
  }

  function handleNewChat() {
    if (chat.status === 'streaming' || chat.status === 'submitted') chat.stop()
    setActiveSessionId(undefined)
    chat.clearError()
    chat.setMessages([])
    closeDrawer()
  }

  async function handleSelectSession(id: string) {
    if (id === activeSessionId) {
      closeDrawer()
      return
    }
    if (chat.status === 'streaming' || chat.status === 'submitted') chat.stop()
    setLoadingSessionId(id)
    try {
      const res = await fetch(`/api/sessions/${id}`)
      if (!res.ok) {
        showToast({ title: 'Could not load that chat', description: 'Try again in a moment.' })
        return
      }
      const data = (await res.json()) as { messages: SessionMessageRow[] }
      setActiveSessionId(id)
      chat.clearError()
      chat.setMessages(dbRowsToMessages(data.messages))
    } finally {
      setLoadingSessionId(null)
      closeDrawer()
    }
  }

  function requestDeleteSession(id: string) {
    const target = sessions.find((s) => s.id === id)
    if (target) setDeleteTarget(target)
  }

  async function confirmDeleteSession() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/sessions/${deleteTarget.id}`, { method: 'DELETE' })
      if (!res.ok) {
        showToast({ title: 'Could not delete that chat' })
        return
      }
      const deletedId = deleteTarget.id
      setSessions((prev) => prev.filter((s) => s.id !== deletedId))
      setDeleteTarget(null)
      if (deletedId === activeSessionId) {
        handleNewChat()
      }
    } finally {
      setDeleting(false)
    }
  }

  function handleSend(text: string) {
    // Guest-first chat's core rule: sending is paused for a signed-out
    // visitor. The message is held (not lost) and the auth gate opens;
    // `handleAuthenticated` below is what actually pushes it through.
    if (isGuest) {
      setPendingGuestText(text)
      setAuthGateOpen(true)
      return
    }
    if (!activeSessionId) {
      pendingTitleRef.current = text.slice(0, 60) || 'New chat'
    }
    void chat.sendMessage({ text })
  }

  function handleRetry() {
    void chat.regenerate()
  }

  /** Opens sign-in/sign-up. Escalation ("Ask a human") needs auth too, for guests. */
  function openAuthGate() {
    setAuthGateOpen(true)
  }

  /**
   * Fires once `AuthGateDialog` confirms a session exists. If there was a
   * held guest message, persist it to sessionStorage and reload — the
   * server components re-render authenticated, and the mount effect above
   * picks the message back up and sends it through the normal path.
   *
   * If sessionStorage itself is unavailable (private-mode quota, storage
   * disabled), `savePending` returns `false` and a reload would silently
   * drop the message — the mount effect would find nothing to pick back up.
   * Instead, send it directly through the already-mounted `chat` instance:
   * the browser Supabase client just set auth cookies, so `/api/chat`
   * accepts the request even though server-rendered props (the sidebar,
   * `user`) stay stale until the next navigation. Degraded but honest —
   * the message still gets through, which is the product promise.
   */
  function handleAuthenticated() {
    if (pendingGuestText) {
      const saved = savePending(pendingGuestText)
      if (!saved) {
        const text = pendingGuestText
        setAuthGateOpen(false)
        setPendingGuestText(null)
        if (!activeSessionId) {
          pendingTitleRef.current = text.slice(0, 60) || 'New chat'
        }
        void chat.sendMessage({ text })
        return
      }
    }
    window.location.reload()
  }

  async function handleFeedback(messageId: string, rating: 'up' | 'down', comment?: string) {
    const res = await fetch('/api/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messageId, rating, comment }),
    })
    if (!res.ok) {
      showToast({ title: "Couldn't save your feedback — try again." })
      throw new Error('feedback submission failed')
    }
  }

  function openEscalation(prefill: string) {
    // Escalations need an authenticated identity — a guest gets the auth
    // gate instead (see DESIGN.md's header "Ask a human" note).
    if (isGuest) {
      setAuthGateOpen(true)
      return
    }
    setEscalationQuestion(prefill)
    setEscalationOpen(true)
  }

  async function submitEscalation() {
    setEscalating(true)
    try {
      const res = await fetch('/api/escalations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: escalationQuestion, sessionId: activeSessionId }),
      })
      if (!res.ok) {
        showToast({ title: 'Could not send that question', description: 'Try again in a moment.' })
        return
      }
      setEscalationOpen(false)
      showToast({ title: 'Sent — an admin will follow up' })
    } finally {
      setEscalating(false)
    }
  }

  const initial = (user?.name || 'U').trim().charAt(0).toUpperCase() || 'U'
  const isBusy = chat.status === 'streaming' || chat.status === 'submitted'

  return (
    <div className="flex h-dvh bg-bg text-ink">
      <div className="hidden w-[288px] shrink-0 border-r border-border bg-surface lg:block">
        <Sidebar
          sessions={sessions}
          activeSessionId={activeSessionId}
          loadingSessionId={loadingSessionId}
          onSelectSession={handleSelectSession}
          onNewChat={handleNewChat}
          onRequestDelete={requestDeleteSession}
          user={user}
          isAdmin={isAdmin}
          onSignIn={openAuthGate}
        />
      </div>

      {/* Always mounted (not conditionally rendered) so the slide/fade can
          transition both ways — a conditionally-mounted drawer just snaps in
          and out with no transition to animate through. `inert` (React 19)
          removes it from the accessibility tree, tab order, and pointer/click
          handling entirely while closed, so the off-screen-but-present panel
          and its full-bleed overlay button never trap focus or intercept taps. */}
      <div className="fixed inset-0 z-[var(--z-drawer)] lg:hidden" inert={!drawerOpen}>
        <button
          type="button"
          aria-label="Close menu"
          onClick={closeDrawer}
          className={cn(
            'absolute inset-0 bg-[var(--overlay)] transition-opacity duration-[var(--duration-slow)] ease-[var(--ease-out)]',
            drawerOpen ? 'opacity-100' : 'opacity-0',
          )}
        />
        <DrawerPanel onClose={closeDrawer} open={drawerOpen}>
          <Sidebar
            sessions={sessions}
            activeSessionId={activeSessionId}
            loadingSessionId={loadingSessionId}
            onSelectSession={handleSelectSession}
            onNewChat={handleNewChat}
            onRequestDelete={requestDeleteSession}
            user={user}
            isAdmin={isAdmin}
            onSignIn={openAuthGate}
            onNavigate={closeDrawer}
          />
        </DrawerPanel>
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-[var(--z-sticky)] flex items-center gap-2 border-b border-border bg-surface px-4 py-3 [@media(max-height:500px)]:py-1.5">
          <button
            type="button"
            aria-label="Open menu"
            onClick={() => setDrawerOpen(true)}
            className="flex h-11 w-11 items-center justify-center rounded-input text-ink hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface lg:hidden"
          >
            <HamburgerIcon />
          </button>
          <span className="font-serif text-lg font-semibold text-ink lg:hidden">PolicyPulse</span>
          <div className="ml-auto flex items-center gap-2">
            <EscalationButton onClick={() => openEscalation(lastUserQuestion(chat.messages))} />
          </div>
          <span
            className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-ink lg:hidden"
            aria-hidden="true"
          >
            {initial}
          </span>
        </header>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="mx-auto flex min-h-0 w-full max-w-[46rem] flex-1 flex-col overflow-hidden px-4 sm:px-6">
            {loadingSessionId ? (
              <MessageAreaSkeleton />
            ) : chat.messages.length === 0 ? (
              isGuest && pendingGuestText ? (
                <GuestHeldMessage
                  text={pendingGuestText}
                  onSignIn={() => setAuthGateOpen(true)}
                  onDiscard={() => setPendingGuestText(null)}
                />
              ) : (
                <Welcome
                  hasIndexedDocs={hasIndexedDocs}
                  isAdmin={isAdmin}
                  assistantOffline={assistantOffline}
                  onPrompt={handleSend}
                />
              )
            ) : (
              <MessageList
                messages={chat.messages}
                status={chat.status}
                error={error}
                isAdmin={isAdmin}
                onRetry={handleRetry}
                onFeedback={handleFeedback}
                onEscalate={openEscalation}
              />
            )}
          </div>
        </div>

        <Composer disabled={isBusy} isBusy={isBusy} onSubmit={handleSend} onStop={() => chat.stop()} />
      </div>

      <Dialog open={deleteTarget != null} onClose={() => setDeleteTarget(null)} title="Delete this chat?">
        <div className="flex flex-col gap-4">
          <p className="text-sm text-muted">
            {deleteTarget ? `"${deleteTarget.title}" and its messages will be permanently deleted.` : ''}
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button variant="danger" loading={deleting} onClick={() => void confirmDeleteSession()}>
              Delete
            </Button>
          </div>
        </div>
      </Dialog>

      <EscalationDialog
        open={escalationOpen}
        onClose={() => setEscalationOpen(false)}
        question={escalationQuestion}
        onQuestionChange={setEscalationQuestion}
        onSubmit={submitEscalation}
        submitting={escalating}
      />

      <AuthGateDialog
        open={authGateOpen}
        onClose={() => setAuthGateOpen(false)}
        onAuthenticated={handleAuthenticated}
      />
    </div>
  )
}

/**
 * Guest-first chat's held state: a signed-out visitor's typed message stays
 * visible (never silently dropped) while the auth gate is open or closed
 * again without signing in. Styled like the user message bubble
 * (DESIGN.md's Message bubble spec) so it reads as "your message, waiting".
 */
function GuestHeldMessage({
  text,
  onSignIn,
  onDiscard,
}: {
  text: string
  onSignIn: () => void
  onDiscard: () => void
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 py-16 text-center">
      <div className="flex w-full justify-end">
        <div className="max-w-[85%] rounded-card bg-surface-2 px-4 py-2.5 text-left text-sm text-ink">
          <p className="whitespace-pre-wrap">{text}</p>
        </div>
      </div>
      <p className="max-w-sm text-sm text-muted">
        Sign in with your BU email to send this message.
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        <Button variant="primary" size="touch" onClick={onSignIn}>
          Sign in to send
        </Button>
        <Button variant="ghost" size="touch" onClick={onDiscard}>
          Discard
        </Button>
      </div>
    </div>
  )
}

/**
 * Shown in the message column while a session's history is being fetched
 * (`handleSelectSession`'s `loadingSessionId` window) — replaces the previous
 * session's messages/the empty state with a placeholder instead of leaving a
 * stale or blank column up while the fetch is in flight.
 */
function MessageAreaSkeleton() {
  return (
    <div className="flex flex-1 flex-col justify-center gap-4 py-6">
      <p role="status" aria-live="polite" className="sr-only">
        Loading conversation…
      </p>
      <div className="pp-skeleton h-4 w-2/3" aria-hidden="true" />
      <div className="pp-skeleton h-4 w-full" aria-hidden="true" />
      <div className="pp-skeleton h-4 w-5/6" aria-hidden="true" />
    </div>
  )
}

function HamburgerIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  )
}

/**
 * Slide-over drawer content: focus-trapped, closes on Escape or overlay tap.
 * Stays mounted (see the always-rendered wrapper above) and slides via
 * `transform` — the focus trap/auto-focus only (re)arms while `open` is true,
 * matching what used to be mount/unmount-driven when this was conditionally
 * rendered.
 */
function DrawerPanel({
  children,
  onClose,
  open,
}: {
  children: React.ReactNode
  onClose: () => void
  open: boolean
}) {
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const panel = panelRef.current
    if (!panel) return
    const previouslyFocused = document.activeElement as HTMLElement | null
    const focusableSelector =
      'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
    panel.querySelectorAll<HTMLElement>(focusableSelector)[0]?.focus()

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose()
        return
      }
      if (event.key !== 'Tab' || !panel) return
      const items = Array.from(panel.querySelectorAll<HTMLElement>(focusableSelector))
      if (items.length === 0) return
      const first = items[0]
      const last = items[items.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      previouslyFocused?.focus()
    }
  }, [onClose, open])

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-modal="true"
      aria-label="Chat sessions"
      className={cn(
        'relative h-full w-[288px] max-w-[85vw] border-r border-border bg-surface',
        'transition-transform duration-[var(--duration-slow)] ease-[var(--ease-out)]',
        open ? 'translate-x-0' : '-translate-x-full',
      )}
    >
      {children}
    </div>
  )
}
