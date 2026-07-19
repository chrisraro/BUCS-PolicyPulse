import { redirect } from 'next/navigation'
import { ChatApp } from '@/components/chat/chat-app'
import type { ChatSessionSummary } from '@/components/chat/types'
import { ToastProvider, Toaster } from '@/components/ui/toast'
import type { UserRole } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { createServerSupabase } from '@/lib/supabase/server'

export default async function Home() {
  const supabase = await createServerSupabase()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // The proxy already gates unauthenticated requests before they reach this
  // route — this is belt-and-braces for direct/edge-case hits.
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, full_name, email')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login')

  const { data: sessions } = await supabase
    .from('chat_sessions')
    .select('id, title, updated_at')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })

  // RLS scopes this to documents the viewer's role may see; explicitly
  // restricting to `indexed` (rather than relying on the admin-all policy,
  // which also surfaces pending/processing/failed rows) keeps the welcome
  // screen's "at least one document is ready" check accurate for admins too.
  const { count } = await supabase
    .from('documents')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'indexed')

  // `ai_settings` is admin-only under RLS, but every role needs to know
  // whether the assistant is configured at all (welcome screen empty
  // state) — read it with the service-role client and reduce it to a
  // boolean immediately. Only that boolean crosses into client props;
  // the key itself never leaves this server component.
  // If the server itself is not fully configured (SUPABASE_SECRET_KEY absent,
  // e.g. a fresh deploy), degrade to the offline state instead of crashing —
  // free-tier honesty applies to our own misconfiguration too.
  let aiConfigured = false
  try {
    const { data: aiSettings } = await createAdminClient()
      .from('ai_settings')
      .select('api_key, verified_at')
      .eq('id', 1)
      .single()
    aiConfigured = !!aiSettings?.api_key
  } catch {
    aiConfigured = false
  }

  const role = profile.role as UserRole
  const name = (profile.full_name as string) || (profile.email as string) || user.email || 'Account'

  return (
    <ToastProvider>
      <Toaster />
      <ChatApp
        initialSessions={(sessions ?? []) as ChatSessionSummary[]}
        user={{ name, role }}
        hasIndexedDocs={(count ?? 0) > 0}
        isAdmin={role === 'admin'}
        assistantOffline={!aiConfigured}
      />
    </ToastProvider>
  )
}
