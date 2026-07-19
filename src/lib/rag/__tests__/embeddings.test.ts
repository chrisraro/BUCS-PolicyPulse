import { describe, expect, it } from 'vitest'
import { toVectors } from '../embeddings'

describe('toVectors', () => {
  it('reshapes a flat 2x3 array into two row vectors', () => {
    const data = [1, 2, 3, 4, 5, 6]
    expect(toVectors(data, 2, 3)).toEqual([
      [1, 2, 3],
      [4, 5, 6],
    ])
  })

  it('reshapes a Float32Array the same way', () => {
    const data = new Float32Array([1, 2, 3, 4, 5, 6])
    const vectors = toVectors(data, 2, 3)
    expect(vectors).toEqual([
      [1, 2, 3],
      [4, 5, 6],
    ])
  })

  it('returns plain number[] rows, not typed arrays', () => {
    const data = new Float32Array([1, 2, 3, 4])
    const vectors = toVectors(data, 2, 2)
    expect(Array.isArray(vectors[0])).toBe(true)
    expect(vectors[0]).not.toBeInstanceOf(Float32Array)
  })

  it('throws on length mismatch', () => {
    expect(() => toVectors([1, 2, 3, 4, 5], 2, 3)).toThrow()
  })

  it('handles a single row', () => {
    expect(toVectors([1, 2, 3], 1, 3)).toEqual([[1, 2, 3]])
  })
})
