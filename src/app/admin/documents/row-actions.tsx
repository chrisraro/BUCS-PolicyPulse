'use client'

import * as React from 'react'
import { useActionState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { useToast } from '@/components/ui/toast'
import { initialActionState } from '../_lib/action-state'
import { deleteDocument, reindexDocument } from './actions'

export function ReindexButton({ documentId }: { documentId: string }) {
  const [state, formAction, pending] = useActionState(reindexDocument, initialActionState)
  const { showToast } = useToast()

  // `state` only gets a new reference when the action actually completes, so
  // this effect fires once per real transition (not on every unrelated
  // re-render) — no extra de-duplication bookkeeping needed.
  React.useEffect(() => {
    if (state.status === 'success') {
      showToast({ title: 'Re-index complete', description: state.message })
    } else if (state.status === 'error') {
      showToast({ title: 'Re-index failed', description: state.message })
    }
  }, [state, showToast])

  return (
    <form action={formAction}>
      <input type="hidden" name="documentId" value={documentId} />
      <Button
        type="submit"
        variant="secondary"
        size="touch"
        loading={pending}
        className="pp-pressable"
      >
        Re-index
      </Button>
    </form>
  )
}

export function DeleteDocumentButton({
  documentId,
  title,
}: {
  documentId: string
  title: string
}) {
  const [open, setOpen] = React.useState(false)
  const [state, formAction, pending] = useActionState(deleteDocument, initialActionState)
  const { showToast } = useToast()

  // Closing the dialog is React state, so it's derived during render (React's
  // "adjust state when a value changes" pattern) rather than inside the
  // effect below — the toast is a genuine external side effect and stays in
  // the effect.
  const [prevStatus, setPrevStatus] = React.useState(state.status)
  if (prevStatus !== state.status) {
    setPrevStatus(state.status)
    if (state.status === 'success') {
      setOpen(false)
    }
  }

  React.useEffect(() => {
    if (state.status === 'success') {
      showToast({ title: 'Document deleted', description: title })
    } else if (state.status === 'error') {
      showToast({ title: 'Delete failed', description: state.message })
    }
  }, [state, showToast, title])

  return (
    <>
      <Button
        variant="danger"
        size="touch"
        onClick={() => setOpen(true)}
        className="pp-pressable"
      >
        Delete
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)} title="Delete document">
        <p className="text-sm text-ink">
          Delete <strong>{title}</strong>? This removes the file and its indexed content. This
          cannot be undone.
        </p>
        <form action={formAction} className="mt-4 flex justify-end gap-2">
          <input type="hidden" name="documentId" value={documentId} />
          <Button
            type="button"
            variant="secondary"
            size="touch"
            onClick={() => setOpen(false)}
            className="pp-pressable"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="danger"
            size="touch"
            loading={pending}
            className="pp-pressable"
          >
            Delete document
          </Button>
        </form>
      </Dialog>
    </>
  )
}
