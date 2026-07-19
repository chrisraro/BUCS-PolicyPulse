import 'server-only'
import { redirect } from 'next/navigation'
import type { User } from '@supabase/supabase-js'
import { createServerSupabase } from '@/lib/supabase/server'
import type { UserRole } from '@/lib/auth'

export interface Profile {
  role: UserRole
  full_name: string
  email: string
}

export interface AuthContext {
  user: User
  role: UserRole
  profile: Profile
}

/**
 * Loads the current session's user + profile row, or throws a 401 Response.
 * Callers in Route Handlers/Server Actions should catch and return/throw the
 * Response as-is (see `src/app/api/chat/route.ts` for the pattern).
 */
export async function requireUser(): Promise<AuthContext> {
  const supabase = await createServerSupabase()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Response('Unauthorized', { status: 401 })
  }

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('role, full_name, email')
    .eq('id', user.id)
    .single()

  if (error || !profile) {
    throw new Response('Unauthorized', { status: 401 })
  }

  return { user, role: profile.role as UserRole, profile: profile as Profile }
}

/**
 * Same as `requireUser` but additionally throws a 403 Response when the
 * caller's role is not `admin`.
 */
export async function requireAdmin(): Promise<AuthContext> {
  const ctx = await requireUser()
  if (ctx.role !== 'admin') {
    throw new Response('Forbidden', { status: 403 })
  }
  return ctx
}

/**
 * Per-page authorization for admin Server Components. The `/admin` layout
 * already redirects non-admins, but every admin page under it fetches data
 * with `createAdminClient()` (the RLS-bypassing service-role client) — this
 * gives each page its own independent check rather than relying solely on
 * the shared layout, matching the layout's redirect-based (not throw-based)
 * pattern since Server Components can't catch/return a thrown `Response`.
 */
export async function requireAdminPage(): Promise<AuthContext> {
  const supabase = await createServerSupabase()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('role, full_name, email')
    .eq('id', user.id)
    .single()

  if (error || !profile || profile.role !== 'admin') {
    redirect('/')
  }

  return { user, role: profile.role as UserRole, profile: profile as Profile }
}
