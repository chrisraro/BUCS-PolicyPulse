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
