'use client'

/**
 * Take a workflow out of service.
 *
 * What a workflow that has run work is offered in place of Delete, which would
 * leave that history pointing at nothing. The dialog says what it does to
 * running work, since that is what anyone hesitating will want to know.
 */

import { Archive } from 'lucide-react'
import { useActionState, useState } from 'react'
import { ConfirmDialog } from '@/features/ui/confirm-dialog'
import { IconButton } from '@/features/ui/primitives'
import { retireWorkflowAction, type BuilderState } from './actions'

const IDLE: BuilderState = { ok: null }

export function RetireWorkflowButton({
  workflowId,
  name,
}: {
  workflowId: string
  name: string
}) {
  const [open, setOpen] = useState(false)
  const [state, retire] = useActionState(retireWorkflowAction, IDLE)

  return (
    <>
      <IconButton as={Archive} label={`Retire ${name}`} onClick={() => setOpen(true)} />
      <ConfirmDialog
        open={open && state.ok !== true}
        onClose={() => setOpen(false)}
        title={`Retire ${name}?`}
        confirmLabel="Retire workflow"
        pendingLabel="Retiring…"
        action={retire}
        error={state.ok === false ? state.message : undefined}
        fields={<input type="hidden" name="workflowId" value={workflowId} />}
      >
        Nothing new can be started on it. Work already running carries on to the end.
      </ConfirmDialog>
    </>
  )
}
