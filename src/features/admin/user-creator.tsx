'use client'

/**
 * Adding somebody who can sign in and receive work (spec §45).
 *
 * The roles chosen here decide what reaches them; the access level decides
 * what they can see. They are independent, and the form says so, because
 * conflating the two is the mistake people reliably make.
 */

import { useActionState, useState } from 'react'
import {
  Button,
  controlClass,
  fieldClass,
} from '@/features/ui/primitives'
import { createUserAction } from './org-actions'
import type { AdminActionState } from './actions'

const IDLE: AdminActionState = { ok: null }

export interface Option {
  value: string
  label: string
}

export function UserCreator({
  departments,
  teams,
  roles,
}: {
  departments: Option[]
  teams: Option[]
  roles: Option[]
}) {
  const [state, create, creating] = useActionState(createUserAction, IDLE)
  const [open, setOpen] = useState(false)

  if (!open) {
    return (
      <div className="bg-surface-sunken px-5 py-3">
        <Button type="button" tone="secondary" size="sm" onClick={() => setOpen(true)}>
          Add a person
        </Button>
      </div>
    )
  }

  return (
    <form action={create} className="space-y-3 bg-surface-sunken px-5 py-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-1">
          <span className="text-xs font-medium text-muted">Name</span>
          <input name="name" required maxLength={80} className={fieldClass} />
        </label>

        <label className="space-y-1">
          <span className="text-xs font-medium text-muted">Email</span>
          <input name="email" type="email" required className={fieldClass} />
        </label>

        <label className="space-y-1">
          <span className="text-xs font-medium text-muted">Starting password</span>
          <input
            name="password"
            type="password"
            required
            minLength={8}
            className={fieldClass}
          />
        </label>

        <label className="space-y-1">
          <span className="text-xs font-medium text-muted">Access level</span>
          <select name="accessLevel" defaultValue="employee" className={`${controlClass} block w-full`}>
            <option value="employee">Employee — their own work</option>
            <option value="manager">Manager — the team&rsquo;s work too</option>
            <option value="admin">Administrator — everything</option>
          </select>
        </label>

        <label className="space-y-1">
          <span className="text-xs font-medium text-muted">Phone (optional)</span>
          <input name="phone" type="tel" maxLength={40} className={fieldClass} />
        </label>

        <label className="space-y-1">
          <span className="text-xs font-medium text-muted">Joining date (optional)</span>
          <input name="joiningDate" type="date" className={fieldClass} />
        </label>

        <label className="space-y-1 sm:col-span-2">
          <span className="text-xs font-medium text-muted">
            Photo URL (optional)
          </span>
          <input
            name="photoUrl"
            type="url"
            placeholder="https://…"
            className={fieldClass}
          />
        </label>

        <label className="space-y-1">
          <span className="text-xs font-medium text-muted">Department</span>
          <select name="departmentId" defaultValue="" className={`${controlClass} block w-full`}>
            <option value="">Not set</option>
            {departments.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-1">
          <span className="text-xs font-medium text-muted">Team</span>
          <select name="teamId" defaultValue="" className={`${controlClass} block w-full`}>
            <option value="">Not set</option>
            {teams.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <fieldset className="space-y-1.5">
        <legend className="text-xs font-medium text-muted">
          Workflow roles — what work reaches them
        </legend>
        <div className="grid gap-x-6 gap-y-1.5 sm:grid-cols-3">
          {roles.map((role) => (
            <label key={role.value} className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                name="roleIds"
                value={role.value}
                className="mt-0.5 size-3.5 accent-[var(--accent)]"
              />
              <span>{role.label}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" tone="primary" disabled={creating}>
          {creating ? 'Adding…' : 'Add person'}
        </Button>
        <Button type="button" tone="quiet" onClick={() => setOpen(false)}>
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
        Tell them the password out of band. They can change it themselves from
        their profile, and you can set a new one here if they lose it. An access
        level is not a role: somebody can be an employee holding three roles, or
        an administrator holding none.
      </p>
    </form>
  )
}
