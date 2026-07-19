/**
 * Pure validation helpers shared by the document-upload client form and the
 * `registerDocument` server action. Kept dependency-free (no Supabase/Next
 * imports) so both sides can share one source of truth and so this module
 * stays importable from vitest without pulling in server-only globals.
 *
 * The upload flow is: browser uploads the file bytes directly to Supabase
 * Storage (bypassing Next.js server actions and Vercel's request-size caps
 * entirely), then calls `registerDocument` with only metadata — no file
 * bytes ever pass through the server action / serverless request path. See
 * `src/app/admin/documents/upload-form.tsx` and `actions.ts`.
 */

export const ALLOWED_EXTENSIONS = ['pdf', 'txt', 'md'] as const
export type AllowedExtension = (typeof ALLOWED_EXTENSIONS)[number]

export const MIME_BY_EXT: Record<AllowedExtension, string> = {
  pdf: 'application/pdf',
  txt: 'text/plain',
  md: 'text/markdown',
}

/** The full set of mime types the server will accept on `registerDocument`. */
export const ALLOWED_MIME_TYPES: readonly string[] = Object.values(MIME_BY_EXT)

/**
 * Supabase Storage's free-tier per-object cap. The client validates against
 * this before starting an upload so oversize files fail fast with a friendly
 * message instead of a slow upload followed by a storage-side rejection.
 */
export const MAX_UPLOAD_BYTES = 50 * 1024 * 1024

export function extOf(filename: string): string {
  const match = /\.([^.]+)$/.exec(filename)
  return match ? match[1].toLowerCase() : ''
}

export function isAllowedExtension(ext: string): ext is AllowedExtension {
  return (ALLOWED_EXTENSIONS as readonly string[]).includes(ext)
}

export function stripExtension(filename: string): string {
  return filename.replace(/\.[^./\\]+$/, '')
}

/**
 * Derives the mime type to store/upload with: the browser-supplied
 * `file.type` when present (browsers usually get this right for pdf/txt),
 * falling back to the extension map — browsers frequently report an empty
 * string for `.md` files. Falls back to `application/octet-stream` for an
 * unrecognized extension with no browser-supplied type.
 */
export function mimeTypeFor(filename: string, browserMimeType?: string | null): string {
  if (browserMimeType) return browserMimeType
  const ext = extOf(filename)
  return isAllowedExtension(ext) ? MIME_BY_EXT[ext] : 'application/octet-stream'
}

export interface FileValidationResult {
  ok: boolean
  message?: string
}

/**
 * Client-side pre-upload check: file present, allowed extension, size within
 * the Supabase free-tier object cap. This is a friendliness check only — the
 * server independently re-validates everything it's given (extension isn't
 * re-checked server-side since the extension is embedded in the already
 * server-validated storage path; mime type and audience are).
 */
export function validateUploadFile(file: { name: string; size: number }): FileValidationResult {
  if (!file.name || file.size === 0) {
    return { ok: false, message: 'Choose a file to upload.' }
  }

  const ext = extOf(file.name)
  if (!isAllowedExtension(ext)) {
    return { ok: false, message: 'Only .pdf, .txt, and .md files are supported.' }
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    return { ok: false, message: 'That file is too large — the maximum size is 50 MB.' }
  }

  return { ok: true }
}

/**
 * Storage paths this app writes are always `${crypto.randomUUID()}/filename`
 * — a 36-character uuid folder segment (hyphens included), a slash, then a
 * filename with no further path separators. The server re-validates every
 * `storagePath` it's handed against this pattern before trusting it in a
 * database insert, since the client is not a trusted boundary.
 */
export const STORAGE_PATH_PATTERN = /^[0-9a-f-]{36}\/[^/\\]+$/i

export function isValidStoragePath(path: string): boolean {
  return STORAGE_PATH_PATTERN.test(path)
}
