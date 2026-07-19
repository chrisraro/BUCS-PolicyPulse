// Smoke test for local, keyless embeddings (Supabase/gte-small via
// @huggingface/transformers). Uses no API keys and no network dependency
// beyond the one-time model download from the Hugging Face Hub.
//
// Run: node scripts/smoke-embed.mjs
import { env, pipeline } from '@huggingface/transformers'

env.cacheDir = process.env.TRANSFORMERS_CACHE_DIR ?? '/tmp/transformers-cache'

const EMBEDDING_MODEL_ID = 'Supabase/gte-small'
const EMBEDDING_DIMENSIONS = 384

function toVectors(data, count, dims) {
  if (data.length !== count * dims) {
    throw new Error(
      `toVectors: length mismatch — expected ${count * dims} values (count=${count} x dims=${dims}), got ${data.length}`,
    )
  }
  const vectors = []
  for (let i = 0; i < count; i++) {
    const start = i * dims
    vectors.push(Array.from(data.slice(start, start + dims)))
  }
  return vectors
}

function dot(a, b) {
  let s = 0
  for (let i = 0; i < a.length; i++) s += a[i] * b[i]
  return s
}

function norm(a) {
  return Math.sqrt(dot(a, a))
}

function cosine(a, b) {
  return dot(a, b) / (norm(a) * norm(b))
}

function assert(cond, message) {
  if (!cond) {
    console.error(`FAIL: ${message}`)
    process.exitCode = 1
  } else {
    console.log(`ok - ${message}`)
  }
}

async function main() {
  const texts = [
    'Students may appeal a grading decision within 14 days.',
    'Students may appeal a grading decision within 14 days.', // identical
  ]
  const different = 'The cafeteria is open from 8am to 6pm on weekdays.'

  console.log(`Loading ${EMBEDDING_MODEL_ID} (first run downloads ~34MB)...`)

  const t0 = Date.now()
  const embedder = await pipeline('feature-extraction', EMBEDDING_MODEL_ID)
  const tLoad = Date.now() - t0
  console.log(`cold load: ${tLoad}ms`)

  const t1 = Date.now()
  const output = await embedder(texts, { pooling: 'mean', normalize: true })
  const tFirstEmbed = Date.now() - t1
  console.log(`first embed call (2 texts): ${tFirstEmbed}ms`)

  const [count, dims] = output.dims
  const vectors = toVectors(output.data, count, dims)

  assert(count === 2, `returned ${count} vectors for 2 input texts`)
  assert(dims === EMBEDDING_DIMENSIONS, `vector dimensionality is ${dims} (expected ${EMBEDDING_DIMENSIONS})`)
  assert(vectors[0].length === EMBEDDING_DIMENSIONS, `row 0 has ${vectors[0].length} dims`)
  assert(Array.isArray(vectors[0]) && !ArrayBuffer.isView(vectors[0]), 'row 0 is a plain number[], not a typed array')

  for (const [i, v] of vectors.entries()) {
    const n = norm(v)
    assert(Math.abs(n - 1) < 1e-4, `row ${i} is unit-length (norm=${n.toFixed(6)})`)
  }

  const simIdentical = cosine(vectors[0], vectors[1])
  assert(simIdentical > 0.999, `cosine(identical strings) = ${simIdentical.toFixed(6)} is ~1`)

  const t2 = Date.now()
  const otherOutput = await embedder([different], { pooling: 'mean', normalize: true })
  const tSecondEmbed = Date.now() - t2
  console.log(`second embed call (1 text, warm model): ${tSecondEmbed}ms`)

  const [otherVec] = toVectors(otherOutput.data, otherOutput.dims[0], otherOutput.dims[1])
  const simDifferent = cosine(vectors[0], otherVec)
  console.log(`cosine(different strings) = ${simDifferent.toFixed(6)}`)

  assert(
    simIdentical > simDifferent,
    `cosine(identical)=${simIdentical.toFixed(6)} > cosine(different)=${simDifferent.toFixed(6)}`,
  )

  console.log(`\nTimings: cold load=${tLoad}ms, first embed=${tFirstEmbed}ms, warm embed=${tSecondEmbed}ms`)

  if (process.exitCode === 1) {
    console.error('\nSMOKE TEST FAILED')
    process.exit(1)
  } else {
    console.log('\nSMOKE TEST PASSED')
  }
}

main().catch((e) => {
  console.error('SMOKE TEST ERRORED')
  console.error(e)
  process.exit(1)
})
