import Link from 'next/link'
import { cn } from '@/lib/cn'
import { createAdminClient } from '@/lib/supabase/admin'
import { excerpt, formatDateTime } from '../_lib/format'

export const dynamic = 'force-dynamic'

interface FeedbackRow {
  id: string
  rating: 'up' | 'down'
  comment: string | null
  created_at: string
  chat_messages: { content: string } | null
  profiles: { email: string } | null
}

export default async function FeedbackPage({
  searchParams,
}: {
  searchParams: Promise<{ rating?: string }>
}) {
  const { rating } = await searchParams
  const activeRating = rating === 'up' || rating === 'down' ? rating : undefined

  const admin = createAdminClient()
  let query = admin
    .from('feedback')
    .select('id, rating, comment, created_at, chat_messages(content), profiles(email)')
    .order('created_at', { ascending: false })
  if (activeRating) {
    query = query.eq('rating', activeRating)
  }

  const { data } = await query
  const rows = (data ?? []) as unknown as FeedbackRow[]

  const filters: { label: string; value?: 'up' | 'down' }[] = [
    { label: 'All', value: undefined },
    { label: '👍 Helpful', value: 'up' },
    { label: '👎 Not helpful', value: 'down' },
  ]

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">Feedback</h1>
        <p className="mt-1 text-sm text-muted">What users think of the assistant&apos;s answers.</p>
      </div>

      <nav aria-label="Filter by rating" className="flex gap-2">
        {filters.map((filter) => {
          const active = filter.value === activeRating
          const href = filter.value ? `/admin/feedback?rating=${filter.value}` : '/admin/feedback'
          return (
            <Link
              key={filter.label}
              href={href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'inline-flex min-h-11 items-center rounded-full border px-3 text-sm',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-bg',
                active
                  ? 'border-primary bg-primary-subtle text-primary'
                  : 'border-border text-muted hover:bg-surface-2',
              )}
            >
              {filter.label}
            </Link>
          )
        })}
      </nav>

      {rows.length === 0 ? (
        <div className="rounded-card border border-dashed border-border p-8 text-center">
          <p className="text-sm text-ink">
            No feedback yet — it will appear here once users rate an answer.
          </p>
        </div>
      ) : (
        <>
          <div className="hidden overflow-x-auto rounded-card border border-border sm:block">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border bg-surface text-xs tracking-wide text-muted uppercase">
                <tr>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Rating
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Message
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Comment
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    User
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td className="px-4 py-3 align-top text-lg">
                      {row.rating === 'up' ? '👍' : '👎'}
                    </td>
                    <td className="max-w-sm px-4 py-3 align-top text-ink">
                      {row.chat_messages?.content ? (
                        <details>
                          <summary className="cursor-pointer">
                            {excerpt(row.chat_messages.content)}
                          </summary>
                          <p className="mt-2 max-w-prose whitespace-pre-wrap text-muted">
                            {row.chat_messages.content}
                          </p>
                        </details>
                      ) : (
                        <span className="text-muted">Message deleted</span>
                      )}
                    </td>
                    <td className="px-4 py-3 align-top text-muted">{row.comment || '—'}</td>
                    <td className="px-4 py-3 align-top text-muted">
                      {row.profiles?.email ?? '—'}
                    </td>
                    <td className="px-4 py-3 align-top text-muted">
                      {formatDateTime(row.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ul className="flex flex-col gap-3 sm:hidden">
            {rows.map((row) => (
              <li key={row.id} className="rounded-card border border-border bg-surface p-4">
                <dl className="flex flex-col gap-2 text-sm">
                  <div className="flex items-center justify-between">
                    <dt className="text-muted">Rating</dt>
                    <dd className="text-ink">
                      {row.rating === 'up' ? '👍 Helpful' : '👎 Not helpful'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted">Message</dt>
                    <dd className="text-ink">
                      {row.chat_messages?.content ? (
                        <details>
                          <summary className="cursor-pointer">
                            {excerpt(row.chat_messages.content)}
                          </summary>
                          <p className="mt-2 whitespace-pre-wrap text-muted">
                            {row.chat_messages.content}
                          </p>
                        </details>
                      ) : (
                        <span className="text-muted">Message deleted</span>
                      )}
                    </dd>
                  </div>
                  {row.comment ? (
                    <div>
                      <dt className="text-muted">Comment</dt>
                      <dd className="text-ink">{row.comment}</dd>
                    </div>
                  ) : null}
                  <div className="flex items-center justify-between">
                    <dt className="text-muted">User</dt>
                    <dd className="text-ink">{row.profiles?.email ?? '—'}</dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="text-muted">Date</dt>
                    <dd className="text-ink">{formatDateTime(row.created_at)}</dd>
                  </div>
                </dl>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}
