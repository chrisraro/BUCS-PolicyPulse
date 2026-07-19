import { SentenceSplitter } from 'llamaindex'
import { embedMany } from 'ai'
import { extractText as unpdfExtract, getDocumentProxy } from 'unpdf'
import { gemini } from '@/lib/ai/provider'

// LOCKED after first ingest — changing either requires re-indexing all documents.
// gemini-embedding-001 and gemini-embedding-2 embedding spaces are incompatible.
export const EMBEDDING_MODEL = 'gemini-embedding-001'
export const EMBEDDING_DIMENSIONS = 768

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

// Gemini embeddings truncated below 3072 dims are NOT unit-length —
// required before cosine similarity in pgvector.
export function l2normalize(v: number[]): number[] {
  let sum = 0
  for (const x of v) sum += x * x
  const norm = Math.sqrt(sum) || 1
  return v.map((x) => x / norm)
}

async function withBackoff<T>(fn: () => Promise<T>, tries = 4): Promise<T> {
  for (let i = 0; ; i++) {
    try {
      return await fn()
    } catch (e) {
      const err = e as { statusCode?: number; status?: number }
      const code = err.statusCode ?? err.status
      if (code !== 429 || i >= tries - 1) throw e
      // free-tier friendly: 5s, 10s, 20s
      await new Promise((r) => setTimeout(r, 2 ** i * 5000))
    }
  }
}

export async function embedTexts(
  apiKey: string,
  texts: string[],
  taskType: 'RETRIEVAL_DOCUMENT' | 'RETRIEVAL_QUERY',
): Promise<number[][]> {
  const google = gemini(apiKey)
  const out: number[][] = []
  for (let i = 0; i < texts.length; i += 20) {
    const batch = texts.slice(i, i + 20)
    const { embeddings } = await withBackoff(() =>
      embedMany({
        model: google.textEmbedding(EMBEDDING_MODEL),
        values: batch,
        providerOptions: {
          google: { outputDimensionality: EMBEDDING_DIMENSIONS, taskType },
        },
      }),
    )
    out.push(...embeddings.map(l2normalize))
  }
  return out
}
