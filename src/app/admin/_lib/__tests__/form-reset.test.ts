import { describe, expect, it } from 'vitest'
import { shouldResetForm } from '../form-reset'

describe('shouldResetForm', () => {
  it('resets on the first successful action result', () => {
    const idle = { status: 'idle' }
    const success = { status: 'success', message: 'Uploaded.' }
    expect(shouldResetForm({ seen: idle }, { state: success, status: success.status })).toBe(true)
  })

  it('resets again on a second, distinct successful action result', () => {
    const firstSuccess = { status: 'success', message: 'First upload.' }
    const secondSuccess = { status: 'success', message: 'Second upload.' }
    expect(
      shouldResetForm({ seen: firstSuccess }, { state: secondSuccess, status: secondSuccess.status }),
    ).toBe(true)
  })

  it('does not reset again on a re-render with the same state object', () => {
    const success = { status: 'success', message: 'Uploaded.' }
    expect(shouldResetForm({ seen: success }, { state: success, status: success.status })).toBe(false)
  })

  it('does not reset for error states', () => {
    const idle = { status: 'idle' }
    const error = { status: 'error', message: 'Choose a file to upload.' }
    expect(shouldResetForm({ seen: idle }, { state: error, status: error.status })).toBe(false)
  })

  it('does not reset for a distinct error state following a success', () => {
    const success = { status: 'success', message: 'Uploaded.' }
    const error = { status: 'error', message: 'Something went wrong.' }
    expect(shouldResetForm({ seen: success }, { state: error, status: error.status })).toBe(false)
  })
})
