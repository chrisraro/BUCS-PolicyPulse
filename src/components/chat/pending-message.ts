/**
 * Thin wrapper around `sessionStorage` for the guest-first chat flow: a
 * guest's typed message is held here across the sign-in redirect/reload so
 * it can auto-send once the session becomes authenticated (see
 * `ChatApp`'s guest-mode wiring in `chat-app.tsx`).
 *
 * `Storage` is an injectable parameter (rather than reaching for the global
 * directly) so this stays pure enough for `npm test`'s node environment,
 * where no `sessionStorage` global exists — tests pass in a Map-backed fake.
 * Every operation is wrapped in try/catch: private-browsing quota errors (or
 * a browser with storage disabled entirely) degrade to a safe no-op rather
 * than throwing, per DESIGN.md's "free-tier honest" — never crash — stance.
 */

export const PENDING_MESSAGE_KEY = 'pp.pendingMessage'

function resolveStorage(storage?: Storage): Storage | null {
  if (storage) return storage
  // `typeof` never throws on a missing global, so this is safe to evaluate
  // in both the browser and vitest's node environment.
  if (typeof sessionStorage !== 'undefined') return sessionStorage
  return null
}

/** Saves the guest's pending message. Silently no-ops if storage is unavailable. */
export function savePending(text: string, storage?: Storage): void {
  const store = resolveStorage(storage)
  if (!store) return
  try {
    store.setItem(PENDING_MESSAGE_KEY, text)
  } catch {
    // Private-mode quota (or storage disabled) — the guest just re-types
    // their message after signing in.
  }
}

/** Returns the pending message (if any) and clears it. Never throws. */
export function takePending(storage?: Storage): string | null {
  const store = resolveStorage(storage)
  if (!store) return null
  try {
    const value = store.getItem(PENDING_MESSAGE_KEY)
    if (value === null) return null
    store.removeItem(PENDING_MESSAGE_KEY)
    return value
  } catch {
    return null
  }
}
