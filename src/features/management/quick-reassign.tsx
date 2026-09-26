'use client'

/**
 * Moving a task to somebody else, from the list where the problem was spotted.
 *
 * The oversight pages were entirely read-only: a manager could see that work
 * was stuck and then had to open the task, find the panel, and start again
 * there — seven interactions to unstick one row they were already looking at.
 * Seeing a problem and fixing it should not be two different places.
 *
 * Deliberately the smaller half of the task page's panel: one person and an
 * optional reason. Anything more considered belongs on the task itself, and
 * the link to it is right there.
 */

import { useActionState, useState } from 'react'
import { UserRoundCog } from 'lucide-react'
import { Button, buttonClass, controlClass, fieldClass } from '@/features/ui/primitives'
import { reassignAction, type TaskActionState } from '@/features/tasks/actions'

const IDLE: TaskActionState = { ok: null }

export interface Candidate {
  userId: string
  name: string
  openTasks: number
}

export function QuickReassign({
  taskId,
  currentAssignees,
  people,
}: {
  taskId: string
  currentAssignees: string[]
  people: Candidate[]
}) {
  const [state, reassign, working] = useActionState(reassignAction, IDLE)
  const [open, setOpen] = useState(false)

  const holders = new Set(currentAssignees)
  const others = people.filter((person) => !holders.has(person.userId))

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={buttonClass('quiet', 'sm')}
      >
        <UserRoundCog size={14} strokeWidth={1.75} aria-hidden />
        Reassign
      </button>
    )
  }

  return (
    <form action={reassign} className="flex w-full flex-wrap items-center gap-2">
      <input type="hidden" name="taskId" value={taskId} />

      <label className="sr-only" htmlFor={`assignee-${taskId}`}>
        Move this task to
      </label>
      <select
        id={`assignee-${taskId}`}
        name="assignees"
        required
        defaultValue=""
        className={`${controlClass} min-w-44`}
      >
        <option value="" disabled>
          Move to…
        </option>
        {others.map((person) => (
          <option key={person.userId} value={person.userId}>
            {person.name} — {person.openTasks} open
          </option>
        ))}
      </select>

      <input
        name="reason"
        placeholder="Why (optional)"
        maxLength={200}
        className={`${fieldClass} w-auto min-w-40 flex-1`}
      />

      <Button type="submit" tone="secondary" size="sm" disabled={working}>
        {working ? 'Moving…' : 'Move'}
      </Button>
      <Button type="button" tone="quiet" size="sm" onClick={() => setOpen(false)}>
        Cancel
      </Button>

      {state.ok === false ? (
        <p role="status" className="w-full text-xs text-status-overdue">
          {state.errors.map((error) => error.message).join(' ')}
        </p>
      ) : null}
    </form>
  )
}
