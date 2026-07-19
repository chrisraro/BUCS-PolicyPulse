import { describe, expect, it } from 'vitest'
import { maskKey } from '../mask'

describe('maskKey', () => {
  it('shows only the last 4 characters of a real key', () => {
    expect(maskKey('AIzaSyDUMMYKEY12345678wxyz')).toBe('••••••••wxyz')
  })
  it('fully masks very short values', () => {
    expect(maskKey('abcd')).toBe('••••')
    expect(maskKey('ab')).toBe('••••')
  })
})
