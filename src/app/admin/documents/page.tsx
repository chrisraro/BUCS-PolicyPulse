import { requireAdminPage } from '@/lib/auth-server'
import { createAdminClient } from '@/lib/supabase/admin'
import { StatusPill, type StatusPillKind } from '@/components/ui/status-pill'
import { formatDate } from '../_lib/format'
import { UploadForm } from './upload-form'
import { DeleteDocumentButton, ReindexButton } from './row-actions'

export const dynamic = 'force-dynamic'

interface DocumentRow {
  id: string
  title: string
  status: StatusPillKind
  error: string | null
  chunk_count: number
  audience: string[]
  created_at: string
}

export default async function DocumentsPage() {
  await requireAdminPage()
  const admin = createAdminClient()
  const { data } = await admin
    .from('documents')
    .select('id, title, status, error, chunk_count, audience, created_at')
    .order('created_at', { ascending: false })

  const documents = (data ?? []) as DocumentRow[]

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold text-ink">Documents</h1>
        <p className="mt-1 text-sm text-muted">
          Upload the policies the chat should answer from. Only indexed documents are used to
          answer questions.
        </p>
      </div>

      <UploadForm />

      {documents.length === 0 ? (
        <div className="rounded-card border border-dashed border-border p-8 text-center">
          <p className="text-sm text-ink">
            Upload your first policy PDF — the chat can&apos;t answer until at least one document
            is indexed.
          </p>
        </div>
      ) : (
        <div>
          <div className="hidden overflow-x-auto rounded-card border border-border sm:block">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border bg-surface text-xs tracking-wide text-muted uppercase">
                <tr>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Title
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Status
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Chunks
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Audience
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Uploaded
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {documents.map((doc) => (
                  <tr key={doc.id}>
                    <td className="px-4 py-3 align-top text-ink">
                      <span className="block max-w-[16rem] truncate" title={doc.title}>
                        {doc.title}
                      </span>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <StatusPill key={doc.status} kind={doc.status} className="pp-enter" />
                      {doc.status === 'failed' && doc.error ? (
                        <p
                          className="mt-1 max-w-xs text-xs break-words text-danger"
                          title={doc.error}
                        >
                          {doc.error}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 align-top tabular-nums text-ink">{doc.chunk_count}</td>
                    <td className="px-4 py-3 align-top text-muted">{doc.audience.join(', ')}</td>
                    <td className="px-4 py-3 align-top text-muted">
                      {formatDate(doc.created_at)}
                    </td>
                    <td className="px-4 py-3 align-top">
                      <div className="flex flex-wrap items-center gap-2">
                        <ReindexButton documentId={doc.id} />
                        <DeleteDocumentButton documentId={doc.id} title={doc.title} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ul className="flex flex-col gap-3 sm:hidden">
            {documents.map((doc) => (
              <li key={doc.id} className="rounded-card border border-border bg-surface p-4">
                <dl className="flex flex-col gap-2 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <dt className="sr-only">Title</dt>
                    <dd className="min-w-0 truncate font-medium text-ink" title={doc.title}>
                      {doc.title}
                    </dd>
                    <StatusPill key={doc.status} kind={doc.status} className="pp-enter shrink-0" />
                  </div>
                  {doc.status === 'failed' && doc.error ? (
                    <p className="text-xs break-words text-danger">{doc.error}</p>
                  ) : null}
                  <div className="flex items-center justify-between">
                    <dt className="text-muted">Chunks</dt>
                    <dd className="text-ink">{doc.chunk_count}</dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="text-muted">Audience</dt>
                    <dd className="text-ink">{doc.audience.join(', ')}</dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="text-muted">Uploaded</dt>
                    <dd className="text-ink">{formatDate(doc.created_at)}</dd>
                  </div>
                </dl>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <ReindexButton documentId={doc.id} />
                  <DeleteDocumentButton documentId={doc.id} title={doc.title} />
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
