import { SentenceSplitter } from 'llamaindex'
import { extractText as unpdfExtract, getDocumentProxy } from 'unpdf'

export { embedTexts, EMBEDDING_DIMENSIONS, EMBEDDING_MODEL_ID } from './embeddings'

export async function extractDocText(buffer: Uint8Array, mimeType: string): Promise<string> {
  if (mimeType === 'application/pdf') {
    const pdf = await getDocumentProxy(buffer)
    const { text } = await unpdfExtract(pdf, { mergePages: true })
    return text
  }
  return new TextDecoder().decode(buffer)
}

export function chunkText(text: string, chunkSize: number, chunkOverlap: number): string[] {
  return new SentenceSplitter({ chunkSize, chunkOverlap })
    .splitText(text)
    .map((c) => c.trim())
    .filter((c) => c.length > 0)
}

// No longer applied to embeddings — Supabase/gte-small is run with
// `normalize: true`, so its output is already unit-length. Kept (and still
// tested) as a general-purpose helper in case another vector needs it.
export function l2normalize(v: number[]): number[] {
  let sum = 0
  for (const x of v) sum += x * x
  const norm = Math.sqrt(sum) || 1
  return v.map((x) => x / norm)
}
