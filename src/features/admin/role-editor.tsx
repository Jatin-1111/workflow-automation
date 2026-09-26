'use client'

/**
 * Role assignment for one person (spec §6, §45).
 *
 * Workflows name roles, never people, so this form is the whole mechanism for
 * handling somebody joining, leaving or changing job: no template is touched.
 */

import { useActionState } from 'react'
import { ChevronRight } from 'lucide-react'
import { Button } from '@/features/ui/primitives'
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
  const heldNames = roles.filter((role) => held.has(role.roleId)).map((role) => role.name)

  return (
    <form action={save}>
      <input type="hidden" name="userId" value={userId} />

      {/* Twelve checkboxes per person turned this page into several screens
          of scrolling. What somebody holds is the answer most of the time;
          changing it is the rarer thing, so it opens on request. */}
      <details className="group">
        <summary className="flex cursor-pointer list-none items-center gap-2 py-1 text-xs transition-ui hover:text-foreground">
          <ChevronRight
            size={14}
            strokeWidth={1.75}
            aria-hidden
            className="shrink-0 text-subtle transition-transform duration-200 group-open:rotate-90"
          />
          <span className="min-w-0 text-muted">
            {heldNames.length === 0 ? (
              <span className="text-status-overdue">No workflow roles</span>
            ) : (
              <>
                <span className="font-medium text-foreground">
                  {heldNames.length} role{heldNames.length === 1 ? '' : 's'}
                </span>
                <span className="text-subtle"> — {heldNames.join(', ')}</span>
              </>
            )}
          </span>
        </summary>

        <div className="space-y-3 pt-3">
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
        <Button type="submit" tone="secondary" size="sm" disabled={saving}>
          {saving ? 'Saving…' : 'Save roles'}
        </Button>

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
        </div>
      </details>
    </form>
  )
}
