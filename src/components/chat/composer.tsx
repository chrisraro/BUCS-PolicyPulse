'use client'

import { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/cn'

export interface ComposerProps {
  /** True while a request is in flight — disables the textarea. */
  disabled: boolean
  /** True while submitted/streaming — swaps Send for Stop. */
  isBusy: boolean
  onSubmit: (text: string) => void
  onStop: () => void
}

const MAX_HEIGHT_PX = 168 // ~6 lines at the base type scale, then scrolls.

export function Composer({ disabled, isBusy, onSubmit, onStop }: ComposerProps) {
  const [value, setValue] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  function resize() {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, MAX_HEIGHT_PX)}px`
  }

  function submit() {
    const text = value.trim()
    if (!text || disabled) return
    onSubmit(text)
    setValue('')
    requestAnimationFrame(resize)
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      submit()
    }
  }

  return (
    <div className="border-t border-border bg-surface pt-3 pb-[calc(env(safe-area-inset-bottom)_+_0.75rem)]">
      <form
        onSubmit={(event) => {
          event.preventDefault()
          submit()
        }}
        className="mx-auto flex w-full max-w-[46rem] items-end gap-2 px-4 sm:px-6"
      >
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(event) => {
            setValue(event.target.value)
            resize()
          }}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          rows={1}
          placeholder="Ask about a BUCS policy…"
          aria-label="Message"
          className={cn(
            'min-h-11 flex-1 resize-none overflow-y-auto rounded-input border border-border bg-bg px-3 py-2.5 text-sm text-ink placeholder:text-muted',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface',
            'disabled:cursor-not-allowed disabled:opacity-60',
            'transition-colors duration-[var(--duration-fast)] ease-[var(--ease-out)]',
          )}
          style={{ maxHeight: MAX_HEIGHT_PX }}
        />
        {isBusy ? (
          <Button type="button" variant="secondary" size="touch" onClick={onStop} aria-label="Stop generating">
            Stop
          </Button>
        ) : (
          <Button
            type="submit"
            variant="primary"
            size="touch"
            disabled={!value.trim()}
            aria-label="Send message"
          >
            Send
          </Button>
        )}
      </form>
    </div>
  )
}
