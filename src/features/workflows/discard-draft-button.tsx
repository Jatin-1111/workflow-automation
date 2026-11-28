'use client'

/**
 * Throw away a draft nothing runs on.
 *
 * Asks first. It deleted on one click, sitting at the top of the page where
 * the eye goes, while a workflow somebody spent an hour building is harder to
 * recreate than a person or a project, which already asked. It uses the same
 * dialog, so every destructive control in the product behaves the same way.
 */

import { useState } from 'react'
import { ConfirmDialog } from '@/features/ui/confirm-dialog'
import { buttonClass } from '@/features/ui/primitives'
import { discardDraftAction } from './actions'

export function DiscardDraftButton({
  workflowId,
  version,
}: {
  workflowId: string
  version: number
}) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={buttonClass('quiet', 'md')}
      >
        Discard draft
      </button>
      <ConfirmDialog
        open={open}
        onClose={() => setOpen(false)}
        title={`Discard version ${version}?`}
        confirmLabel="Discard draft"
        pendingLabel="Discarding…"
        action={discardDraftAction}
        fields={
          <>
            <input type="hidden" name="workflowId" value={workflowId} />
            <input type="hidden" name="version" value={version} />
          </>
        }
      >
        Everything in this draft is lost. Live versions are not affected.
      </ConfirmDialog>
    </>
  )
}
