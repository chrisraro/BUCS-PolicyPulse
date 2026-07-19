import type { SupabaseClient } from '@supabase/supabase-js'

export interface RagSettings {
  chunk_size: number
  chunk_overlap: number
  match_threshold: number
  match_count: number
}

export async function getRagSettings(admin: SupabaseClient): Promise<RagSettings> {
  const { data, error } = await admin
    .from('rag_settings')
    .select('chunk_size, chunk_overlap, match_threshold, match_count')
    .eq('id', 1)
    .single()
  if (error || !data) throw new Error(`rag_settings missing: ${error?.message}`)
  return data as RagSettings
}
