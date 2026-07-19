import { describe, expect, it } from 'vitest'
import {
  isValidStoragePath,
  mimeTypeFor,
  mimeTypeFromStoragePath,
  validateUploadFile,
} from '../upload-validation'

describe('mimeTypeFor', () => {
  it('falls back to application/pdf for .pdf when the browser gives no type', () => {
    expect(mimeTypeFor('policy.pdf', '')).toBe('application/pdf')
    expect(mimeTypeFor('policy.pdf')).toBe('application/pdf')
  })

  it('falls back to text/plain for .txt when the browser gives no type', () => {
    expect(mimeTypeFor('notes.txt', null)).toBe('text/plain')
  })

  it('falls back to text/markdown for .md when the browser gives no type', () => {
    expect(mimeTypeFor('readme.md', '')).toBe('text/markdown')
  })

  it('falls back to application/octet-stream for an unrecognized extension', () => {
    expect(mimeTypeFor('archive.zip')).toBe('application/octet-stream')
    expect(mimeTypeFor('noextension')).toBe('application/octet-stream')
  })

  it('prefers the browser-supplied type when one is present', () => {
    expect(mimeTypeFor('policy.pdf', 'application/pdf')).toBe('application/pdf')
    expect(mimeTypeFor('weird-file', 'application/custom')).toBe('application/custom')
  })
})

describe('validateUploadFile', () => {
  it('accepts an allowed extension within the size cap', () => {
    expect(validateUploadFile({ name: 'policy.pdf', size: 1024 })).toEqual({ ok: true })
    expect(validateUploadFile({ name: 'notes.txt', size: 1024 })).toEqual({ ok: true })
    expect(validateUploadFile({ name: 'readme.md', size: 1024 })).toEqual({ ok: true })
  })

  it('accepts a file exactly at the 50 MB cap', () => {
    const fiftyMb = 50 * 1024 * 1024
    expect(validateUploadFile({ name: 'policy.pdf', size: fiftyMb }).ok).toBe(true)
  })

  it('rejects a file over the 50 MB cap with a friendly message', () => {
    const overCap = 50 * 1024 * 1024 + 1
    const result = validateUploadFile({ name: 'policy.pdf', size: overCap })
    expect(result.ok).toBe(false)
    expect(result.message).toMatch(/50 ?MB/i)
  })

  it('rejects an unsupported extension', () => {
    const result = validateUploadFile({ name: 'policy.docx', size: 1024 })
    expect(result.ok).toBe(false)
    expect(result.message).toMatch(/\.pdf.*\.txt.*\.md/i)
  })

  it('rejects an empty file', () => {
    const result = validateUploadFile({ name: 'policy.pdf', size: 0 })
    expect(result.ok).toBe(false)
  })

  it('rejects a missing filename', () => {
    const result = validateUploadFile({ name: '', size: 1024 })
    expect(result.ok).toBe(false)
  })
})

describe('isValidStoragePath', () => {
  const uuid = '3fa85f64-5717-4562-b3fc-2c963f66afa6'

  it('accepts a uuid folder followed by a filename', () => {
    expect(isValidStoragePath(`${uuid}/policy.pdf`)).toBe(true)
    expect(isValidStoragePath(`${uuid}/some name with spaces.pdf`)).toBe(true)
  })

  it('rejects path traversal', () => {
    expect(isValidStoragePath('../etc/passwd')).toBe(false)
    expect(isValidStoragePath(`${uuid}/../../etc/passwd`)).toBe(false)
  })

  it('rejects a leading slash', () => {
    expect(isValidStoragePath(`/${uuid}/policy.pdf`)).toBe(false)
  })

  it('rejects a path missing the uuid segment', () => {
    expect(isValidStoragePath('policy.pdf')).toBe(false)
  })

  it('rejects an empty string', () => {
    expect(isValidStoragePath('')).toBe(false)
  })
})

describe('mimeTypeFromStoragePath', () => {
  const uuid = '3fa85f64-5717-4562-b3fc-2c963f66afa6'

  it('derives application/pdf for a .pdf storage path', () => {
    expect(mimeTypeFromStoragePath(`${uuid}/policy.pdf`)).toBe('application/pdf')
  })

  it('derives text/plain for a .txt storage path', () => {
    expect(mimeTypeFromStoragePath(`${uuid}/notes.txt`)).toBe('text/plain')
  })

  it('derives text/markdown for a .md storage path', () => {
    expect(mimeTypeFromStoragePath(`${uuid}/readme.md`)).toBe('text/markdown')
  })

  it('returns null for an unrecognized extension', () => {
    expect(mimeTypeFromStoragePath(`${uuid}/archive.zip`)).toBeNull()
  })

  it('returns null when the filename has no extension', () => {
    expect(mimeTypeFromStoragePath(`${uuid}/noextension`)).toBeNull()
  })

  it('is case-insensitive on the extension', () => {
    expect(mimeTypeFromStoragePath(`${uuid}/POLICY.PDF`)).toBe('application/pdf')
    expect(mimeTypeFromStoragePath(`${uuid}/Notes.TXT`)).toBe('text/plain')
    expect(mimeTypeFromStoragePath(`${uuid}/Readme.Md`)).toBe('text/markdown')
  })
})
