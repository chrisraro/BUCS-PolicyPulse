import { describe, expect, it } from 'vitest'
import { chunkText, l2normalize } from '../ingest'

describe('chunkText', () => {
  it('splits long text into multiple non-empty chunks', () => {
    const text = Array.from(
      { length: 200 },
      (_, i) => `Policy sentence number ${i} concerns grading and appeals.`,
    ).join(' ')
    const chunks = chunkText(text, 256, 32)
    expect(chunks.length).toBeGreaterThan(1)
    expect(chunks.every((c) => c.trim().length > 0)).toBe(true)
  })

  it('returns a single chunk for short text', () => {
    expect(chunkText('Short policy.', 1024, 200)).toHaveLength(1)
  })
})

describe('l2normalize', () => {
  it('produces a unit-length vector', () => {
    const v = l2normalize([3, 4])
    const norm = Math.hypot(...v)
    expect(norm).toBeCloseTo(1, 10)
    expect(v[0]).toBeCloseTo(0.6, 10)
    expect(v[1]).toBeCloseTo(0.8, 10)
  })

  it('survives the zero vector without dividing by zero', () => {
    expect(l2normalize([0, 0, 0])).toEqual([0, 0, 0])
  })
})
