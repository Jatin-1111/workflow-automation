'use client'

/**
 * Moving an open task to somebody else (spec §46).
 *
 * Shown only to people who may reassign. The role that fed the stage is named
 * alongside, because reassigning is an override of it rather than a change to
 * it — if the same swap is needed every time, the role mapping is the fix.
 */

import { useActionState, useState } from 'react'
import { reassignAction, type TaskActionState } from './actions'

const IDLE: TaskActionState = { ok: null }

export interface AssignablePerson {
  userId: string
  name: string
  /** Workflow roles they hold, to make a sensible choice possible. */
  roles: string[]
  openTasks: number
}

export function ReassignPanel({
  taskId,
  people,
  currentAssignees,
  stageSource,
}: {
  taskId: string
  people: AssignablePerson[]
  currentAssignees: string[]
  stageSource?: string
}) {
  const [state, reassign, working] = useActionState(reassignAction, IDLE)
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState<string[]>(currentAssignees)

  const toggle = (userId: string) =>
    setSelected((current) =>
      current.includes(userId)
        ? current.filter((candidate) => candidate !== userId)
        : [...current, userId],
    )

  return (
    <section className="rounded-lg border border-border bg-surface">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold">Assignment</h2>
          {stageSource ? (
            <p className="text-[11px] text-subtle">Normally goes to {stageSource}</p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => setOpen((current) => !current)}
          className="rounded-md border border-border-strong bg-surface px-2.5 py-1 text-xs font-medium transition hover:bg-accent-soft"
        >
          {open ? 'Cancel' : 'Reassign'}
        </button>
      </div>

      {!open ? (
        <p className="px-4 py-3 text-sm text-muted">
          {people
            .filter((person) => currentAssignees.includes(person.userId))
            .map((person) => person.name)
            .join(', ') || 'Nobody'}
        </p>
      ) : (
        <form action={reassign} className="space-y-3 px-4 py-3">
          <input type="hidden" name="taskId" value={taskId} />
          {selected.map((userId) => (
            <input key={userId} type="hidden" name="assignees" value={userId} />
          ))}

          <ul className="space-y-1.5">
            {people.map((person) => (
              <li key={person.userId}>
                <label className="flex items-start gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={selected.includes(person.userId)}
                    onChange={() => toggle(person.userId)}
                    className="mt-0.5 size-3.5 accent-[var(--accent)]"
                  />
                  <span className="min-w-0">
                    <span className="block">
                      {person.name}
                      <span className="ml-2 text-xs text-subtle">
                        {person.openTasks} open
                      </span>
                    </span>
                    {person.roles.length > 0 ? (
                      <span className="block truncate text-[11px] text-subtle">
                        {person.roles.join(', ')}
                      </span>
                    ) : null}
                  </span>
                </label>
              </li>
            ))}
          </ul>

          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-medium uppercase tracking-wide text-subtle">
              Why
            </span>
            <input
              name="reason"
              placeholder="On leave, workload, handover…"
              className="rounded-md border border-border bg-surface px-2.5 py-1.5 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent-soft"
            />
          </label>

          {state.ok === false ? (
            <p role="alert" className="text-sm text-status-overdue">
              {state.errors[0]?.message}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={working || selected.length === 0}
            className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white transition hover:bg-accent-hover disabled:opacity-60"
          >
            {working ? 'Reassigning…' : 'Reassign task'}
          </button>

          <p className="text-[11px] text-subtle">
            This affects only this one task. The stage keeps the role it is
            configured with.
          </p>
        </form>
      )}
    </section>
  )
}
