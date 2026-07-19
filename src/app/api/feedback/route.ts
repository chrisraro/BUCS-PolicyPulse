import { createServerSupabase } from '@/lib/supabase/server'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  const supabase = await createServerSupabase()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'unauthorized' }, { status: 401 })

  const { messageId, rating, comment } = (await req.json()) as {
    messageId?: string
    rating?: 'up' | 'down'
    comment?: string
  }
  if (!messageId || (rating !== 'up' && rating !== 'down')) {
    return Response.json({ error: 'messageId and rating required' }, { status: 400 })
  }

  // RLS validates the message belongs to one of the user's sessions.
  const { error } = await supabase.from('feedback').upsert(
    { message_id: messageId, user_id: user.id, rating, comment: comment ?? null },
    { onConflict: 'message_id,user_id' },
  )
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ ok: true })
}
