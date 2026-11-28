'use client'

/** Begin the next version of a published workflow (spec §38). */

import { Button, Icon, IconButton } from '@/features/ui/primitives'
import { Pencil } from 'lucide-react'
import { useActionState } from 'react'
import { createVersionAction, type BuilderState } from './actions'

const IDLE: BuilderState = { ok: null }

export function NewVersionButton({
  workflowId,
  labeled = false,
  label = 'Edit as new version',
}: {
  workflowId: string
  /** A button with its words, for a page where this is the main thing to do;
      a row in a list gets the bare pencil. */
  labeled?: boolean
  label?: string
}) {
  const [state, start, working] = useActionState(createVersionAction, IDLE)

  return (
    <form action={start} className="flex items-center justify-end gap-2">
      <input type="hidden" name="workflowId" value={workflowId} />
      {labeled ? (
        <Button type="submit" disabled={working}>
          <Icon as={Pencil} size="sm" />
          {working ? 'Opening…' : label}
        </Button>
      ) : (
        <IconButton
          as={Pencil}
          label={working ? 'Opening…' : label}
          type="submit"
          disabled={working}
        />
      )}
      {state.ok === false ? (
        <span className="text-xs text-status-overdue">{state.message}</span>
      ) : null}
    </form>
  )
}
