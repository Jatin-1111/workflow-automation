'use client'

/** Throw away a draft nothing runs on. */

import { discardDraftAction } from './actions'

export function DiscardDraftButton({
  workflowId,
  version,
}: {
  workflowId: string
  version: number
}) {
  return (
    <form action={discardDraftAction}>
      <input type="hidden" name="workflowId" value={workflowId} />
      <input type="hidden" name="version" value={version} />
      <button
        type="submit"
        className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted transition hover:border-border-strong hover:text-status-overdue"
      >
        Discard draft
      </button>
    </form>
  )
}
