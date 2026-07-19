import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

// Hit daily by Vercel Cron: a single DB read keeps the Supabase Free project
// from its 1-week-inactivity pause.
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret) {
    return Response.json({ error: 'cron_secret_not_configured' }, { status: 500 })
  }
  if (req.headers.get('authorization') !== `Bearer ${secret}`) {
    return Response.json({ error: 'unauthorized' }, { status: 401 })
  }
  const admin = createAdminClient()
  const { error } = await admin.from('rag_settings').select('id').eq('id', 1).single()
  if (error) return Response.json({ ok: false, error: error.message }, { status: 500 })
  return Response.json({ ok: true })
}
