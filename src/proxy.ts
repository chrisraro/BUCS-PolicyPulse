import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Next.js 16 renamed the `middleware.ts` convention to `proxy.ts` (same
// runtime behavior, new name/export) — see the "Migration to Proxy" section
// of node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md.
// '/api/keepalive' is hit by Vercel Cron with no session cookie — its own
// `CRON_SECRET` header check (src/app/api/keepalive/route.ts) is the gate,
// so it must not be redirected to /login here first.
const PUBLIC_PATHS = ['/login', '/api/keepalive']

// The chat home is publicly viewable (guest-first chat: composer is enabled,
// sending is gated client-side behind sign-in — see `src/app/page.tsx`'s
// guest branch and `ChatApp`'s guest mode). This is an *exact* match, not a
// prefix — every other path (admin, api routes other than keepalive,
// sessions, …) stays gated. `/api/chat` in particular stays auth-required
// server-side (`requireUser` in the route handler) as defense in depth.
const PUBLIC_EXACT_PATHS = ['/']

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value)
          }
          response = NextResponse.next({ request })
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options)
          }
        },
      },
    },
  )

  // Refresh the session (if needed) before checking auth state — required so
  // token refreshes are written back to cookies via `setAll` above.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl
  const isPublicPath =
    PUBLIC_PATHS.some((path) => pathname.startsWith(path)) || PUBLIC_EXACT_PATHS.includes(pathname)

  if (!user && !isPublicPath) {
    const redirectUrl = new URL('/login', request.url)
    return NextResponse.redirect(redirectUrl)
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static, _next/image (Next.js internals)
     * - favicon.ico and common static image extensions
     */
    '/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
