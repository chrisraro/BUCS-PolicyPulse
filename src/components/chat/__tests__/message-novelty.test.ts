import { describe, expect, it } from 'vitest'
import { computeNewMessageIds } from '../message-novelty'

describe('computeNewMessageIds', () => {
  it('flags nothing as new on the very first render (mount baseline — no page-load choreography)', () => {
    const messages = [{ id: 'u1' }, { id: 'a1' }]
    const result = computeNewMessageIds(null, messages, new Set())
    expect(result.size).toBe(0)
  })

  it('flags a message appended after the previous render as new (organic append)', () => {
    const prev = [{ id: 'u1' }]
    const next = [{ id: 'u1' }, { id: 'a1' }]
    const result = computeNewMessageIds(prev, next, new Set())
    expect(result).toEqual(new Set(['a1']))
  })

  it('accumulates new ids across multiple organic appends (user then assistant)', () => {
    const afterUser = computeNewMessageIds([{ id: 'u1' }, { id: 'a0' }], [{ id: 'u1' }, { id: 'a0' }, { id: 'u2' }], new Set(['a0']))
    expect(afterUser).toEqual(new Set(['a0', 'u2']))
    const afterAssistant = computeNewMessageIds(
      [{ id: 'u1' }, { id: 'a0' }, { id: 'u2' }],
      [{ id: 'u1' }, { id: 'a0' }, { id: 'u2' }, { id: 'a2' }],
      afterUser,
    )
    expect(afterAssistant).toEqual(new Set(['a0', 'u2', 'a2']))
  })

  it('preserves the new-id set unchanged when only content of an existing message updates (streaming tokens, same ids/order)', () => {
    const prev = [{ id: 'u1' }, { id: 'a1' }]
    const next = [{ id: 'u1' }, { id: 'a1' }] // same ids, new array reference (text grew)
    const result = computeNewMessageIds(prev, next, new Set(['a1']))
    expect(result).toEqual(new Set(['a1']))
  })

  it('resets to empty when the message array is fully replaced (session switch / history load)', () => {
    const prev = [{ id: 'u1' }, { id: 'a1' }]
    const next = [{ id: 'x1' }, { id: 'x2' }, { id: 'x3' }]
    const result = computeNewMessageIds(prev, next, new Set(['a1']))
    expect(result.size).toBe(0)
  })

  it('resets to empty when the message array shrinks (new chat clears to empty, or unrelated truncation)', () => {
    const prev = [{ id: 'u1' }, { id: 'a1' }]
    const next: { id: string }[] = []
    const result = computeNewMessageIds(prev, next, new Set(['a1']))
    expect(result.size).toBe(0)
  })
})
