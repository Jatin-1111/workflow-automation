'use client'

/**
 * Parking a task, and calling off a run (spec §42).
 *
 * The point of both is that a delay says what it is. Work that has stopped
 * otherwise sits in a list looking merely slow, which is the silence this
 * platform exists to remove — so a reason is required, not invited.
 */

import { useActionState, useState } from 'react'
import {
  Button,
  Panel,
  Pill,
  fieldClass,
} from '@/features/ui/primitives'
import {
  cancelInstanceAction,
  holdTaskAction,
  resumeTaskAction,
  type TaskActionState,
} from './actions'

const IDLE: TaskActionState = { ok: null }

function Problem({ state }: { state: TaskActionState }) {
  if (state.ok !== false) return null
  return (
    <ul className="space-y-1">
      {state.errors.map((error) => (
        <li key={error.code} className="text-xs text-status-overdue">
          {error.message}
        </li>
      ))}
    </ul>
  )
}

export function HoldPanel({
  taskId,
  instanceId,
  status,
  heldReason,
  canOperate,
  canCancel,
}: {
  taskId: string
  instanceId: string
  status: string
  heldReason?: string
  canOperate: boolean
  canCancel: boolean
}) {
  const onHold = status === 'waiting' || status === 'blocked'

  const [holdState, hold, holding] = useActionState(holdTaskAction, IDLE)
  const [resumeState, resume, resuming] = useActionState(resumeTaskAction, IDLE)
  const [cancelState, cancel, cancelling] = useActionState(cancelInstanceAction, IDLE)

  const [opening, setOpening] = useState(false)
  const [confirming, setConfirming] = useState(false)

  if (!canOperate && !canCancel) return null

  return (
    <Panel title="If this cannot move">
      <div className="space-y-4 px-5 py-4">
        {onHold ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Pill tone={status === 'blocked' ? 'overdue' : 'waiting'}>
                {status === 'blocked' ? 'Blocked' : 'Waiting'}
              </Pill>
              {heldReason ? (
                <span className="text-sm text-muted">{heldReason}</span>
              ) : null}
            </div>

            {canOperate ? (
              <form action={resume} className="space-y-2">
                <input type="hidden" name="taskId" value={taskId} />
                <Button type="submit" tone="secondary" size="sm" disabled={resuming}>
                  {resuming ? 'Resuming…' : 'Resume this task'}
                </Button>
                <Problem state={resumeState} />
              </form>
            ) : null}
          </div>
        ) : null}

        {canOperate && !onHold ? (
          opening ? (
            <form action={hold} className="space-y-3">
              <input type="hidden" name="taskId" value={taskId} />

              <fieldset className="space-y-1.5">
                <legend className="text-xs font-medium text-muted">
                  What is happening?
                </legend>
                <label className="flex items-start gap-2 text-sm">
                  <input
                    type="radio"
                    name="hold"
                    value="waiting"
                    defaultChecked
                    className="mt-1 accent-[var(--accent)]"
                  />
                  <span>
                    Waiting
                    <span className="block text-xs text-subtle">
                      Normal delay outside the company — a client has not replied yet.
                    </span>
                  </span>
                </label>
                <label className="flex items-start gap-2 text-sm">
                  <input
                    type="radio"
                    name="hold"
                    value="blocked"
                    className="mt-1 accent-[var(--accent)]"
                  />
                  <span>
                    Blocked
                    <span className="block text-xs text-subtle">
                      Something is wrong and somebody has to clear it.
                    </span>
                  </span>
                </label>
              </fieldset>

              <label className="block space-y-1">
                <span className="text-xs font-medium text-muted">
                  What is it waiting on?
                </span>
                <input
                  name="reason"
                  required
                  maxLength={200}
                  placeholder="Client has not returned the signed brief"
                  className={fieldClass}
                />
              </label>

              <div className="flex flex-wrap items-center gap-2">
                <Button type="submit" tone="secondary" size="sm" disabled={holding}>
                  {holding ? 'Saving…' : 'Put on hold'}
                </Button>
                <Button
                  type="button"
                  tone="quiet"
                  size="sm"
                  onClick={() => setOpening(false)}
                >
                  Cancel
                </Button>
              </div>

              <Problem state={holdState} />

              <p className="text-xs text-subtle">
                The deadline does not move. This records why the work stopped, so
                the delay is visible rather than unexplained.
              </p>
            </form>
          ) : (
            <Button
              type="button"
              tone="secondary"
              size="sm"
              onClick={() => setOpening(true)}
            >
              Put this on hold
            </Button>
          )
        ) : null}

        {canCancel ? (
          <div className="border-t border-border pt-4">
            {confirming ? (
              <form action={cancel} className="space-y-3">
                <input type="hidden" name="instanceId" value={instanceId} />
                <input type="hidden" name="taskId" value={taskId} />

                <label className="block space-y-1">
                  <span className="text-xs font-medium text-muted">
                    Why is this being called off?
                  </span>
                  <input
                    name="reason"
                    required
                    maxLength={200}
                    placeholder="Client withdrew the brief"
                    className={fieldClass}
                  />
                </label>

                <div className="flex flex-wrap items-center gap-2">
                  <Button type="submit" tone="danger" size="sm" disabled={cancelling}>
                    {cancelling ? 'Cancelling…' : 'Cancel this workflow'}
                  </Button>
                  <Button
                    type="button"
                    tone="quiet"
                    size="sm"
                    onClick={() => setConfirming(false)}
                  >
                    Keep it running
                  </Button>
                </div>

                <Problem state={cancelState} />

                <p className="text-xs text-subtle">
                  This stops the whole run, not just this stage. Everyone holding
                  a part of it is told, and nothing is counted as delivered.
                </p>
              </form>
            ) : (
              <Button
                type="button"
                tone="quiet"
                size="sm"
                onClick={() => setConfirming(true)}
              >
                Cancel this workflow
              </Button>
            )}
          </div>
        ) : null}
      </div>
    </Panel>
  )
}
