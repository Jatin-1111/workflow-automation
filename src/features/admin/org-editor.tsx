'use client'

/**
 * Managing one kind of organisational entity (spec §45).
 *
 * Departments, teams, projects and roles differ only in their label and what
 * they can be attached to, so they share a component rather than four
 * near-identical ones.
 *
 * Retiring an entity deactivates it. Nothing is deleted, because users, tasks
 * and timeline events point at these ids and a delete would turn recorded
 * history into dangling references.
 */

import { useActionState } from 'react'
import {
  Button,
  Pill,
  buttonClass,
  controlClass,
  fieldClass,
} from '@/features/ui/primitives'
import type { AdminActionState } from './actions'

const IDLE: AdminActionState = { ok: null }

export interface OrgEntity {
  id: string
  name: string
  /** A second line, such as which department a team sits in. */
  detail?: string
  status: 'active' | 'inactive'
  /** Why this one cannot be retired, when it cannot. */
  lockedReason?: string
}

export interface SelectField {
  name: string
  label: string
  options: { value: string; label: string }[]
}

export function OrgManager({
  label,
  idField,
  entities,
  createAction,
  updateAction,
  selectField,
  describable = false,
  hint,
}: {
  /** Singular, as it appears in the form: "Department". */
  label: string
  /** The form field the update action reads the id from. */
  idField: string
  entities: OrgEntity[]
  createAction: (
    previous: AdminActionState,
    formData: FormData,
  ) => Promise<AdminActionState>
  updateAction: (formData: FormData) => void | Promise<void>
  selectField?: SelectField
  describable?: boolean
  hint?: string
}) {
  const [state, create, creating] = useActionState(createAction, IDLE)

  return (
    <div className="divide-y divide-border">
      <ul className="divide-y divide-border">
        {entities.length === 0 ? (
          <li className="px-5 py-6 text-center text-sm text-muted">
            No {label.toLowerCase()} yet.
          </li>
        ) : null}

        {entities.map((entity) => (
          <li key={entity.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium">{entity.name}</span>
              <span className="font-mono text-xs text-subtle">{entity.id}</span>
              {entity.detail ? (
                <span className="mt-0.5 block text-xs text-muted">{entity.detail}</span>
              ) : null}
            </span>

            {entity.status === 'inactive' ? <Pill tone="neutral">Inactive</Pill> : null}

            {entity.lockedReason ? (
              <span className="shrink-0 text-xs text-subtle">{entity.lockedReason}</span>
            ) : (
              <form action={updateAction} className="shrink-0">
                <input type="hidden" name={idField} value={entity.id} />
                <input
                  type="hidden"
                  name="status"
                  value={entity.status === 'active' ? 'inactive' : 'active'}
                />
                <button type="submit" className={buttonClass('quiet', 'sm')}>
                  {entity.status === 'active' ? 'Deactivate' : 'Reactivate'}
                </button>
              </form>
            )}
          </li>
        ))}
      </ul>

      <form action={create} className="space-y-3 bg-surface-sunken px-5 py-4">
        <div className="flex flex-wrap items-end gap-3">
          <label className="min-w-48 flex-1 space-y-1">
            <span className="text-xs font-medium text-muted">New {label.toLowerCase()}</span>
            <input
              name="name"
              required
              maxLength={80}
              placeholder={`${label} name`}
              className={fieldClass}
            />
          </label>

          {selectField ? (
            <label className="space-y-1">
              <span className="text-xs font-medium text-muted">{selectField.label}</span>
              <select name={selectField.name} className={`${controlClass} block`} defaultValue="">
                <option value="">Not set</option>
                {selectField.options.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          <Button type="submit" tone="primary" disabled={creating}>
            {creating ? 'Adding…' : `Add ${label.toLowerCase()}`}
          </Button>
        </div>

        {describable ? (
          <input
            name="description"
            maxLength={200}
            placeholder="What it is for (optional)"
            className={fieldClass}
          />
        ) : null}

        {state.ok !== null ? (
          <p
            role="status"
            className={`text-xs ${state.ok ? 'text-status-complete' : 'text-status-overdue'}`}
          >
            {state.message}
          </p>
        ) : null}

        {hint ? <p className="text-xs text-subtle">{hint}</p> : null}
      </form>
    </div>
  )
}
