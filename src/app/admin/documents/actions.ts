'use server'

import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/auth-server'
import { createAdminClient } from '@/lib/supabase/admin'
import { runIngest } from '@/lib/rag/ingest-runner'
import type { UserRole } from '@/lib/auth'
import type { ActionState } from '../_lib/action-state'

const BUCKET = 'policy-documents'
const ALLOWED_EXTENSIONS = ['pdf', 'txt', 'md'] as const

const MIME_BY_EXT: Record<(typeof ALLOWED_EXTENSIONS)[number], string> = {
  pdf: 'application/pdf',
  txt: 'text/plain',
  md: 'text/markdown',
}

function extOf(filename: string): string {
  const match = /\.([^.]+)$/.exec(filename)
  return match ? match[1].toLowerCase() : ''
}

function stripExtension(filename: string): string {
  return filename.replace(/\.[^./\\]+$/, '')
}

export async function uploadDocument(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    await requireAdmin()
  } catch {
    return { status: 'error', message: 'Admin access required.' }
  }

  const file = formData.get('file')
  if (!(file instanceof File) || file.size === 0) {
    return { status: 'error', message: 'Choose a file to upload.' }
  }

  const ext = extOf(file.name)
  if (!(ALLOWED_EXTENSIONS as readonly string[]).includes(ext)) {
    return { status: 'error', message: 'Only .pdf, .txt, and .md files are supported.' }
  }

  const titleInput = String(formData.get('title') ?? '').trim()
  const title = titleInput || stripExtension(file.name)

  const audience = formData
    .getAll('audience')
    .map(String)
    .filter((v): v is UserRole => v === 'student' || v === 'faculty' || v === 'admin')
  if (audience.length === 0) {
    return { status: 'error', message: 'Choose at least one audience.' }
  }

  const admin = createAdminClient()
  const storagePath = `${crypto.randomUUID()}/${file.name}`
  const mimeType = file.type || MIME_BY_EXT[ext as (typeof ALLOWED_EXTENSIONS)[number]]

  const { error: uploadError } = await admin.storage
    .from(BUCKET)
    .upload(storagePath, file, { contentType: mimeType, upsert: false })
  if (uploadError) {
    return { status: 'error', message: `Upload failed: ${uploadError.message}` }
  }

  const { data: doc, error: insertError } = await admin
    .from('documents')
    .insert({ title, storage_path: storagePath, mime_type: mimeType, audience })
    .select('id')
    .single()

  if (insertError || !doc) {
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

  await admin.storage.from(BUCKET).remove([doc.storage_path as string])

  const { error: deleteError } = await admin.from('documents').delete().eq('id', documentId)
  if (deleteError) {
    return { status: 'error', message: `Delete failed: ${deleteError.message}` }
  }

  revalidatePath('/admin/documents')
  revalidatePath('/admin')
  return { status: 'success', message: 'Document deleted.' }
}
