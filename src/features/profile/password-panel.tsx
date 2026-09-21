'use client'

/**
 * Changing your own password, from your profile.
 *
 * Collapsed until asked for: it is a rare action, and an open password form
 * on a page people visit for other reasons is noise.
 */

import { useActionState, useState } from 'react'
import { Button, Panel, fieldClass } from '@/features/ui/primitives'
import { changePasswordAction, type PasswordActionState } from './actions'

const IDLE: PasswordActionState = { ok: null }

export function PasswordPanel() {
  const [state, change, changing] = useActionState(changePasswordAction, IDLE)
  const [open, setOpen] = useState(false)

  return (
    <Panel
      title="Password"
      description="Only you can set this. Nobody, including an administrator, can read it."
    >
      <div className="px-5 py-4">
        {open ? (
          <form action={change} className="max-w-sm space-y-3">
            <label className="block space-y-1">
              <span className="text-xs font-medium text-muted">Current password</span>
              <input
                name="currentPassword"
                type="password"
                required
                autoComplete="current-password"
                className={fieldClass}
              />
            </label>

            <label className="block space-y-1">
              <span className="text-xs font-medium text-muted">New password</span>
              <input
                name="newPassword"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                className={fieldClass}
              />
            </label>

            <label className="block space-y-1">
              <span className="text-xs font-medium text-muted">New password again</span>
              <input
                name="confirmPassword"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                className={fieldClass}
              />
            </label>

            <div className="flex flex-wrap items-center gap-2">
              <Button type="submit" tone="primary" size="sm" disabled={changing}>
                {changing ? 'Changing…' : 'Change password'}
              </Button>
              <Button type="button" tone="quiet" size="sm" onClick={() => setOpen(false)}>
                Cancel
              </Button>
            </div>

            {state.ok !== null ? (
              <p
                role="status"
                className={`text-xs ${
                  state.ok ? 'text-status-complete' : 'text-status-overdue'
                }`}
              >
                {state.message}
              </p>
            ) : null}

            <p className="text-xs text-subtle">
              At least 8 characters. Changing it signs out every other device
              you are signed in on.
            </p>
          </form>
        ) : (
          <Button type="button" tone="secondary" size="sm" onClick={() => setOpen(true)}>
            Change my password
          </Button>
        )}
      </div>
    </Panel>
  )
}
