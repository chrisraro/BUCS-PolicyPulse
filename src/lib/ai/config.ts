import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'
import type { ChatProvider } from './provider'

export { gemini, chatModelFor } from './provider'
export type { ChatProvider } from './provider'

export class AiNotConfiguredError extends Error {}

export interface AiConfig {
  provider: ChatProvider
  chatModel: string
  apiKey: string
  retrievalMode: 'single_call' | 'agentic'
}

export async function getAiConfig(): Promise<AiConfig> {
  const admin = createAdminClient()
  const { data, error } = await admin.from('ai_settings').select('*').eq('id', 1).single()
  if (error) throw new Error(`ai_settings read failed: ${error.message}`)
  if (!data.api_key) throw new AiNotConfiguredError('No AI provider API key configured')
  return {
    provider: data.provider,
    chatModel: data.chat_model,
    apiKey: data.api_key,
    retrievalMode: data.retrieval_mode,
  }
}
