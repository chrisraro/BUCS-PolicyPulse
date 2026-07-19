import type { ClassifiedChatError } from './types'

/**
 * Classifies the `Error` surfaced by `useChat` into one of the degraded
 * states the UI/UX spec calls out.
 *
 * Two distinct shapes land here:
 * - Non-OK HTTP responses (e.g. the chat route's `503 { error: 'assistant_offline' }`
 *   / `503 { error: 'config_error' }` / `400 { error: 'empty_message' }`) are
 *   thrown by `HttpChatTransport` as `new Error(await response.text())` — i.e.
 *   `error.message` is the raw JSON body text, which we parse back out.
 * - Mid-stream failures (rate limits, provider errors) arrive as UI message
 *   stream `error` parts and are re-thrown by the SDK as
 *   `new Error(chunk.errorText)` — `error.message` is already the
 *   registrar-plain text the chat route's `friendlyError()` produced, shown
 *   verbatim.
 */
export function classifyChatError(error: Error): ClassifiedChatError {
  try {
    const parsed = JSON.parse(error.message) as { error?: string }
    if (parsed?.error === 'assistant_offline') {
      return { kind: 'offline', message: 'The assistant is offline — no AI key is configured.' }
    }
    if (parsed?.error === 'config_error') {
      return {
        kind: 'config',
        message: 'The assistant is temporarily unavailable — an administrator needs to check the AI configuration.',
      }
    }
    if (parsed?.error === 'empty_message') {
      return { kind: 'stream', message: 'Type a question first.' }
    }
  } catch {
    // Not a JSON-coded error — fall through to the generic classifications below.
  }

  if (error instanceof TypeError && /fetch|network/i.test(error.message)) {
    return { kind: 'disconnect', message: 'Connection lost — retry.' }
  }

  return { kind: 'stream', message: error.message || 'Something went wrong while answering. Try again.' }
}
