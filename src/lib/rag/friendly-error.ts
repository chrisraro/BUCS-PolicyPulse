/**
 * Maps a thrown error (typically from the AI provider SDK) to the message
 * shown to the end user in the chat UI. Pulled out of the chat route so it
 * can be unit tested without importing a Route Handler module.
 */
export function friendlyError(error: unknown): string {
  const err = error as { statusCode?: number; status?: number; message?: string }
  const code = err?.statusCode ?? err?.status
  if (code === 429) return 'Free-tier limit reached — wait a moment and try again.'
  if (code === 401 || code === 403)
    return 'The AI provider rejected the API key — an administrator needs to check it in AI Settings.'
  return 'Something went wrong while answering. Try again.'
}
