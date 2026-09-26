'use client'

/** Throw away a draft nothing runs on. */

import { buttonClass } from '@/features/ui/primitives'
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
        className={buttonClass('quiet', 'sm')}
      >
        Discard draft
      </button>
    </form>
  )
}
