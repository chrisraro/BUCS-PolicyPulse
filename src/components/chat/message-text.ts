import type { ChatUIMessage } from './types'

/** Joins a message's `text` parts (in order), ignoring any other part types. */
export function textOfParts(message: ChatUIMessage): string {
  return message.parts
    .filter((part): part is Extract<typeof part, { type: 'text' }> => part.type === 'text')
    .map((part) => part.text)
    .join('')
}

/**
 * Finds the most recent user message's text, searching strictly before
 * `beforeIndex` (defaults to the end of the array — i.e. the whole list).
 * Used to prefill the escalation dialog with "the question that was just
 * asked", either for the header button (search the whole conversation) or
 * for a specific assistant message's inline escalation card (search only
 * what preceded that answer).
 */
export function lastUserQuestion(messages: ChatUIMessage[], beforeIndex: number = messages.length): string {
  for (let i = beforeIndex - 1; i >= 0; i--) {
    const message = messages[i]
    if (message.role === 'user') return textOfParts(message)
  }
  return ''
}
