'use client'

/** Begin the next version of a published workflow (spec §38). */

import { buttonClass } from '@/features/ui/primitives'
import { useActionState } from 'react'
import { createVersionAction, type BuilderState } from './actions'

const IDLE: BuilderState = { ok: null }

export function NewVersionButton({ workflowId }: { workflowId: string }) {
  const [state, start, working] = useActionState(createVersionAction, IDLE)

  return (
    <form action={start} className="flex items-center gap-2">
      <input type="hidden" name="workflowId" value={workflowId} />
      <button
        type="submit"
        disabled={working}
        className={buttonClass('secondary', 'sm')}
      >
        {working ? 'Opening…' : 'Edit as new version'}
      </button>
      {state.ok === false ? (
        <span className="text-xs text-status-overdue">{state.message}</span>
      ) : null}
    </form>
  )
}
