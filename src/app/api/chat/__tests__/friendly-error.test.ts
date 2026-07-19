import { describe, expect, it } from 'vitest'
import { friendlyError } from '@/lib/rag/friendly-error'

describe('friendlyError', () => {
  it('maps a 429 status to the free-tier message', () => {
    expect(friendlyError({ statusCode: 429 })).toBe(
      'Free-tier limit reached — wait a moment and try again.',
    )
  })

  it('maps a 429 via `status` (not `statusCode`) the same way', () => {
    expect(friendlyError({ status: 429 })).toBe(
      'Free-tier limit reached — wait a moment and try again.',
    )
  })

  it('maps a 401 to the key-rejected message', () => {
    expect(friendlyError({ statusCode: 401 })).toBe(
      'The AI provider rejected the API key — an administrator needs to check it in AI Settings.',
    )
  })

  it('maps a 403 to the key-rejected message', () => {
    expect(friendlyError({ statusCode: 403 })).toBe(
      'The AI provider rejected the API key — an administrator needs to check it in AI Settings.',
    )
  })

  it('falls back to a generic message for unknown/missing status codes', () => {
    expect(friendlyError(new Error('boom'))).toBe('Something went wrong while answering. Try again.')
  })

  it('falls back to the generic message for a non-error, non-status value', () => {
    expect(friendlyError('nope')).toBe('Something went wrong while answering. Try again.')
  })
})
