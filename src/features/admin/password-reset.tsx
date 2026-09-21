'use client'

/**
 * Setting a new password for somebody who has lost theirs (spec §45).
 *
 * There is no email channel in this version, so there is no reset link. An
 * administrator sets a password and passes it on; without this, a forgotten
 * password means editing the database by hand.
 */

import { useActionState, useState } from 'react'
import { Button, buttonClass, fieldClass } from '@/features/ui/primitives'
import { resetUserPasswordAction } from './org-actions'
import type { AdminActionState } from './actions'

const IDLE: AdminActionState = { ok: null }

export function PasswordReset({
  userId,
  userName,
}: {
  userId: string
  userName: string
}) {
  const [state, reset, resetting] = useActionState(resetUserPasswordAction, IDLE)
  const [open, setOpen] = useState(false)

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={buttonClass('quiet', 'sm')}
      >
        Set password
      </button>
    )
  }

  return (
    <form action={reset} className="w-full space-y-2 border-t border-border pt-3">
      <input type="hidden" name="userId" value={userId} />

      <label className="block space-y-1">
        <span className="text-xs font-medium text-muted">
          New password for {userName}
        </span>
        <input
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className={`${fieldClass} max-w-sm`}
        />
      </label>

      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" tone="primary" size="sm" disabled={resetting}>
          {resetting ? 'Setting…' : 'Set password'}
        </Button>
        <Button type="button" tone="quiet" size="sm" onClick={() => setOpen(false)}>
          Cancel
        </Button>

        {state.ok !== null ? (
          <p
            role="status"
            className={`text-xs ${state.ok ? 'text-status-complete' : 'text-status-overdue'}`}
          >
            {state.message}
          </p>
        ) : null}
      </div>

      <p className="text-xs text-subtle">
        Tell them out of band and ask them to change it from their profile.
        Setting it signs them out everywhere.
      </p>
    </form>
  )
}
