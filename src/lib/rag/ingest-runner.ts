import type { SupabaseClient } from '@supabase/supabase-js'
import { chunkText, embedTexts, extractDocText } from './ingest'
import { getRagSettings } from './settings'

export async function runIngest(
  admin: SupabaseClient,
  documentId: string,
): Promise<{ chunkCount: number }> {
  const { data: doc, error } = await admin.from('documents').select('*').eq('id', documentId).single()
  if (error || !doc) throw new Error('document not found')

  await admin.from('documents').update({ status: 'processing', error: null }).eq('id', doc.id)
  try {
    const { data: blob, error: dlErr } = await admin.storage
      .from('policy-documents')
      .download(doc.storage_path)
    if (dlErr || !blob) throw new Error(`download failed: ${dlErr?.message}`)

    const text = await extractDocText(new Uint8Array(await blob.arrayBuffer()), doc.mime_type)
    if (!text.trim()) throw new Error('no extractable text in document')

    const settings = await getRagSettings(admin)
    const chunks = chunkText(text, settings.chunk_size, settings.chunk_overlap)
    const embeddings = await embedTexts(chunks)

    // re-index safe: replace previous chunks
    await admin.from('document_chunks').delete().eq('document_id', doc.id)
    const rows = chunks.map((content, i) => ({
      document_id: doc.id,
      chunk_index: i,
      content,
      embedding: embeddings[i],
      metadata: { title: doc.title },
    }))
    for (let i = 0; i < rows.length; i += 100) {
      const { error: insErr } = await admin.from('document_chunks').insert(rows.slice(i, i + 100))
      if (insErr) throw new Error(`chunk insert failed: ${insErr.message}`)
    }

    await admin
      .from('documents')
      .update({ status: 'indexed', chunk_count: chunks.length })
      .eq('id', doc.id)
    return { chunkCount: chunks.length }
  } catch (e) {
    await admin
      .from('documents')
      .update({ status: 'failed', error: e instanceof Error ? e.message : String(e) })
      .eq('id', doc.id)
    throw e
  }
}
