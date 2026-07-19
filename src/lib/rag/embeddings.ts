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

// Verified in production: a single-text embed succeeds, but one native call
// over an 88-page document's ~hundreds of chunks aborts the whole function
// (tensor allocation in onnxruntime). Sequential small batches bound native
// memory; throughput is still fine within the 300s function ceiling.
export const EMBED_BATCH_SIZE = 16

/** Pure batching helper — unit tested without loading the model. */
export function chunkArray<T>(items: T[], size: number): T[][] {
  if (size < 1) throw new Error(`chunkArray: size must be >= 1, got ${size}`)
  const out: T[][] = []
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size))
  return out
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
  const vectors: number[][] = []
  for (const batch of chunkArray(texts, EMBED_BATCH_SIZE)) {
    const output = await embedder(batch, { pooling: 'mean', normalize: true })
    const [count, dims] = output.dims
    vectors.push(...toVectors(output.data as Float32Array, count, dims))
  }
  return vectors
}
