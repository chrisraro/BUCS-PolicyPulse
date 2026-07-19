import { createGoogleGenerativeAI } from '@ai-sdk/google'

export function gemini(apiKey: string) {
  return createGoogleGenerativeAI({ apiKey })
}
