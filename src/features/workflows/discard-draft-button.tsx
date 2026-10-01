'use client'

/**
 * Throw away a draft nothing runs on.
 *
 * Asks first. It deleted on one click, sitting at the top of the page
 * where the eye goes, while deleting a person or a project — both easier
 * to recreate than a workflow somebody spent an hour building — already
 * asked "Yes, delete / Keep". This uses the same pair, so every
 * destructive control in the product behaves the same way.
 */

import { useState } from 'react'
import { buttonClass } from '@/features/ui/primitives'
import { discardDraftAction } from './actions'

export function DiscardDraftButton({
  workflowId,
  version,
}: {
  workflowId: string
  version: number
}) {
  const [confirming, setConfirming] = useState(false)

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className={buttonClass('quiet', 'sm')}
      >
        Discard draft
      </button>
    )
  }

  return (
    <form action={discardDraftAction} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="workflowId" value={workflowId} />
      <input type="hidden" name="version" value={version} />
      <span className="text-xs text-muted">
        Discard version {version}? Everything in this draft is lost.
      </span>
      <button type="submit" className={buttonClass('danger', 'sm')}>
        Yes, discard
      </button>
      <button
        type="button"
        onClick={() => setConfirming(false)}
        className={buttonClass('quiet', 'sm')}
      >
        Keep
      </button>
    </form>
  )
}
