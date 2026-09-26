'use client'

/**
 * Managing one kind of organisational entity (spec §45).
 *
 * Departments, teams, projects and roles differ only in their label and what
 * they can be attached to, so they share a component rather than four
 * near-identical ones.
 *
 * Each row offers Edit and Delete. Deleting is a real delete, refused by the
 * server when something still points at the record — users carry a department
 * and a team, workflows name roles and projects — because removing one out
 * from under them would leave ids resolving to nothing. Retiring something
 * that is in use is the active/inactive control inside Edit.
 */

import { useActionState, useState } from 'react'
import { TriangleAlert } from 'lucide-react'
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
  description?: string
  status: 'active' | 'inactive'
  /** Something is wrong with this record and should be seen, not read for. */
  alert?: string
}

export interface SelectField {
  name: string
  label: string
  options: { value: string; label: string }[]
}

function Answer({ state }: { state: AdminActionState }) {
  if (state.ok === null) return null
  return (
    <p
      role="status"
      className={`text-xs ${state.ok ? 'text-status-complete' : 'text-status-overdue'}`}
    >
      {state.message}
    </p>
  )
}

function Row({
  entity,
  label,
  idField,
  updateAction,
  deleteAction,
  describable,
}: {
  entity: OrgEntity
  label: string
  idField: string
  updateAction: (formData: FormData) => void | Promise<void>
  deleteAction: (
    previous: AdminActionState,
    formData: FormData,
  ) => Promise<AdminActionState>
  describable: boolean
}) {
  const [editing, setEditing] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [removeState, remove, removing] = useActionState(deleteAction, IDLE)

  if (editing) {
    return (
      <li className="bg-surface-sunken px-5 py-4">
        <form action={updateAction} className="space-y-3">
          <input type="hidden" name={idField} value={entity.id} />

          <label className="block space-y-1">
            <span className="text-xs font-medium text-muted">Name</span>
            <input
              name="name"
              defaultValue={entity.name}
              required
              maxLength={80}
              className={fieldClass}
            />
          </label>

          {describable ? (
            <label className="block space-y-1">
              <span className="text-xs font-medium text-muted">What it is for</span>
              <input
                name="description"
                defaultValue={entity.description ?? ''}
                maxLength={200}
                className={fieldClass}
              />
            </label>
          ) : null}

          <label className="block space-y-1">
            <span className="text-xs font-medium text-muted">Status</span>
            <select
              name="status"
              defaultValue={entity.status}
              className={`${controlClass} block w-full max-w-xs`}
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive — kept, but not offered</option>
            </select>
          </label>

          <div className="flex flex-wrap items-center gap-2">
            <Button type="submit" tone="primary" size="sm">
              Save {label.toLowerCase()}
            </Button>
            <Button type="button" tone="quiet" size="sm" onClick={() => setEditing(false)}>
              Cancel
            </Button>
          </div>
        </form>
      </li>
    )
  }

  return (
    <li
      className={`flex flex-wrap items-center gap-3 bg-surface px-5 py-3 ${
        entity.alert ? 'bg-status-overdue-soft/40' : ''
      }`}
    >
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5">
          {entity.alert ? (
            <TriangleAlert
              size={14}
              strokeWidth={1.75}
              aria-hidden
              className="shrink-0 text-status-overdue"
            />
          ) : null}
          <span className="truncate text-sm font-medium">{entity.name}</span>
        </span>
        <span className="font-mono text-xs text-subtle">{entity.id}</span>
        {entity.alert ? (
          <span className="mt-0.5 block text-xs font-medium text-status-overdue">
            {entity.alert}
          </span>
        ) : entity.detail ? (
          <span className="mt-0.5 block text-xs text-muted">{entity.detail}</span>
        ) : null}
        {removeState.ok === false ? (
          <span className="mt-1 block">
            <Answer state={removeState} />
          </span>
        ) : null}
      </span>

      {entity.status === 'inactive' ? <Pill tone="neutral">Inactive</Pill> : null}

      {confirming ? (
        <form action={remove} className="flex shrink-0 items-center gap-2">
          <input type="hidden" name={idField} value={entity.id} />
          <span className="text-xs text-muted">Delete {entity.name}?</span>
          <button type="submit" disabled={removing} className={buttonClass('danger', 'sm')}>
            {removing ? 'Deleting…' : 'Yes, delete'}
          </button>
          <button
            type="button"
            onClick={() => setConfirming(false)}
            className={buttonClass('quiet', 'sm')}
          >
            Keep
          </button>
        </form>
      ) : (
        <span className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => setEditing(true)}
            className={buttonClass('quiet', 'sm')}
          >
            Edit
          </button>
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className={buttonClass('quiet', 'sm')}
          >
            Delete
          </button>
        </span>
      )}
    </li>
  )
}

export function OrgManager({
  label,
  idField,
  entities,
  createAction,
  updateAction,
  deleteAction,
  selectField,
  describable = false,
  columns = false,
  hint,
}: {
  /** Singular, as it appears in the form: "Department". */
  label: string
  /** The form field the update and delete actions read the id from. */
  idField: string
  entities: OrgEntity[]
  createAction: (
    previous: AdminActionState,
    formData: FormData,
  ) => Promise<AdminActionState>
  updateAction: (formData: FormData) => void | Promise<void>
  deleteAction: (
    previous: AdminActionState,
    formData: FormData,
  ) => Promise<AdminActionState>
  selectField?: SelectField
  describable?: boolean
  /** Lay the records out as cards. Worth it past about eight of them. */
  columns?: boolean
  hint?: string
}) {
  const [state, create, creating] = useActionState(createAction, IDLE)

  return (
    <div className="divide-y divide-border">
      <ul
        className={
          columns
            ? 'grid gap-px bg-border sm:grid-cols-2 xl:grid-cols-3'
            : 'divide-y divide-border'
        }
      >
        {entities.length === 0 ? (
          <li className="px-5 py-6 text-center text-sm text-muted">
            No {label.toLowerCase()} yet.
          </li>
        ) : null}

        {entities.map((entity) => (
          <Row
            key={entity.id}
            entity={entity}
            label={label}
            idField={idField}
            updateAction={updateAction}
            deleteAction={deleteAction}
            describable={describable}
          />
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

        <Answer state={state} />

        {hint ? <p className="text-xs text-subtle">{hint}</p> : null}
      </form>
    </div>
  )
}
