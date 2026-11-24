'use client'

/**
 * Changing your own password, from your profile.
 *
 * Collapsed until asked for: it is a rare action, and an open password form
 * on a page people visit for other reasons is noise. Once open it takes focus,
 * closes on Escape, and can show what is typed: three blind password fields on
 * a phone is how people end up locked out by their own typos.
 */

import { useActionState, useRef, useState } from 'react'
import { PASSWORD } from '@/lib/validation/bounds'
import { Button, Panel, fieldClass } from '@/features/ui/primitives'
import { changePasswordAction, type PasswordActionState } from './actions'

const IDLE: PasswordActionState = { ok: null }

export function PasswordPanel() {
  const [state, change, changing] = useActionState(changePasswordAction, IDLE)
  const [open, setOpen] = useState(false)
  const [reveal, setReveal] = useState(false)
  const opener = useRef<HTMLButtonElement>(null)

  const type = reveal ? 'text' : 'password'

  function close() {
    setOpen(false)
    setReveal(false)
    // Back to the button that opened it, so a keyboard user is not dropped.
    requestAnimationFrame(() => opener.current?.focus())
  }

  return (
    <Panel
      fill
      className="flex-1"
      title="Password"
      description="Only you can set this. Nobody, including an administrator, can read it."
    >
      <div className="px-5 py-4">
        {open ? (
          <form
            action={change}
            onKeyDown={(event) => {
              if (event.key === 'Escape') close()
            }}
            className="space-y-3"
          >
            <label className="block space-y-1">
              <span className="text-xs font-semibold text-muted">Current password</span>
              <input
                name="currentPassword"
                type={type}
                required
                autoFocus
                autoComplete="current-password"
                maxLength={PASSWORD.max}
                className={fieldClass}
              />
            </label>

            <label className="block space-y-1">
              <span className="text-xs font-semibold text-muted">New password</span>
              <input
                name="newPassword"
                type={type}
                required
                minLength={PASSWORD.min}
                maxLength={PASSWORD.max}
                autoComplete="new-password"
                className={fieldClass}
              />
            </label>

            <label className="block space-y-1">
              <span className="text-xs font-semibold text-muted">New password again</span>
              <input
                name="confirmPassword"
                type={type}
                required
                minLength={PASSWORD.min}
                maxLength={PASSWORD.max}
                autoComplete="new-password"
                className={fieldClass}
              />
            </label>

            <label className="flex items-center gap-2 text-sm text-muted">
              <input
                type="checkbox"
                checked={reveal}
                onChange={(event) => setReveal(event.target.checked)}
                className="size-4 accent-[var(--accent)]"
              />
              Show what I type
            </label>

            <div className="flex flex-wrap items-center gap-2">
              <Button type="submit" tone="primary" size="sm" disabled={changing}>
                {changing ? 'Changing…' : 'Change password'}
              </Button>
              <Button type="button" tone="quiet" size="sm" onClick={close}>
                Cancel
              </Button>
            </div>

            {state.ok !== null ? (
              <p
                role={state.ok ? 'status' : 'alert'}
                className={`text-sm font-medium ${
                  state.ok ? 'text-status-complete' : 'text-status-overdue'
                }`}
              >
                {state.message}
              </p>
            ) : null}

            <p className="text-xs text-subtle">
              At least {PASSWORD.min} characters. Changing it signs out every other device
              you are signed in on.
            </p>
          </form>
        ) : (
          <div className="space-y-3">
            <Button
              ref={opener}
              type="button"
              tone="secondary"
              size="sm"
              onClick={() => setOpen(true)}
            >
              Change my password
            </Button>
            {state.ok === true ? (
              <p role="status" className="text-sm font-medium text-status-complete">
                {state.message}
              </p>
            ) : null}
          </div>
        )}
      </div>
    </Panel>
  )
}
