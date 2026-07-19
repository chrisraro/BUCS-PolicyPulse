import { describe, expect, it } from 'vitest'
import { assignCitations, citedInText, type Citation } from '../citations'
import type { MatchResult } from '../retrieve'

const r = (id: string, title = 'Student Handbook'): MatchResult => ({
  id,
  document_id: 'd1',
  document_title: title,
  chunk_index: 0,
  content: 'Grades are final after 14 days.',
  similarity: 0.8,
})

describe('assignCitations', () => {
  it('numbers new results sequentially starting at 1', () => {
    const { citations, forModel } = assignCitations([], [r('c1'), r('c2')])
    expect(citations.map((c) => c.ref)).toEqual([1, 2])
    expect(forModel.map((f) => f.ref)).toEqual([1, 2])
  })

  it('reuses the ref for a chunk already cited this turn', () => {
    const first = assignCitations([], [r('c1')])
    const second = assignCitations(first.citations, [r('c1'), r('c3')])
    expect(second.citations.map((c) => [c.chunkId, c.ref])).toEqual([
      ['c1', 1],
      ['c3', 2],
    ])
  })
})

describe('citedInText', () => {
  const cites: Citation[] = assignCitations([], [r('c1'), r('c2'), r('c3')]).citations

  it('keeps only refs present in the answer text', () => {
    const kept = citedInText(cites, 'Grades are final after 14 days [1]. Appeals go to the registrar [3].')
    expect(kept.map((c) => c.ref)).toEqual([1, 3])
  })

  it('returns empty when nothing is cited', () => {
    expect(citedInText(cites, 'I could not find this in the policy documents.')).toEqual([])
  })
})
