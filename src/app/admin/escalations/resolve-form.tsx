'use client'

import * as React from 'react'
import { useActionState } from 'react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'
import { initialActionState } from '../_lib/action-state'
import { resolveEscalation } from './actions'

export function ResolveForm({ escalationId }: { escalationId: string }) {
  const [state, formAction, pending] = useActionState(resolveEscalation, initialActionState)
  const { showToast } = useToast()

  // `state` only gets a new reference when the action actually completes, so
  // this effect fires once per real transition.
  React.useEffect(() => {
    if (state.status === 'success') {
      showToast({ title: 'Escalation resolved', description: state.message })
    }
  }, [state, showToast])

  return (
    <form action={formAction} className="mt-2 flex flex-col gap-2">
      <input type="hidden" name="escalationId" value={escalationId} />
      <label htmlFor={`resolution-${escalationId}`} className="text-sm font-medium text-ink">
        Resolution
      </label>
      <textarea
        id={`resolution-${escalationId}`}
        name="resolution"
        required
        rows={3}
        placeholder="What did you tell the user, or where should they look?"
        className="w-full rounded-input border border-border bg-bg px-3 py-2 text-sm text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
      />
      {state.status === 'error' ? (
        <p role="alert" className="text-sm text-danger">
          {state.message}
        </p>
      ) : null}
      <div>
        <Button
          type="submit"
          variant="primary"
          size="touch"
          loading={pending}
          className="pp-pressable"
        >
          Mark resolved
        </Button>
      </div>
    </form>
  )
}
