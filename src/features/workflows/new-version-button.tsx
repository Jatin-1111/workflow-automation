'use client'

/** Begin the next version of a published workflow (spec §38). */

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
        className="rounded-md border border-border-strong bg-surface px-3 py-1.5 text-xs font-medium transition hover:bg-accent-soft disabled:opacity-60"
      >
        {working ? 'Opening…' : 'Edit as new version'}
      </button>
      {state.ok === false ? (
        <span className="text-xs text-status-overdue">{state.message}</span>
      ) : null}
    </form>
  )
}
