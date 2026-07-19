'use client'

import * as React from 'react'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { initialActionState, type ActionState } from '../_lib/action-state'
import { shouldResetForm } from '../_lib/form-reset'
import { mimeTypeFor, stripExtension, validateUploadFile } from '../_lib/upload-validation'
import { registerDocument } from './actions'

const AUDIENCES = [
  { value: 'student', label: 'Students' },
  { value: 'faculty', label: 'Faculty' },
  { value: 'admin', label: 'Admin' },
] as const

const BUCKET = 'policy-documents'

const inputClass =
  'h-11 w-full rounded-input border border-border bg-bg px-3 text-sm text-ink ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface'

// The upload is a two-phase client-driven flow (see actions.ts for why):
// the browser uploads bytes straight to Supabase Storage, then a server
// action is called with metadata only. 'uploading' and 'indexing' are shown
// as distinct states because the upload phase is the slow one on mobile
// connections, while indexing (embedding + chunking on the server) is the
// slow one on large documents — worth telling those apart.
type Phase = 'idle' | 'uploading' | 'indexing'

const PHASE_LABEL: Record<Phase, string> = {
  idle: 'Upload document',
  uploading: 'Uploading…',
  indexing: 'Indexing…',
}

export function UploadForm() {
  const [state, setState] = React.useState<ActionState>(initialActionState)
  const [phase, setPhase] = React.useState<Phase>('idle')
  const [title, setTitle] = React.useState('')
  const [titleTouched, setTitleTouched] = React.useState(false)
  const formRef = React.useRef<HTMLFormElement>(null)

  const pending = phase !== 'idle'

  // Reset the controlled title on every DISTINCT successful upload. Adjusting
  // state during render (rather than in an effect) is the pattern React
  // recommends for "adjust state when a value changes" — it avoids an extra
  // render pass. See react.dev "You Might Not Need an Effect".
  //
  // We track the previous *state object* rather than just `state.status`:
  // two consecutive successful uploads both report status 'success', so a
  // plain status comparison would never notice the second completion, and
  // the title field (plus titleTouched) would keep showing the first
  // upload's title. Each completed registration produces a fresh object, so
  // comparing identity reliably distinguishes a new completion from an
  // unrelated re-render of the same result.
  const [prevState, setPrevState] = React.useState(state)
  if (shouldResetForm({ seen: prevState }, { state, status: state.status })) {
    setPrevState(state)
    setTitle('')
    setTitleTouched(false)
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
      setTitle(stripExtension(file.name))
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const formData = new FormData(event.currentTarget)
    const file = formData.get('file')
    const titleInput = String(formData.get('title') ?? '').trim()
    const audience = formData.getAll('audience').map(String)

    if (!(file instanceof File)) {
      setState({ status: 'error', message: 'Choose a file to upload.' })
      return
    }

    const validation = validateUploadFile(file)
    if (!validation.ok) {
      setState({ status: 'error', message: validation.message })
      return
    }

    if (audience.length === 0) {
      setState({ status: 'error', message: 'Choose at least one audience.' })
      return
    }

    const finalTitle = titleInput || stripExtension(file.name)
    const mimeType = mimeTypeFor(file.name, file.type)
    const storagePath = `${crypto.randomUUID()}/${file.name}`

    setPhase('uploading')
    const supabase = createClient()
    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, file, { contentType: mimeType, upsert: false })

    if (uploadError) {
      setPhase('idle')
      setState({ status: 'error', message: `Upload failed: ${uploadError.message}` })
      return
    }

    setPhase('indexing')
    const result = await registerDocument({
      storagePath,
      title: finalTitle,
      audience,
    })
    setPhase('idle')
    setState(result)
  }

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
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
            'min-h-11 w-full rounded-input border border-border bg-bg px-3 py-2 text-sm text-ink ' +
            'file:mr-3 file:rounded-input file:border-0 file:bg-surface-2 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-ink ' +
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface'
          }
        />
        <p className="text-xs text-muted">PDF, plain text, or Markdown. Up to 50 MB.</p>
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
      {phase !== 'idle' ? (
        <div role="status" className="pp-enter flex flex-col gap-2">
          <p className="text-sm text-muted">{PHASE_LABEL[phase]}</p>
          <div className="pp-progress h-1 w-full">
            <span />
          </div>
          {phase === 'indexing' ? (
            <p className="text-xs text-muted">Large documents can take a few minutes.</p>
          ) : null}
        </div>
      ) : null}

      <div>
        <Button
          type="submit"
          variant="primary"
          size="touch"
          loading={pending}
          className="pp-pressable"
        >
          {PHASE_LABEL[phase]}
        </Button>
      </div>
    </form>
  )
}
