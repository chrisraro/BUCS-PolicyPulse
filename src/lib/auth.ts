/**
 * Pure, environment-agnostic auth helpers — no `next/headers` or Supabase
 * client imports here so this module stays importable from vitest without
 * pulling in server-only globals. Server-dependent helpers (`requireUser`,
 * `requireAdmin`) live in `src/lib/auth-server.ts`.
 */

export type UserRole = 'student' | 'faculty' | 'admin'

/**
 * Maps a viewer's role to the set of document audiences they may retrieve.
 * student -> student only; faculty -> student+faculty; admin -> everything.
 */
export function audienceFor(role: UserRole): UserRole[] {
  switch (role) {
    case 'student':
      return ['student']
    case 'faculty':
      return ['student', 'faculty']
    case 'admin':
      return ['student', 'faculty', 'admin']
  }
}

/**
 * Friendly, client-side pre-check for the @bicol-u.edu.ph domain
 * restriction. The database trigger (`enforce_email_domain`) is the actual
 * enforcement — this only exists to short-circuit obviously-invalid signups
 * with a nicer error message before hitting Supabase.
 */
export function isAllowedSignupEmail(email: string): boolean {
  return email.trim().toLowerCase().endsWith('@bicol-u.edu.ph')
}

export const SIGNUP_DOMAIN_ERROR =
  'PolicyPulse is only available to Bicol University accounts — sign up with your @bicol-u.edu.ph email.'

// NOTE: `requireUser`/`requireAdmin` live in `./auth-server`, not here.
// Re-exporting them from this file (even as a barrel) transitively pulls in
// `server-only` + `next/headers` via the Supabase server client, which
// breaks `npm test` ("This module cannot be imported from a Client
// Component module" from vitest's non-Next runtime) — confirmed empirically
// while wiring this up. Import server-side auth helpers directly from
// `@/lib/auth-server`.
