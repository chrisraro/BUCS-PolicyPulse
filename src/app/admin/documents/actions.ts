'use server'

import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/auth-server'
import { createAdminClient } from '@/lib/supabase/admin'
import { runIngest } from '@/lib/rag/ingest-runner'
import type { UserRole } from '@/lib/auth'
import type { ActionState } from '../_lib/action-state'
import { ALLOWED_MIME_TYPES, isValidStoragePath } from '../_lib/upload-validation'

const BUCKET = 'policy-documents'

export interface RegisterDocumentInput {
  storagePath: string
  title: string
  mimeType: string
  audience: string[]
}

/**
 * Registers a document that the browser has already uploaded directly to
 * Supabase Storage (see `upload-form.tsx`). This action never receives file
 * bytes — only metadata — which is what keeps it clear of both the Next.js
 * Server Action body-size limit and Vercel's serverless request cap that
 * made the old `uploadDocument` action crash on real PDFs.
 *
 * `storagePath` is the only field with any trust boundary implication (it
 * becomes part of a storage lookup + a DB row other code will later
 * `download()`), so it gets both a shape check (`isValidStoragePath` — must
 * be `${uuid}/filename`, rejecting traversal, leading slashes, and missing
 * uuid segments) and an existence check against the bucket. `title` just
 * needs to be non-empty text; `mimeType`/`audience` are checked against
 * fixed allow-lists. Nothing here is transformed or sanitized further before
 * being stored: `storage_path` is passed straight into the query builder
 * (correct, since Postgres bind parameters are used, not string
 * concatenation), so the regex + existence check are the only hardening this
 * action performs.
 */
export async function registerDocument(input: RegisterDocumentInput): Promise<ActionState> {
  let uploadedBy: string
  try {
    const ctx = await requireAdmin()
    uploadedBy = ctx.user.id
  } catch {
    return { status: 'error', message: 'Admin access required.' }
  }

  const storagePath = String(input.storagePath ?? '').trim()
  if (!storagePath || !isValidStoragePath(storagePath)) {
    return { status: 'error', message: 'Invalid storage path.' }
  }

  const title = String(input.title ?? '').trim()
  if (!title) {
    return { status: 'error', message: 'Title is required.' }
  }

  const mimeType = String(input.mimeType ?? '')
  if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
    return { status: 'error', message: 'Unsupported file type.' }
  }

  const audience = (input.audience ?? [])
    .map(String)
    .filter((v): v is UserRole => v === 'student' || v === 'faculty' || v === 'admin')
  if (audience.length === 0) {
    return { status: 'error', message: 'Choose at least one audience.' }
  }

  const admin = createAdminClient()

  // The DB shouldn't ever point at a storage object that doesn't exist, so
  // confirm the upload actually landed before inserting. `list()` on the
  // uuid folder is the cheapest reliable existence check available on the
  // storage client (a HEAD-style call, no bytes transferred).
  const [folder, ...rest] = storagePath.split('/')
  const filename = rest.join('/')
  const { data: listing, error: listError } = await admin.storage.from(BUCKET).list(folder)
  const exists = !listError && (listing ?? []).some((f) => f.name === filename)
  if (!exists) {
    return { status: 'error', message: 'Uploaded file not found in storage — please try again.' }
  }

  const { data: doc, error: insertError } = await admin
    .from('documents')
    .insert({
      title,
      storage_path: storagePath,
      mime_type: mimeType,
      audience,
      uploaded_by: uploadedBy,
    })
    .select('id')
    .single()

  if (insertError || !doc) {
    // The upload already landed in storage (confirmed above) but the DB row
    // failed — clean up the orphaned object rather than leaving a file with
    // no corresponding document.
    await admin.storage.from(BUCKET).remove([storagePath])
    return {
      status: 'error',
      message: `Could not save the document record: ${insertError?.message ?? 'unknown error'}`,
    }
  }

  try {
    await runIngest(admin, doc.id as string)
    revalidatePath('/admin/documents')
    revalidatePath('/admin')
    return { status: 'success', message: `"${title}" uploaded and indexed.` }
  } catch (e) {
    revalidatePath('/admin/documents')
    revalidatePath('/admin')
    return {
      status: 'error',
      message: `"${title}" was uploaded but indexing failed: ${e instanceof Error ? e.message : 'unknown error'}`,
    }
  }
}

export async function reindexDocument(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    await requireAdmin()
  } catch {
    return { status: 'error', message: 'Admin access required.' }
  }

  const documentId = String(formData.get('documentId') ?? '')
  if (!documentId) return { status: 'error', message: 'Missing document id.' }

  const admin = createAdminClient()
  try {
    const { chunkCount } = await runIngest(admin, documentId)
    revalidatePath('/admin/documents')
    revalidatePath('/admin')
    return { status: 'success', message: `Re-indexed with ${chunkCount} chunk${chunkCount === 1 ? '' : 's'}.` }
  } catch (e) {
    revalidatePath('/admin/documents')
    revalidatePath('/admin')
    return { status: 'error', message: e instanceof Error ? e.message : 'Re-index failed.' }
  }
}

export async function deleteDocument(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    await requireAdmin()
  } catch {
    return { status: 'error', message: 'Admin access required.' }
  }

  const documentId = String(formData.get('documentId') ?? '')
  if (!documentId) return { status: 'error', message: 'Missing document id.' }

  const admin = createAdminClient()
  const { data: doc, error } = await admin
    .from('documents')
    .select('storage_path')
    .eq('id', documentId)
    .single()

  if (error || !doc) {
    return { status: 'error', message: 'Document not found.' }
  }

  // Delete the DB row first (chunks cascade from it). If storage removal
  // below then fails, the worst outcome is an orphaned file sitting in a
  // private bucket — harmless. Doing it in the other order risks a document
  // row left pointing at a storage object that no longer exists.
  const { error: deleteError } = await admin.from('documents').delete().eq('id', documentId)
  if (deleteError) {
    return { status: 'error', message: `Delete failed: ${deleteError.message}` }
  }

  await admin.storage.from(BUCKET).remove([doc.storage_path as string])

  revalidatePath('/admin/documents')
  revalidatePath('/admin')
  return { status: 'success', message: 'Document deleted.' }
}
