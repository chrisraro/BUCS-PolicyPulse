'use server'

import { z } from 'zod'
import { generateText } from 'ai'
import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/auth-server'
import { createAdminClient } from '@/lib/supabase/admin'
import { gemini } from '@/lib/ai/config'
import type { ActionState } from '../_lib/action-state'

export async function saveAndVerifyKey(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    await requireAdmin()
  } catch {
    return { status: 'error', message: 'Admin access required.' }
  }

  const apiKeyInput = String(formData.get('apiKey') ?? '').trim()
  const modelSelect = String(formData.get('chatModel') ?? 'gemini-2.5-flash')
  const customModel = String(formData.get('customModel') ?? '').trim()
  const retrievalModeInput = String(formData.get('retrievalMode') ?? 'single_call')

  const chatModel = modelSelect === 'custom' ? customModel : modelSelect
  if (!chatModel) {
    return { status: 'error', message: 'Enter a model name.' }
  }
  const retrievalMode = retrievalModeInput === 'agentic' ? 'agentic' : 'single_call'

  const admin = createAdminClient()

  const update: Record<string, unknown> = {
    chat_model: chatModel,
    retrieval_mode: retrievalMode,
    updated_at: new Date().toISOString(),
  }
  // Empty input means "keep the existing key" — never overwrite with blank.
  if (apiKeyInput) {
    update.api_key = apiKeyInput
  }

  const { error: updateError } = await admin.from('ai_settings').update(update).eq('id', 1)
  if (updateError) {
    return { status: 'error', message: `Could not save settings: ${updateError.message}` }
  }

  let apiKey = apiKeyInput
  if (!apiKey) {
    const { data } = await admin.from('ai_settings').select('api_key').eq('id', 1).single()
    apiKey = (data?.api_key as string | null) ?? ''
  }

  if (!apiKey) {
    revalidatePath('/admin/settings')
    return { status: 'error', message: 'Add an API key before verifying.' }
  }

  try {
    await generateText({
      model: gemini(apiKey)(chatModel),
      prompt: 'ping',
      maxOutputTokens: 1,
    })
    await admin.from('ai_settings').update({ verified_at: new Date().toISOString() }).eq('id', 1)
    revalidatePath('/admin/settings')
    revalidatePath('/admin')
    return { status: 'success', message: '✓ Key verified — chat is live' }
  } catch (e) {
    // Key stays saved for retry — only the verified flag clears.
    await admin.from('ai_settings').update({ verified_at: null }).eq('id', 1)
    revalidatePath('/admin/settings')
    revalidatePath('/admin')
    return {
      status: 'error',
      message: e instanceof Error ? e.message : 'The provider rejected the key.',
    }
  }
}

const ragSchema = z.object({
  chunkSize: z.coerce.number().int().min(128).max(4096),
  chunkOverlap: z.coerce.number().int().min(0),
  matchThreshold: z.coerce.number().min(0).max(1),
  matchCount: z.coerce.number().int().min(1).max(20),
})

export async function saveRagSettings(_prev: ActionState, formData: FormData): Promise<ActionState> {
  let ctx
  try {
    ctx = await requireAdmin()
  } catch {
    return { status: 'error', message: 'Admin access required.' }
  }

  const parsed = ragSchema.safeParse({
    chunkSize: formData.get('chunkSize'),
    chunkOverlap: formData.get('chunkOverlap'),
    matchThreshold: formData.get('matchThreshold'),
    matchCount: formData.get('matchCount'),
  })
  if (!parsed.success) {
    return {
      status: 'error',
      message: parsed.error.issues[0]?.message ?? 'Invalid retrieval settings.',
    }
  }

  const admin = createAdminClient()
  const { error } = await admin
    .from('rag_settings')
    .update({
      chunk_size: parsed.data.chunkSize,
      chunk_overlap: parsed.data.chunkOverlap,
      match_threshold: parsed.data.matchThreshold,
      match_count: parsed.data.matchCount,
      updated_at: new Date().toISOString(),
      updated_by: ctx.user.id,
    })
    .eq('id', 1)

  if (error) {
    return { status: 'error', message: `Could not save: ${error.message}` }
  }

  revalidatePath('/admin/settings')
  return { status: 'success', message: 'Retrieval settings saved.' }
}
