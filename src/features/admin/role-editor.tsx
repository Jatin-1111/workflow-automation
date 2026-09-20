'use client'

/**
 * Role assignment for one person (spec §6, §45).
 *
 * Workflows name roles, never people, so this form is the whole mechanism for
 * handling somebody joining, leaving or changing job: no template is touched.
 */

import { useActionState } from 'react'
import { updateRolesAction, type AdminActionState } from './actions'

const IDLE: AdminActionState = { ok: null }

export interface RoleOption {
  roleId: string
  name: string
  /** Names of everyone else who currently holds this role. */
  otherHolders: string[]
}

export function RoleEditor({
  userId,
  userName,
  roles,
  assigned,
}: {
  userId: string
  userName: string
  roles: RoleOption[]
  assigned: string[]
}) {
  const [state, save, saving] = useActionState(updateRolesAction, IDLE)
  const held = new Set(assigned)

  return (
    <form action={save} className="space-y-3">
      <input type="hidden" name="userId" value={userId} />

      <fieldset className="grid gap-x-6 gap-y-1.5 sm:grid-cols-2">
        <legend className="sr-only">Workflow roles for {userName}</legend>
        {roles.map((role) => (
          <label key={role.roleId} className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              name="roleIds"
              value={role.roleId}
              defaultChecked={held.has(role.roleId)}
              className="mt-0.5 size-3.5 accent-[var(--accent)]"
            />
            <span>
              {role.name}
              {role.otherHolders.length > 0 ? (
                <span className="block text-xs text-subtle">
                  also held by {role.otherHolders.join(', ')}
                </span>
              ) : null}
            </span>
          </label>
        ))}
      </fieldset>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={saving}
          className="rounded-md border border-border-strong bg-surface px-3 py-1.5 text-sm font-medium transition hover:bg-accent-soft disabled:opacity-60"
        >
          {saving ? 'Saving…' : 'Save roles'}
        </button>

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
      </div>

      <p className="text-xs text-subtle">
        Changes apply to work assigned from now on. Stages already open keep the
        people they were given to.
      </p>
    </form>
  )
}
