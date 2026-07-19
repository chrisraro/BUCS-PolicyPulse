import { requireAdminPage } from '@/lib/auth-server'
import { createAdminClient } from '@/lib/supabase/admin'
import { maskKey } from '@/lib/ai/mask'
import { DEFAULT_MODEL, type ChatProvider } from '@/lib/ai/provider'
import type { RagSettings } from '@/lib/rag/settings'
import { ApiKeyForm } from './api-key-form'
import { RetrievalTuningForm } from './retrieval-tuning-form'

export const dynamic = 'force-dynamic'

interface AiSettingsRow {
  provider: ChatProvider
  chat_model: string
  api_key: string | null
  verified_at: string | null
  retrieval_mode: 'single_call' | 'agentic'
}

export default async function AiSettingsPage() {
  await requireAdminPage()
  const admin = createAdminClient()
  const [{ data: aiSettings }, { data: ragSettings }] = await Promise.all([
    admin
      .from('ai_settings')
      .select('provider, chat_model, api_key, verified_at, retrieval_mode')
      .eq('id', 1)
      .single(),
    admin
      .from('rag_settings')
      .select('chunk_size, chunk_overlap, match_threshold, match_count')
      .eq('id', 1)
      .single(),
  ])

  const settings = aiSettings as AiSettingsRow | null
  const rag = ragSettings as RagSettings | null

  const maskedKey = settings?.api_key ? maskKey(settings.api_key) : null
  const provider: ChatProvider = settings?.provider ?? 'gemini'

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold text-ink">AI Settings</h1>
        <p className="mt-1 text-sm text-muted">
          This key powers chat answers. Document indexing runs on a local, keyless embedding
          model, so it works regardless of which provider you choose here.
        </p>
      </div>

      <ApiKeyForm
        provider={provider}
        maskedKey={maskedKey}
        chatModel={settings?.chat_model ?? DEFAULT_MODEL[provider]}
        retrievalMode={settings?.retrieval_mode ?? 'single_call'}
        verifiedAt={settings?.verified_at ?? null}
      />

      <RetrievalTuningForm
        chunkSize={rag?.chunk_size ?? 1024}
        chunkOverlap={rag?.chunk_overlap ?? 200}
        matchThreshold={rag?.match_threshold ?? 0.3}
        matchCount={rag?.match_count ?? 6}
      />
    </div>
  )
}
