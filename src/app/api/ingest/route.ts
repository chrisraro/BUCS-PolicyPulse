import { requireAdmin } from '@/lib/auth-server'
import { createAdminClient } from '@/lib/supabase/admin'
import { runIngest } from '@/lib/rag/ingest-runner'

export const runtime = 'nodejs'
export const maxDuration = 300

export async function POST(req: Request) {
  try {
    await requireAdmin()
  } catch (res) {
    return res as Response
  }
  const { documentId } = (await req.json()) as { documentId?: string }
  if (!documentId) return Response.json({ error: 'documentId required' }, { status: 400 })

  const admin = createAdminClient()
  try {
    const { chunkCount } = await runIngest(admin, documentId)
    return Response.json({ ok: true, chunkCount })
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : 'ingest failed' },
      { status: 500 },
    )
  }
}
