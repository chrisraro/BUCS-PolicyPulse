import { describe, expect, it } from 'vitest'
import { audienceFor, isAllowedSignupEmail } from '@/lib/auth'

describe('audienceFor', () => {
  it('student can only see student-audience documents', () => {
    expect(audienceFor('student')).toEqual(['student'])
  })

  it('faculty can see student + faculty documents', () => {
    expect(audienceFor('faculty')).toEqual(['student', 'faculty'])
  })

  it('admin can see everything', () => {
    expect(audienceFor('admin')).toEqual(['student', 'faculty', 'admin'])
  })
})

describe('isAllowedSignupEmail', () => {
  it('accepts a bicol-u.edu.ph email', () => {
    expect(isAllowedSignupEmail('juan@bicol-u.edu.ph')).toBe(true)
  })

  it('accepts a bicol-u.edu.ph email regardless of case', () => {
    expect(isAllowedSignupEmail('JUAN@BICOL-U.EDU.PH')).toBe(true)
  })

  it('accepts a bicol-u.edu.ph email with surrounding whitespace', () => {
    expect(isAllowedSignupEmail(' juan@bicol-u.edu.ph ')).toBe(true)
  })

  it('rejects a non-university email', () => {
    expect(isAllowedSignupEmail('juan@gmail.com')).toBe(false)
  })

  it('rejects a lookalike domain', () => {
    expect(isAllowedSignupEmail('juan@notbicol-u.edu.ph')).toBe(false)
  })
})
