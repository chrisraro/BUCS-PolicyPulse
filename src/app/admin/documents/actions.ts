'use server'

import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/auth-server'
import { createAdminClient } from '@/lib/supabase/admin'
import { runIngest } from '@/lib/rag/ingest-runner'
import type { UserRole } from '@/lib/auth'
import type { ActionState } from '../_lib/action-state'
import { isValidStoragePath, mimeTypeFromStoragePath } from '../_lib/upload-validation'

const BUCKET = 'policy-documents'

export interface RegisterDocumentInput {
  storagePath: string
  title: string
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
 * needs to be non-empty text; `audience` is checked against a fixed
 * allow-list. `mimeType` is NOT accepted from the client at all — browsers
 * frequently report non-canonical or empty `file.type` values (especially
 * for `.md`), which would otherwise let a file pass client-side validation,
 * upload to storage, and only then fail a server-side allow-list check.
 * Instead the mime type is derived server-side from the (already
 * shape-validated) storage path's extension via `mimeTypeFromStoragePath`.
 * Nothing here is transformed or sanitized further before being stored:
 * `storage_path` is passed straight into the query builder (correct, since
 * Postgres bind parameters are used, not string concatenation), so the
 * regex + existence check are the only hardening this action performs.
 *
 * Any validation failure that occurs *after* the storage path's shape has
 * been confirmed valid means the caller pointed at a real (or plausibly
 * real) object this action is responsible for — so those failures make a
 * best-effort attempt to remove the storage object before returning the
 * error, to avoid leaving it permanently orphaned. Failures before the
 * shape check (admin auth, invalid shape) never touch storage: a
 * non-admin can't have a legitimate upload to clean up, and an
 * unvalidated path string must never be passed to a delete call.
 */
async function cleanupOrphan(admin: ReturnType<typeof createAdminClient>, storagePath: string) {
  try {
    await admin.storage.from(BUCKET).remove([storagePath])
  } catch {
    // Best-effort only — the caller is already returning a validation error;
    // a failed cleanup just leaves the orphan for later, it must not mask
    // the original error.
  }
}

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

  const admin = createAdminClient()

  const title = String(input.title ?? '').trim()
  if (!title) {
    await cleanupOrphan(admin, storagePath)
    return { status: 'error', message: 'Title is required.' }
  }

  const mimeType = mimeTypeFromStoragePath(storagePath)
  if (!mimeType) {
    await cleanupOrphan(admin, storagePath)
    return { status: 'error', message: 'Unsupported file type.' }
  }

  const audience = (input.audience ?? [])
    .map(String)
    .filter((v): v is UserRole => v === 'student' || v === 'faculty' || v === 'admin')
  if (audience.length === 0) {
    await cleanupOrphan(admin, storagePath)
    return { status: 'error', message: 'Choose at least one audience.' }
  }

  // The DB shouldn't ever point at a storage object that doesn't exist, so
  // confirm the upload actually landed before inserting. `list()` on the
  // uuid folder is the cheapest reliable existence check available on the
  // storage client (a HEAD-style call, no bytes transferred). No cleanup on
  // failure here — if the file isn't there, there's nothing to remove.
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
    if (insertError?.code === '23505') {
      // Unique violation on storage_path: the storage object may belong to
      // an EXISTING document row (e.g. a duplicate registration attempt), so
      // removing it here would delete another document's live file. Leave
      // storage untouched.
      return {
        status: 'error',
        message: 'A document already exists for this file path — refresh and check the documents list.',
      }
    }
    // The upload already landed in storage (confirmed above) but the DB row
    // failed for some other reason — clean up the orphaned object rather
    // than leaving a file with no corresponding document.
    await cleanupOrphan(admin, storagePath)
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
