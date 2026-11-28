'use client'

/**
 * Delete a whole workflow, every version of it.
 *
 * Asks first, with the same "Yes, delete / Keep" pair every other destructive
 * control in the product uses. Only offered for a workflow nothing has run on;
 * the action re-checks, so a run started in the meantime still blocks it.
 */

import { useActionState, useState } from 'react'
import { Trash2 } from 'lucide-react'
import { IconButton, buttonClass } from '@/features/ui/primitives'
import { deleteWorkflowAction, type BuilderState } from './actions'

const IDLE: BuilderState = { ok: null }

export function DeleteWorkflowButton({
  workflowId,
  name,
  versionCount,
}: {
  workflowId: string
  name: string
  versionCount: number
}) {
  const [confirming, setConfirming] = useState(false)
  const [state, remove, working] = useActionState(deleteWorkflowAction, IDLE)

  if (!confirming) {
    return (
      <IconButton
        as={Trash2}
        label={`Delete ${name}`}
        onClick={() => setConfirming(true)}
      />
    )
  }

  const versions = versionCount === 1 ? '1 version' : `all ${versionCount} versions`

  return (
    <form action={remove} className="flex flex-wrap items-center justify-end gap-2">
      <input type="hidden" name="workflowId" value={workflowId} />
      <span className="text-xs text-muted">
        Delete {name} and {versions}? This cannot be undone.
      </span>
      <button type="submit" disabled={working} className={buttonClass('danger', 'sm')}>
        {working ? 'Deleting…' : 'Yes, delete'}
      </button>
      <button
        type="button"
        onClick={() => setConfirming(false)}
        disabled={working}
        className={buttonClass('quiet', 'sm')}
      >
        Keep
      </button>
      {state.ok === false ? (
        <span className="w-full text-right text-xs text-status-overdue">{state.message}</span>
      ) : null}
    </form>
  )
}
