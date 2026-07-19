import { createServerSupabase } from '@/lib/supabase/server'

export const runtime = 'nodejs'

// RLS scopes results to the session owner (admin can also read).
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const supabase = await createServerSupabase()
  const { data, error } = await supabase
    .from('chat_messages')
    .select('id, role, content, citations, created_at')
    .eq('session_id', id)
    .order('created_at', { ascending: true })
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ messages: data ?? [] })
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const supabase = await createServerSupabase()
  const { error } = await supabase.from('chat_sessions').delete().eq('id', id)
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ ok: true })
}
