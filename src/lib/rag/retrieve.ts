import type { SupabaseClient } from '@supabase/supabase-js'
import { audienceFor, type UserRole } from '@/lib/auth'
import { embedTexts } from './ingest'
import type { RagSettings } from './settings'

export interface MatchResult {
  id: string
  document_id: string
  document_title: string
  chunk_index: number
  content: string
  similarity: number
}

export async function searchPolicies(
  admin: SupabaseClient,
  apiKey: string,
  query: string,
  role: UserRole,
  settings: RagSettings,
): Promise<MatchResult[]> {
  const [embedding] = await embedTexts(apiKey, [query], 'RETRIEVAL_QUERY')
  const { data, error } = await admin.rpc('match_document_chunks', {
    query_embedding: embedding,
    match_threshold: settings.match_threshold,
    match_count: settings.match_count,
    allowed_roles: audienceFor(role),
  })
  if (error) throw new Error(`match_document_chunks failed: ${error.message}`)
  return (data ?? []) as MatchResult[]
}
