import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

interface DashboardCounts {
  totalUsers: number
  chats7d: number
  messages7d: number
  thumbsUp: number
  thumbsDown: number
  openEscalations: number
  indexedDocuments: number
  keyVerified: boolean
}

async function getCounts(): Promise<DashboardCounts> {
  const admin = createAdminClient()
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  const [
    totalUsers,
    chats7d,
    messages7d,
    thumbsUp,
    thumbsDown,
    openEscalations,
    indexedDocuments,
    aiSettings,
  ] = await Promise.all([
    admin.from('profiles').select('*', { count: 'exact', head: true }),
    admin
      .from('chat_sessions')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', sevenDaysAgo),
    admin
      .from('chat_messages')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', sevenDaysAgo),
    admin.from('feedback').select('*', { count: 'exact', head: true }).eq('rating', 'up'),
    admin.from('feedback').select('*', { count: 'exact', head: true }).eq('rating', 'down'),
    admin.from('escalations').select('*', { count: 'exact', head: true }).eq('status', 'open'),
    admin.from('documents').select('*', { count: 'exact', head: true }).eq('status', 'indexed'),
    admin.from('ai_settings').select('api_key, verified_at').eq('id', 1).single(),
  ])

  return {
    totalUsers: totalUsers.count ?? 0,
    chats7d: chats7d.count ?? 0,
    messages7d: messages7d.count ?? 0,
    thumbsUp: thumbsUp.count ?? 0,
    thumbsDown: thumbsDown.count ?? 0,
    openEscalations: openEscalations.count ?? 0,
    indexedDocuments: indexedDocuments.count ?? 0,
    keyVerified: Boolean(aiSettings.data?.api_key && aiSettings.data?.verified_at),
  }
}

export default async function AdminDashboardPage() {
  const counts = await getCounts()
  const docsIndexed = counts.indexedDocuments > 0
  const setupComplete = counts.keyVerified && docsIndexed

  const rows: { label: string; value: string | number }[] = [
    { label: 'Total users', value: counts.totalUsers },
    { label: 'Chats (last 7 days)', value: counts.chats7d },
    { label: 'Messages (last 7 days)', value: counts.messages7d },
    { label: 'Feedback (helpful / not helpful)', value: `${counts.thumbsUp} / ${counts.thumbsDown}` },
    { label: 'Open escalations', value: counts.openEscalations },
    { label: 'Indexed documents', value: counts.indexedDocuments },
  ]

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold text-ink">Dashboard</h1>
        <p className="mt-1 text-sm text-muted">An overview of PolicyPulse activity.</p>
      </div>

      {!setupComplete ? (
        <div className="rounded-card border border-border bg-surface p-4">
          <h2 className="text-sm font-semibold text-ink">Setup</h2>
          <p className="mt-1 text-sm text-muted">
            The chat can&apos;t answer questions until both of these are done.
          </p>
          <ul className="mt-3 flex flex-col gap-1">
            <li>
              <Link
                href="/admin/settings"
                className="flex min-h-11 items-center justify-between gap-3 rounded-input px-3 py-2 text-sm hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
              >
                <span className="text-ink">1. Save &amp; verify your Gemini API key</span>
                {counts.keyVerified ? (
                  <span className="shrink-0 text-success">✓ Done</span>
                ) : (
                  <span className="shrink-0 text-muted">Not done</span>
                )}
              </Link>
            </li>
            <li>
              <Link
                href="/admin/documents"
                className="flex min-h-11 items-center justify-between gap-3 rounded-input px-3 py-2 text-sm hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
              >
                <span className="text-ink">2. Upload and index your first document</span>
                {docsIndexed ? (
                  <span className="shrink-0 text-success">✓ Done</span>
                ) : (
                  <span className="shrink-0 text-muted">Not done</span>
                )}
              </Link>
            </li>
          </ul>
        </div>
      ) : null}

      <dl className="divide-y divide-border rounded-card border border-border bg-surface">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between gap-4 px-4 py-3">
            <dt className="text-sm text-muted">{row.label}</dt>
            <dd className="text-sm font-medium tabular-nums text-ink">{row.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}
