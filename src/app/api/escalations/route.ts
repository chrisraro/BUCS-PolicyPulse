import { createServerSupabase } from '@/lib/supabase/server'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  const supabase = await createServerSupabase()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'unauthorized' }, { status: 401 })

  const { question, sessionId } = (await req.json()) as {
    question?: string
    sessionId?: string
  }
  if (!question?.trim()) {
    return Response.json({ error: 'question required' }, { status: 400 })
  }

  const { error } = await supabase.from('escalations').insert({
    user_id: user.id,
    session_id: sessionId ?? null,
    question: question.trim(),
  })
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ ok: true })
}
