import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'

export { gemini } from './provider'

export class AiNotConfiguredError extends Error {}

export interface AiConfig {
  provider: 'gemini'
  chatModel: string
  apiKey: string
  retrievalMode: 'single_call' | 'agentic'
}

export async function getAiConfig(): Promise<AiConfig> {
  const admin = createAdminClient()
  const { data, error } = await admin.from('ai_settings').select('*').eq('id', 1).single()
  if (error) throw new Error(`ai_settings read failed: ${error.message}`)
  if (!data.api_key) throw new AiNotConfiguredError('LLM API key not configured')
  return {
    provider: data.provider,
    chatModel: data.chat_model,
    apiKey: data.api_key,
    retrievalMode: data.retrieval_mode,
  }
}
