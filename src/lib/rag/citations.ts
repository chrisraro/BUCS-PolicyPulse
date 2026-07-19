import type { MatchResult } from './retrieve'

export interface Citation {
  ref: number
  chunkId: string
  documentId: string
  documentTitle: string
  snippet: string
  similarity: number
}

export interface CitationAssignment {
  citations: Citation[]
  forModel: Array<{ ref: number; source: string; content: string }>
}

// Refs stay stable across multiple retrievals within one answer.
export function assignCitations(existing: Citation[], results: MatchResult[]): CitationAssignment {
  const citations = [...existing]
  const forModel: CitationAssignment['forModel'] = []
  for (const r of results) {
    let cite = citations.find((c) => c.chunkId === r.id)
    if (!cite) {
      cite = {
        ref: citations.length + 1,
        chunkId: r.id,
        documentId: r.document_id,
        documentTitle: r.document_title,
        snippet: r.content.slice(0, 400),
        similarity: r.similarity,
      }
      citations.push(cite)
    }
    forModel.push({ ref: cite.ref, source: r.document_title, content: r.content })
  }
  return { citations, forModel }
}

// Keep only citations whose [n] marker actually appears in the final answer.
export function citedInText(citations: Citation[], text: string): Citation[] {
  const used = new Set([...text.matchAll(/\[(\d+)\]/g)].map((m) => Number(m[1])))
  return citations.filter((c) => used.has(c.ref))
}
