import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

/**
 * Server-side, RLS-scoped Supabase client for Server Components, Server
 * Actions, and Route Handlers. Always create a new instance per request —
 * never cache/share this across requests.
 *
 * `setAll` is wrapped in try/catch because Server Components cannot set
 * cookies (Next.js throws) — session refresh in that case is handled by
 * `src/proxy.ts` instead.
 */
export async function createServerSupabase() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options)
            }
          } catch {
            // Called from a Server Component — session refresh is handled by
            // `src/proxy.ts`, so this can be safely ignored.
          }
        },
      },
    },
  )
}
