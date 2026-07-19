'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { cn } from '@/lib/cn'
import { isAllowedSignupEmail, SIGNUP_DOMAIN_ERROR } from '@/lib/auth'
import { createClient } from '@/lib/supabase/client'

export interface AuthGateDialogProps {
  open: boolean
  onClose: () => void
  /** Called once a session exists (sign-in succeeded, or sign-up returned one immediately). */
  onAuthenticated: () => void
}

type Mode = 'signin' | 'signup'

const inputClass = cn(
  'h-11 rounded-input border border-border bg-bg px-3 text-sm text-ink placeholder:text-muted',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface',
)

/**
 * Guest-first chat's sign-in/sign-up surface: opened whenever a signed-out
 * visitor tries to send a message, use "Ask a human", or taps "Sign in" in
 * the sidebar. Uses the browser Supabase client directly (not the server
 * actions in `src/app/login/actions.ts`) so it can stay inline in a dialog
 * instead of round-tripping through a page redirect.
 */
export function AuthGateDialog({ open, onClose, onAuthenticated }: AuthGateDialogProps) {
  const [mode, setMode] = useState<Mode>('signin')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  function switchMode(next: Mode) {
    setMode(next)
    setError(null)
    setNotice(null)
  }

  function handleClose() {
    onClose()
    // Reset once the close animation has a beat to finish, so the dialog
    // doesn't visibly flash back to defaults while it's still closing.
    setTimeout(() => {
      setMode('signin')
      setFullName('')
      setEmail('')
      setPassword('')
      setError(null)
      setNotice(null)
      setSubmitting(false)
    }, 200)
  }

  async function handleSignIn() {
    setError(null)
    setNotice(null)
    setSubmitting(true)
    try {
      const supabase = createClient()
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })
      if (signInError) {
        setError(mapAuthError(signInError.message, 'signin'))
        return
      }
      if (data.session) {
        onAuthenticated()
      }
    } finally {
      setSubmitting(false)
    }
  }

  async function handleSignUp() {
    setError(null)
    setNotice(null)

    const trimmedEmail = email.trim()
    if (!isAllowedSignupEmail(trimmedEmail)) {
      setError(SIGNUP_DOMAIN_ERROR)
      return
    }

    setSubmitting(true)
    try {
      const supabase = createClient()
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: trimmedEmail,
        password,
        options: { data: { full_name: fullName.trim() } },
      })
      if (signUpError) {
        setError(mapAuthError(signUpError.message, 'signup'))
        return
      }
      if (data.session) {
        onAuthenticated()
        return
      }
      // Email confirmation required — no session yet, so there's nothing to
      // send through. Point the visitor back to sign-in once they've confirmed.
      setNotice('Check your email to confirm your account, then sign in.')
      setMode('signin')
    } finally {
      setSubmitting(false)
    }
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (submitting) return
    void (mode === 'signup' ? handleSignUp() : handleSignIn())
  }

  return (
    <Dialog open={open} onClose={handleClose} title="Sign in to send" bottomSheet>
      <div className="flex flex-col gap-4">
        <p className="text-sm text-muted">PolicyPulse is for Bicol University accounts.</p>

        <div
          role="tablist"
          aria-label="Sign in or sign up"
          className="inline-flex gap-1 rounded-input bg-surface-2 p-1"
        >
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'signin'}
            onClick={() => switchMode('signin')}
            className={cn(
              'h-9 flex-1 rounded-input px-3 text-sm font-medium',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface',
              mode === 'signin' ? 'bg-surface text-ink shadow-float' : 'text-muted hover:text-ink',
            )}
          >
            Sign in
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'signup'}
            onClick={() => switchMode('signup')}
            className={cn(
              'h-9 flex-1 rounded-input px-3 text-sm font-medium',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface',
              mode === 'signup' ? 'bg-surface text-ink shadow-float' : 'text-muted hover:text-ink',
            )}
          >
            Sign up
          </button>
        </div>

        {notice ? (
          <p role="status" className="rounded-input border border-success bg-success/10 px-3 py-2 text-sm text-success">
            {notice}
          </p>
        ) : null}

        {error ? (
          <p role="alert" className="rounded-input border border-danger bg-danger/10 px-3 py-2 text-sm text-danger">
            {error}
          </p>
        ) : null}

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          {mode === 'signup' ? (
            <div className="flex flex-col gap-1.5">
              <label htmlFor="gate-full-name" className="text-sm font-medium text-ink">
                Full name
              </label>
              <input
                id="gate-full-name"
                type="text"
                required
                autoComplete="name"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                className={inputClass}
              />
            </div>
          ) : null}

          <div className="flex flex-col gap-1.5">
            <label htmlFor="gate-email" className="text-sm font-medium text-ink">
              Email
            </label>
            <input
              id="gate-email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className={inputClass}
            />
            {mode === 'signup' ? (
              <p className="text-xs text-muted">Use your @bicol-u.edu.ph school email.</p>
            ) : null}
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="gate-password" className="text-sm font-medium text-ink">
              Password
            </label>
            <input
              id="gate-password"
              type="password"
              required
              minLength={6}
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className={inputClass}
            />
          </div>

          <Button type="submit" variant="primary" size="touch" loading={submitting} className="mt-1 w-full">
            {mode === 'signup' ? 'Create account' : 'Sign in'}
          </Button>
        </form>
      </div>
    </Dialog>
  )
}

/**
 * Maps raw Supabase auth error text to registrar-plain copy. The DB trigger
 * (`enforce_email_domain`) rejects outside-domain signups even if the
 * client-side `isAllowedSignupEmail` pre-check were somehow bypassed — map
 * its error to the same friendly domain message used on the login page.
 *
 * The fallback never echoes the raw Supabase message back to the visitor —
 * that string can carry provider-internal details that aren't ours to leak.
 * Everything unmapped gets a mode-appropriate generic instead.
 */
function mapAuthError(message: string, mode: Mode): string {
  if (message.includes('restricted to @bicol-u.edu.ph')) return SIGNUP_DOMAIN_ERROR
  if (/invalid login credentials/i.test(message)) {
    return 'That email or password is incorrect.'
  }
  if (/already registered|already exists/i.test(message)) {
    return 'An account with that email already exists — sign in instead.'
  }
  return mode === 'signup'
    ? 'Sign-up failed — try again.'
    : 'Sign-in failed — check your email and password and try again.'
}
