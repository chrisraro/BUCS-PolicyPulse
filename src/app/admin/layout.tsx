import { redirect } from 'next/navigation'
import { createServerSupabase } from '@/lib/supabase/server'
import { ToastProvider, Toaster } from '@/components/ui/toast'
import { AdminNav } from './_components/admin-nav'

/**
 * Guarded admin shell. Deliberately does NOT use `requireAdmin()` (which
 * throws a `Response` — appropriate for Route Handlers/Server Actions, not
 * layouts/pages) — it checks the session + role directly and redirects.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createServerSupabase()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, email')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'admin') {
    redirect('/')
  }

  // Admin pages read/write via the service-role client. If the deployment is
  // missing SUPABASE_SECRET_KEY, every admin page would hard-crash — show the
  // owner exactly what to fix instead.
  if (!process.env.SUPABASE_SECRET_KEY) {
    return (
      <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-4">
        <div className="rounded-xl border border-border bg-surface p-6">
          <h1 className="font-serif text-xl font-semibold text-ink">Server not fully configured</h1>
          <p className="mt-3 text-sm leading-relaxed text-muted">
            The <code className="rounded bg-surface-2 px-1.5 py-0.5 text-ink">SUPABASE_SECRET_KEY</code>{' '}
            environment variable is not set on this deployment, so the admin area cannot reach the
            database. Create a secret key in the Supabase dashboard (Project Settings → API Keys),
            add it to the Vercel project&apos;s environment variables, and redeploy.
          </p>
        </div>
      </main>
    )
  }

  return (
    <ToastProvider>
      <div className="flex min-h-screen flex-col md:flex-row">
        <AdminNav email={profile.email} />
        <main className="min-w-0 flex-1 px-4 py-6 md:px-8 md:py-8">{children}</main>
      </div>
      <Toaster />
    </ToastProvider>
  )
}
