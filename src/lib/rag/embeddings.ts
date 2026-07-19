import { env, pipeline, type FeatureExtractionPipeline } from '@huggingface/transformers'

// LOCKED after first ingest — changing the model requires re-indexing all
// documents (a different embedding space is not comparable via cosine
// similarity to the old one).
export const EMBEDDING_MODEL_ID = 'Supabase/gte-small'
export const EMBEDDING_DIMENSIONS = 384

// Vercel's function filesystem only allows writes under /tmp — set this
// before the first pipeline() call so model weights download there instead
// of the read-only deployment bundle path.
env.cacheDir = '/tmp/transformers-cache'

/**
 * Reshapes the flat, row-major tensor data returned by the feature-extraction
 * pipeline (dims [count, dims]) into `count` plain number[] vectors of
 * length `dims`. Pure and synchronous so it can be unit tested without
 * loading the model.
 */
export function toVectors(data: Float32Array | number[], count: number, dims: number): number[][] {
  if (data.length !== count * dims) {
    throw new Error(
      `toVectors: length mismatch — expected ${count * dims} values (count=${count} x dims=${dims}), got ${data.length}`,
    )
  }
  const vectors: number[][] = []
  for (let i = 0; i < count; i++) {
    const start = i * dims
    vectors.push(Array.from(data.slice(start, start + dims)))
  }
  return vectors
}

let embedderPromise: Promise<FeatureExtractionPipeline> | null = null

function getEmbedder(): Promise<FeatureExtractionPipeline> {
  if (!embedderPromise) {
    // Runs on the native onnxruntime-node CPU backend. On Vercel the platform
    // .so is NOT picked up by automatic file tracing (prod logs showed
    // "libonnxruntime.so.1: cannot open shared object file") — next.config.ts
    // outputFileTracingIncludes force-ships bin/napi-v3/linux/x64 for the
    // routes that embed. The node build supports only native devices (wasm is
    // web-build-only), so tracing the binary is the required fix, not a choice.
    embedderPromise = pipeline<'feature-extraction'>('feature-extraction', EMBEDDING_MODEL_ID)
  }
  return embedderPromise
}

/**
 * Embeds one or more texts locally via Supabase/gte-small — no API key, no
 * quota, no network dependency beyond the one-time model download. Used for
 * both document ingestion and query embedding so both sides of retrieval
 * live in the same vector space.
 */
export async function embedTexts(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return []
  const embedder = await getEmbedder()
  const output = await embedder(texts, { pooling: 'mean', normalize: true })
  const [count, dims] = output.dims
  return toVectors(output.data as Float32Array, count, dims)
}
