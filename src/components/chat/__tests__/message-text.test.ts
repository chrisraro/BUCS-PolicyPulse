import { describe, expect, it } from 'vitest'
import { lastUserQuestion, textOfParts } from '../message-text'
import type { ChatUIMessage } from '../types'

function userMsg(id: string, text: string): ChatUIMessage {
  return {
    id,
    role: 'user',
    parts: [{ type: 'text', text, state: 'done' }],
  } as ChatUIMessage
}

function assistantMsg(id: string, text: string): ChatUIMessage {
  return {
    id,
    role: 'assistant',
    parts: [{ type: 'text', text, state: 'done' }],
  } as ChatUIMessage
}

describe('textOfParts', () => {
  it('joins multiple text parts into one string', () => {
    const message = {
      id: 'm1',
      role: 'assistant',
      parts: [
        { type: 'text', text: 'Hello ', state: 'done' },
        { type: 'text', text: 'world', state: 'done' },
      ],
    } as ChatUIMessage
    expect(textOfParts(message)).toBe('Hello world')
  })

  it('ignores non-text parts interleaved with text parts', () => {
    const message = {
      id: 'm2',
      role: 'assistant',
      parts: [
        { type: 'text', text: 'Before ', state: 'done' },
        { type: 'tool-call', toolCallId: 't1', toolName: 'lookup', args: {} },
        { type: 'text', text: 'after', state: 'done' },
      ],
    } as unknown as ChatUIMessage
    expect(textOfParts(message)).toBe('Before after')
  })

  it('returns empty string for a message with no parts', () => {
    const message = { id: 'm3', role: 'user', parts: [] } as ChatUIMessage
    expect(textOfParts(message)).toBe('')
  })
})

describe('lastUserQuestion', () => {
  it('returns the last user message text when no beforeIndex is given', () => {
    const messages = [
      userMsg('u1', 'What is the grading policy?'),
      assistantMsg('a1', 'Grades are final after 14 days.'),
      userMsg('u2', 'What about appeals?'),
      assistantMsg('a2', 'Appeals go to the registrar.'),
    ]
    expect(lastUserQuestion(messages)).toBe('What about appeals?')
  })

  it('returns empty string when there is no user message', () => {
    const messages = [assistantMsg('a1', 'Hello there.')]
    expect(lastUserQuestion(messages)).toBe('')
  })

  it('only searches messages strictly before beforeIndex', () => {
    const messages = [
      userMsg('u1', 'What is the grading policy?'),
      assistantMsg('a1', 'Grades are final after 14 days.'),
      userMsg('u2', 'What about appeals?'),
      assistantMsg('a2', 'Appeals go to the registrar.'),
    ]
    // beforeIndex 2 points at 'u2' itself, so the search must stop at index 1
    // and find 'u1' rather than 'u2'.
    expect(lastUserQuestion(messages, 2)).toBe('What is the grading policy?')
  })

  it('returns empty string when beforeIndex is 0 (nothing precedes it)', () => {
    const messages = [
      userMsg('u1', 'What is the grading policy?'),
      assistantMsg('a1', 'Grades are final after 14 days.'),
    ]
    expect(lastUserQuestion(messages, 0)).toBe('')
  })
})
