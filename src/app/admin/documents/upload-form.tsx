'use client'

import * as React from 'react'
import { useActionState } from 'react'
import { Button } from '@/components/ui/button'
import { initialActionState } from '../_lib/action-state'
import { uploadDocument } from './actions'

const AUDIENCES = [
  { value: 'student', label: 'Students' },
  { value: 'faculty', label: 'Faculty' },
  { value: 'admin', label: 'Admin' },
] as const

const inputClass =
  'h-11 rounded-input border border-border bg-bg px-3 text-sm text-ink ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface'

export function UploadForm() {
  const [state, formAction, pending] = useActionState(uploadDocument, initialActionState)
  const [title, setTitle] = React.useState('')
  const [titleTouched, setTitleTouched] = React.useState(false)
  const formRef = React.useRef<HTMLFormElement>(null)

  // Reset the controlled title on a successful upload. Comparing against the
  // previous status during render (rather than in an effect) is the pattern
  // React recommends for "adjust state when a value changes" — it avoids an
  // extra render pass. See react.dev "You Might Not Need an Effect".
  const [prevStatus, setPrevStatus] = React.useState(state.status)
  if (prevStatus !== state.status) {
    setPrevStatus(state.status)
    if (state.status === 'success') {
      setTitle('')
      setTitleTouched(false)
    }
  }

  // The native file input / audience checkboxes are uncontrolled — resetting
  // them is a real side effect on the DOM, so it belongs in an effect. It
  // does not touch React state, so it doesn't trip the set-state-in-effect rule.
  React.useEffect(() => {
    if (state.status === 'success') {
      formRef.current?.reset()
    }
  }, [state])

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (file && !titleTouched) {
      setTitle(file.name.replace(/\.[^./\\]+$/, ''))
    }
  }

  return (
    <form
      ref={formRef}
      action={formAction}
      className="flex flex-col gap-4 rounded-card border border-border bg-surface p-4"
    >
      <h2 className="text-sm font-semibold text-ink">Upload a policy document</h2>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="file" className="text-sm font-medium text-ink">
          File
        </label>
        <input
          id="file"
          name="file"
          type="file"
          required
          accept=".pdf,.txt,.md"
          onChange={handleFileChange}
          className={
            'rounded-input border border-border bg-bg px-3 py-2 text-sm text-ink ' +
            'file:mr-3 file:rounded-input file:border-0 file:bg-surface-2 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-ink ' +
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface'
          }
        />
        <p className="text-xs text-muted">PDF, plain text, or Markdown.</p>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="title" className="text-sm font-medium text-ink">
          Title
        </label>
        <input
          id="title"
          name="title"
          type="text"
          required
          value={title}
          onChange={(event) => {
            setTitle(event.target.value)
            setTitleTouched(true)
          }}
          className={inputClass}
        />
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium text-ink">Visible to</legend>
        <div className="flex flex-wrap gap-4">
          {AUDIENCES.map((a) => (
            <label key={a.value} className="flex min-h-11 items-center gap-2 text-sm text-ink">
              <input
                type="checkbox"
                name="audience"
                value={a.value}
                defaultChecked
                className="h-4 w-4 rounded border-border text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              />
              {a.label}
            </label>
          ))}
        </div>
      </fieldset>

      {state.status === 'error' ? (
        <p
          role="alert"
          className="rounded-input border border-danger bg-danger-subtle px-3 py-2 text-sm text-danger"
        >
          {state.message}
        </p>
      ) : null}
      {state.status === 'success' ? (
        <p
          role="status"
          className="rounded-input border border-success bg-success-subtle px-3 py-2 text-sm text-success"
        >
          {state.message}
        </p>
      ) : null}

      <div>
        <Button type="submit" variant="primary" size="touch" loading={pending}>
          Upload document
        </Button>
      </div>
    </form>
  )
}
