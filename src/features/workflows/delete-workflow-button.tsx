'use client'

/**
 * Delete a whole workflow, every version of it.
 *
 * Only offered for a workflow nothing has run on; the action re-checks, so a
 * run started in the meantime still blocks it. Asks first, in the shared
 * confirm dialog, so the question never has to fit inside a table row.
 */

import { Trash2 } from 'lucide-react'
import { useActionState, useState } from 'react'
import { ConfirmDialog } from '@/features/ui/confirm-dialog'
import { IconButton } from '@/features/ui/primitives'
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
  const [open, setOpen] = useState(false)
  const [state, remove] = useActionState(deleteWorkflowAction, IDLE)

  const versions = versionCount === 1 ? 'its one version' : `all ${versionCount} versions`

  return (
    <>
      <IconButton as={Trash2} label={`Delete ${name}`} onClick={() => setOpen(true)} />
      <ConfirmDialog
        open={open}
        onClose={() => setOpen(false)}
        title={`Delete ${name}?`}
        confirmLabel="Delete workflow"
        pendingLabel="Deleting…"
        action={remove}
        error={state.ok === false ? state.message : undefined}
        fields={<input type="hidden" name="workflowId" value={workflowId} />}
      >
        This removes the workflow and {versions}. It cannot be undone.
      </ConfirmDialog>
    </>
  )
}
