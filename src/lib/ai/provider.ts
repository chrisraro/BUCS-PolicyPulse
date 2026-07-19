import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { createGroq } from '@ai-sdk/groq'
import type { LanguageModel } from 'ai'

export type ChatProvider = 'gemini' | 'groq'

interface ModelOption {
  id: string
  note: string
}

interface ProviderMeta {
  label: string
  keyHint: string
  models: ModelOption[]
}

export const PROVIDER_META: Record<ChatProvider, ProviderMeta> = {
  gemini: {
    label: 'Gemini',
    keyHint: 'aistudio.google.com',
    models: [
      { id: 'gemini-2.5-flash', note: 'recommended' },
      { id: 'gemini-2.5-flash-lite', note: 'higher free limits' },
    ],
  },
  groq: {
    label: 'Groq',
    keyHint: 'console.groq.com',
    models: [
      { id: 'llama-3.1-8b-instant', note: 'recommended — 14,400 requests/day free' },
      { id: 'llama-3.3-70b-versatile', note: 'smarter, 1,000 requests/day free' },
    ],
  },
}

export const DEFAULT_MODEL: Record<ChatProvider, string> = {
  gemini: PROVIDER_META.gemini.models[0].id,
  groq: PROVIDER_META.groq.models[0].id,
}

/** @deprecated use chatModelFor('gemini', apiKey) instead */
export function gemini(apiKey: string) {
  return createGoogleGenerativeAI({ apiKey })
}

export function chatModelFor(provider: ChatProvider, apiKey: string, modelId: string): LanguageModel {
  if (provider === 'groq') {
    return createGroq({ apiKey })(modelId)
  }
  return createGoogleGenerativeAI({ apiKey })(modelId)
}
