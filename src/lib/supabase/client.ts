import { createBrowserClient } from '@supabase/ssr'

/**
 * Browser-side Supabase client. Uses the public, RLS-scoped publishable key —
 * safe to call from any client component.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  )
}
