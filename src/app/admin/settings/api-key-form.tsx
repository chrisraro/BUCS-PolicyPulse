'use client'

import * as React from 'react'
import { useActionState } from 'react'
import { Button } from '@/components/ui/button'
import { StatusPill } from '@/components/ui/status-pill'
import { initialActionState } from '../_lib/action-state'
import { saveAndVerifyKey } from './actions'

const MODEL_OPTIONS = [
  { value: 'gemini-2.5-flash', label: 'gemini-2.5-flash (recommended)' },
  { value: 'gemini-2.5-flash-lite', label: 'gemini-2.5-flash-lite (higher free limits)' },
  { value: 'custom', label: 'Custom…' },
] as const

const KNOWN_MODELS = ['gemini-2.5-flash', 'gemini-2.5-flash-lite']

const inputClass =
  'h-11 rounded-input border border-border bg-bg px-3 text-sm text-ink ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface'

export function ApiKeyForm({
  maskedKey,
  chatModel,
  retrievalMode,
  verifiedAt,
}: {
  maskedKey: string | null
  chatModel: string
  retrievalMode: 'single_call' | 'agentic'
  verifiedAt: string | null
}) {
  const [state, formAction, pending] = useActionState(saveAndVerifyKey, initialActionState)
  const isCustomModel = !KNOWN_MODELS.includes(chatModel)
  const [modelSelect, setModelSelect] = React.useState(isCustomModel ? 'custom' : chatModel)
  const [customModel, setCustomModel] = React.useState(isCustomModel ? chatModel : '')

  return (
    <form
      action={formAction}
      className="flex flex-col gap-5 rounded-card border border-border bg-surface p-4"
    >
      <div>
        <h2 className="text-sm font-semibold text-ink">Provider</h2>
        <p className="mt-1 text-sm text-muted">
          Create a free API key at aistudio.google.com — no billing account needed. This one key
          powers both chat and document indexing.
        </p>
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-ink">Provider</span>
        <div className="flex items-center gap-2">
          <p className="text-sm text-ink">Gemini</p>
          <StatusPill
            kind={verifiedAt ? 'indexed' : 'pending'}
            label={verifiedAt ? 'Key verified' : 'Not verified'}
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="apiKey" className="text-sm font-medium text-ink">
          API key
        </label>
        <input
          id="apiKey"
          name="apiKey"
          type="password"
          autoComplete="off"
          placeholder={maskedKey ?? 'Paste your Gemini API key'}
          className={inputClass}
        />
        <p className="text-xs text-muted">
          {maskedKey ? `Current key: ${maskedKey}. Leave blank to keep it.` : 'No key saved yet.'}
        </p>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="chatModel" className="text-sm font-medium text-ink">
          Chat model
        </label>
        <select
          id="chatModel"
          name="chatModel"
          value={modelSelect}
          onChange={(event) => setModelSelect(event.target.value)}
          className={inputClass}
        >
          {MODEL_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {modelSelect === 'custom' ? (
          <input
            type="text"
            name="customModel"
            value={customModel}
            onChange={(event) => setCustomModel(event.target.value)}
            placeholder="e.g. gemini-2.5-pro"
            required
            className={`mt-1 ${inputClass}`}
          />
        ) : null}
      </div>

      <fieldset className="flex flex-col gap-3">
        <legend className="text-sm font-medium text-ink">Retrieval mode</legend>
        <label className="flex min-h-11 items-start gap-2 text-sm text-ink">
          <input
            type="radio"
            name="retrievalMode"
            value="single_call"
            defaultChecked={retrievalMode === 'single_call'}
            className="mt-1 h-4 w-4 border-border text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          />
          <span>
            <span className="font-medium">Single call</span>
            <span className="block text-xs text-muted">
              One request per question — recommended for free tier.
            </span>
          </span>
        </label>
        <label className="flex min-h-11 items-start gap-2 text-sm text-ink">
          <input
            type="radio"
            name="retrievalMode"
            value="agentic"
            defaultChecked={retrievalMode === 'agentic'}
            className="mt-1 h-4 w-4 border-border text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          />
          <span>
            <span className="font-medium">Agentic</span>
            <span className="block text-xs text-muted">Multi-step tool use — uses more requests.</span>
          </span>
        </label>
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
          Save &amp; verify
        </Button>
      </div>
    </form>
  )
}
