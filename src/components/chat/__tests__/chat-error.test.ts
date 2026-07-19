import { describe, expect, it } from 'vitest'
import { classifyChatError } from '../chat-error'

describe('classifyChatError', () => {
  it('classifies a 503 assistant_offline JSON body as offline', () => {
    const error = new Error(JSON.stringify({ error: 'assistant_offline' }))
    const result = classifyChatError(error)
    expect(result.kind).toBe('offline')
    expect(result.message).toBe('The assistant is offline — no AI key is configured.')
  })

  it('classifies a config_error JSON body as config', () => {
    const error = new Error(JSON.stringify({ error: 'config_error' }))
    const result = classifyChatError(error)
    expect(result.kind).toBe('config')
    expect(result.message).toBe(
      'The assistant is temporarily unavailable — an administrator needs to check the AI configuration.',
    )
  })

  it('passes a free-tier rate-limit stream error message through verbatim', () => {
    const error = new Error('Free-tier limit reached — wait a moment and try again.')
    const result = classifyChatError(error)
    expect(result.kind).toBe('stream')
    expect(result.message).toBe('Free-tier limit reached — wait a moment and try again.')
  })

  it('classifies an unparseable/network-ish message as a disconnect', () => {
    const error = new TypeError('Failed to fetch')
    const result = classifyChatError(error)
    expect(result.kind).toBe('disconnect')
    expect(result.message).toBe('Connection lost — retry.')
  })

  it('falls back to a generic stream error for anything else unparseable', () => {
    const error = new Error('boom')
    const result = classifyChatError(error)
    expect(result.kind).toBe('stream')
    expect(result.message).toBe('boom')
  })
})
