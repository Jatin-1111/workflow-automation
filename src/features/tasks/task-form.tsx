'use client'

/**
 * The working surface of a task: fields, checklist and the actions that move
 * the workflow on (spec §11, §13, §14).
 *
 * One form holds the stage's inputs, and each button submits it to a different
 * action, so a half-finished checklist is not lost by choosing Save rather than
 * Complete.
 */

import { useActionState, useEffect, useRef, useState } from 'react'
import {
  approveAction,
  completeStageAction,
  requestChangesAction,
  saveProgressAction,
  type TaskActionState,
} from './actions'
import type { ChecklistItemState } from '@/lib/types/task'
import type {
  ChecklistItemDefinition,
  FieldDefinition,
  StageDefinition,
} from '@/lib/types/workflow'
import type { FieldValue } from '@/lib/types/instance'

const IDLE: TaskActionState = { ok: null }

interface Props {
  taskId: string
  stage: StageDefinition
  fieldValues: Record<string, FieldValue>
  checklist: ChecklistItemState[]
  /** Whether each required file slot has been satisfied. */
  missingFiles: string[]
}

export function TaskForm({ taskId, stage, fieldValues, checklist, missingFiles }: Props) {
  const [saveState, save, saving] = useActionState(saveProgressAction, IDLE)
  const [completeState, complete, completing] = useActionState(completeStageAction, IDLE)
  const [approveState, approveNow, approving] = useActionState(approveAction, IDLE)
  const [rejectState, reject, rejecting] = useActionState(requestChangesAction, IDLE)

  const busy = saving || completing || approving || rejecting
  const state = [rejectState, approveState, completeState, saveState].find(
    (candidate) => candidate.ok !== null,
  )

  // Held in component state so a refused completion keeps what the user
  // ticked: losing seventeen checks to one missing file would be punishing.
  const [checked, setChecked] = useState(
    () => new Set(checklist.filter((item) => item.checked).map((item) => item.key)),
  )
  const doneCount = checked.size

  /**
   * React clears the form's DOM after an action runs, but its virtual DOM
   * still holds the old checked values, so it sees no difference and never
   * repaints: the boxes empty on screen while the count stays right. Writing
   * the state back onto the inputs after each render keeps what is on screen
   * equal to what will be submitted.
   */
  const checklistRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const inputs = checklistRef.current?.querySelectorAll<HTMLInputElement>(
      'input[type="checkbox"][name^="check:"]',
    )
    inputs?.forEach((input) => {
      const key = input.name.slice('check:'.length)
      input.checked = checked.has(key)
    })
  })

  const toggle = (key: string, isChecked: boolean) =>
    setChecked((previous) => {
      const next = new Set(previous)
      if (isChecked) next.add(key)
      else next.delete(key)
      return next
    })

  return (
    <form className="space-y-6">
      <input type="hidden" name="taskId" value={taskId} />

      {stage.fields.length > 0 ? (
        <section className="space-y-4">
          <h2 className="text-sm font-semibold">What you need to record</h2>
          {stage.fields.map((field) => (
            <Field key={field.key} field={field} value={fieldValues[field.key]} />
          ))}
        </section>
      ) : null}

      {stage.checklist.length > 0 ? (
        <section>
          <div className="mb-2 flex items-baseline justify-between">
            <h2 className="text-sm font-semibold">Checklist</h2>
            <span
              className={`text-xs ${
                doneCount === stage.checklist.length
                  ? 'text-status-complete'
                  : 'text-muted'
              }`}
            >
              {doneCount} / {stage.checklist.length} completed
            </span>
          </div>
          <ChecklistGroups
            ref={checklistRef}
            items={stage.checklist}
            checked={checked}
            onToggle={toggle}
          />
        </section>
      ) : null}

      {stage.requiresApproval ? (
        <section>
          <label className="flex flex-col gap-2">
            <span className="text-sm font-semibold">Comment</span>
            <span className="text-xs text-muted">
              Required when requesting changes, so the person revising knows what
              to fix.
            </span>
            <textarea
              name="comment"
              rows={3}
              className="rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent-soft"
            />
          </label>
        </section>
      ) : null}

      {state && state.ok === false ? (
        <div
          role="alert"
          className="rounded-md border border-border bg-accent-soft px-3 py-2 text-sm"
        >
          <p className="font-medium text-status-overdue">
            This step cannot be completed yet
          </p>
          <ul className="mt-1 list-inside list-disc space-y-0.5 text-muted">
            {state.errors.map((error) => (
              <li key={`${error.code}-${error.key ?? ''}`}>{error.message}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {missingFiles.length > 0 ? (
        <p className="text-xs text-muted">
          Still needed: {missingFiles.join(', ')}. Upload using the files panel.
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-3 border-t border-border pt-4">
        <button
          type="submit"
          formAction={save}
          disabled={busy}
          className="rounded-md border border-border-strong bg-surface px-5 py-3 text-sm font-medium transition hover:bg-accent-soft disabled:opacity-60"
        >
          {saving ? 'Saving…' : 'Save progress'}
        </button>

        {stage.requiresApproval ? (
          <>
            <button
              type="submit"
              formAction={approveNow}
              disabled={busy}
              className="rounded-md bg-accent px-5 py-3 text-sm font-medium text-white transition hover:bg-accent-hover disabled:opacity-60"
            >
              {approving ? 'Approving…' : 'Approve final'}
            </button>
            <button
              type="submit"
              formAction={reject}
              disabled={busy}
              className="rounded-md border border-border-strong bg-surface px-5 py-3 text-sm font-medium text-status-overdue transition hover:bg-accent-soft disabled:opacity-60"
            >
              {rejecting ? 'Sending back…' : 'Request changes'}
            </button>
          </>
        ) : (
          <button
            type="submit"
            formAction={complete}
            disabled={busy}
            className="rounded-md bg-accent px-5 py-3 text-sm font-medium text-white transition hover:bg-accent-hover disabled:opacity-60"
          >
            {completing ? 'Completing…' : `Complete ${stage.name}`}
          </button>
        )}
      </div>
    </form>
  )
}

function Field({ field, value }: { field: FieldDefinition; value: FieldValue }) {
  const name = `field:${field.key}`
  const defaultValue =
    value === null || value === undefined
      ? ''
      : value instanceof Date
        ? value.toISOString().slice(0, 10)
        : String(value)

  const shared =
    'rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent-soft'

  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-medium">
        {field.label}
        {field.required ? <span className="ml-1 text-status-overdue">*</span> : null}
      </span>
      {field.helpText ? (
        <span className="text-xs text-muted">{field.helpText}</span>
      ) : null}

      {field.type === 'textarea' ? (
        <textarea name={name} rows={5} defaultValue={defaultValue} className={shared} />
      ) : field.type === 'select' ? (
        <select name={name} defaultValue={defaultValue} className={shared}>
          <option value="">Select…</option>
          {(field.options ?? []).map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      ) : (
        <input
          name={name}
          type={inputType(field.type)}
          defaultValue={defaultValue}
          className={shared}
        />
      )}
    </label>
  )
}

function inputType(type: FieldDefinition['type']): string {
  if (type === 'date') return 'date'
  if (type === 'email') return 'email'
  if (type === 'phone') return 'tel'
  if (type === 'number' || type === 'currency') return 'number'
  return 'text'
}

/** Checklist items rendered under their template groups (spec §27). */
function ChecklistGroups({
  ref,
  items,
  checked,
  onToggle,
}: {
  ref: React.Ref<HTMLDivElement>
  items: ChecklistItemDefinition[]
  checked: Set<string>
  onToggle: (key: string, isChecked: boolean) => void
}) {
  const groups = new Map<string, ChecklistItemDefinition[]>()
  for (const item of items) {
    const group = item.group ?? 'Checks'
    groups.set(group, [...(groups.get(group) ?? []), item])
  }

  return (
    <div ref={ref} className="grid gap-4 sm:grid-cols-2">
      {[...groups.entries()].map(([group, groupItems]) => (
        <div key={group} className="rounded-lg border border-border p-3">
          <p className="mb-2 text-xs font-semibold text-muted">
            {group}
          </p>
          <ul className="space-y-1.5">
            {groupItems.map((item) => (
              <li key={item.key}>
                <label className="flex items-start gap-2 text-sm">
                  <input
                    type="checkbox"
                    name={`check:${item.key}`}
                    checked={checked.has(item.key)}
                    onChange={(event) => onToggle(item.key, event.target.checked)}
                    className="mt-0.5 size-3.5 accent-[var(--accent)]"
                  />
                  <span>{item.label}</span>
                </label>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}
