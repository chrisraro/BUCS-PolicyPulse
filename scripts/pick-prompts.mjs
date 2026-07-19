// Evidence-based welcome-prompt picker: embeds candidate questions with the
// SAME local model the app uses (Supabase/gte-small), runs the real
// match_document_chunks RPC against the live vector store, and reports the
// top hit + similarity per candidate. Run: node scripts/pick-prompts.mjs
import { pipeline } from '@huggingface/transformers'

const SUPABASE_URL = 'https://ujmzmmgjqdgywhdhrfgx.supabase.co'
const SECRET = process.env.SUPABASE_SECRET_KEY
if (!SECRET) {
  console.error('Set SUPABASE_SECRET_KEY')
  process.exit(1)
}

const candidates = [
  'What is the grading policy?',
  'What are the requirements for graduating with honors?',
  'How do I drop a subject?',
  'What are the attendance requirements?',
  'How do I file an academic appeal?',
  'How do I apply for a leave of absence?',
  'What are the requirements for enrollment?',
  'What are the graduation requirements?',
  'What is the dress code or uniform policy?',
  'What scholarships are available?',
  'What are the grounds for disciplinary action?',
  'What are the rules on unauthorized solicitation?',
  'How is the General Weighted Average computed?',
  'What are the requirements for shifting or transferring courses?',
]

const embedder = await pipeline('feature-extraction', 'Supabase/gte-small')

async function topHit(question) {
  const out = await embedder([question], { pooling: 'mean', normalize: true })
  const embedding = Array.from(out.data)
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/match_document_chunks`, {
    method: 'POST',
    headers: { apikey: SECRET, Authorization: `Bearer ${SECRET}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query_embedding: embedding,
      match_threshold: 0.3,
      match_count: 4,
      allowed_roles: ['student'],
    }),
  })
  const rows = await res.json()
  if (!Array.isArray(rows) || rows.length === 0) return { sim: 0, count: 0, snippet: '(no match above 0.3)' }
  return {
    sim: rows[0].similarity,
    count: rows.length,
    snippet: rows[0].content.replace(/\s+/g, ' ').slice(0, 140),
  }
}

const results = []
for (const q of candidates) {
  const r = await topHit(q)
  results.push({ q, ...r })
}
results.sort((a, b) => b.sim - a.sim)
for (const r of results) {
  console.log(`${r.sim.toFixed(3)}  hits=${r.count}  ${r.q}`)
  console.log(`        ↳ ${r.snippet}`)
}
