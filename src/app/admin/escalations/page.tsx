import { requireAdminPage } from '@/lib/auth-server'
import { createAdminClient } from '@/lib/supabase/admin'
import { StatusPill } from '@/components/ui/status-pill'
import { formatDateTime } from '../_lib/format'
import { ResolveForm } from './resolve-form'

export const dynamic = 'force-dynamic'

interface EscalationRow {
  id: string
  question: string
  status: 'open' | 'resolved'
  resolution: string | null
  created_at: string
  profiles: { email: string } | null
}

export default async function EscalationsPage() {
  await requireAdminPage()
  const admin = createAdminClient()
  const { data } = await admin
    .from('escalations')
    .select('id, question, status, resolution, created_at, profiles(email)')
    .order('status', { ascending: true })
    .order('created_at', { ascending: false })

  const rows = (data ?? []) as unknown as EscalationRow[]

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">Escalations</h1>
        <p className="mt-1 text-sm text-muted">
          Questions the assistant couldn&apos;t answer, routed to an administrator. Open items are
          listed first.
        </p>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-card border border-dashed border-border p-8 text-center">
          <p className="text-sm text-ink">
            No escalations yet — they will appear here when a user asks to talk to a human.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {rows.map((row) => (
            <li key={row.id} className="rounded-card border border-border bg-surface p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-medium break-words text-ink">{row.question}</p>
                  <p className="mt-1 text-xs text-muted">
                    {row.profiles?.email ?? 'Unknown user'} · {formatDateTime(row.created_at)}
                  </p>
                </div>
                <StatusPill key={row.status} kind={row.status} className="pp-enter shrink-0" />
              </div>

              {row.status === 'resolved' && row.resolution ? (
                <div className="mt-3 rounded-input bg-surface-2 p-3 text-sm text-ink">
                  <p className="text-xs font-medium text-muted">Resolution</p>
                  <p className="mt-1 break-words whitespace-pre-wrap">{row.resolution}</p>
                </div>
              ) : null}

              {row.status === 'open' ? (
                <details className="mt-3">
                  <summary className="cursor-pointer text-sm font-medium text-primary">
                    Resolve
                  </summary>
                  <ResolveForm escalationId={row.id} />
                </details>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
