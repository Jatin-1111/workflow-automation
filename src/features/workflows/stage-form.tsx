'use client'

/**
 * Editing one stage (spec §35).
 *
 * Every control here writes a field the engine already reads, so configuring a
 * stage is the same act as writing one by hand in a seed file.
 */

import { buttonClass } from '@/features/ui/primitives'
import type { RoleOption } from './workflow-editor'
import type {
  AssigneeSource,
  ChecklistItemDefinition,
  FieldDefinition,
  FieldType,
  RequiredFileDefinition,
  StageCondition,
  StageDefinition,
} from '@/lib/types/workflow'
import type { RoleId } from '@/lib/types/ids'
import { FIELD_TYPES } from '@/lib/types/workflow'
import { PRIORITIES } from '@/lib/types/status'

/**
 * Derive a machine key from a label.
 *
 * Applied only while the key is still an untouched placeholder, so a key that
 * somebody has set - or that work has already run against - is never rewritten
 * underneath them.
 */
function deriveKey(label: string, placeholder: string, current: string): string {
  if (current !== placeholder) return current
  const derived = label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/^([0-9])/, 'item_$1')
  return derived || placeholder
}

const input =
  'w-full rounded-md border border-border bg-surface px-2.5 py-1.5 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent-soft'
const label = 'text-xs font-medium text-muted'

export function StageForm({
  stage,
  stages,
  roles,
  isInitial,
  onChange,
  onMakeInitial,
}: {
  stage: StageDefinition
  stages: StageDefinition[]
  roles: RoleOption[]
  isInitial: boolean
  onChange: (next: StageDefinition) => void
  onMakeInitial: () => void
}) {
  const set = <K extends keyof StageDefinition>(key: K, value: StageDefinition[K]) =>
    onChange({ ...stage, [key]: value })

  const others = stages.filter((candidate) => candidate.key !== stage.key)

  return (
    <div className="space-y-6">
      <section className="grid gap-3 sm:grid-cols-2">
        <Labelled text="Stage name">
          <input
            className={input}
            value={stage.name}
            onChange={(event) => set('name', event.target.value)}
          />
        </Labelled>
        <Labelled text="Key" hint="Used by routing. Avoid changing it once work has run.">
          <input
            className={`${input} font-mono`}
            value={stage.key}
            onChange={(event) => set('key', event.target.value)}
          />
        </Labelled>
      </section>

      <Labelled text="Instructions" hint="Shown to whoever the stage is assigned to.">
        <textarea
          className={input}
          rows={3}
          value={stage.instructions ?? ''}
          onChange={(event) => set('instructions', event.target.value)}
        />
      </Labelled>

      <AssigneeEditor
        stage={stage}
        others={others}
        roles={roles}
        onChange={(assignees) => set('assignees', assignees)}
      />

      <section className="grid gap-3 sm:grid-cols-4">
        <Labelled text="Priority">
          <select
            className={input}
            value={stage.priority}
            onChange={(event) => set('priority', event.target.value as StageDefinition['priority'])}
          >
            {PRIORITIES.map((priority) => (
              <option key={priority} value={priority}>
                {priority}
              </option>
            ))}
          </select>
        </Labelled>
        <Labelled text="Due in (hours)">
          <input
            className={input}
            type="number"
            min={0}
            value={stage.dueInHours ?? ''}
            onChange={(event) =>
              set('dueInHours', event.target.value ? Number(event.target.value) : undefined)
            }
          />
        </Labelled>
        <Labelled text="SLA (hours)" hint="Flags stuck work.">
          <input
            className={input}
            type="number"
            min={0}
            value={stage.slaHours ?? ''}
            onChange={(event) =>
              set('slaHours', event.target.value ? Number(event.target.value) : undefined)
            }
          />
        </Labelled>
        <Labelled
          text="Completion"
          hint="Only matters when a stage has more than one owner."
        >
          <select
            className={input}
            value={stage.completionRule}
            onChange={(event) =>
              set('completionRule', event.target.value as StageDefinition['completionRule'])
            }
          >
            <option value="any">Either one finishes it</option>
            <option value="all">Everyone must finish</option>
          </select>
        </Labelled>
      </section>

      <section className="space-y-3 rounded-lg border border-border p-3">
        <label className="flex items-center gap-2 text-sm font-medium">
          <input
            type="checkbox"
            checked={stage.requiresApproval}
            onChange={(event) => set('requiresApproval', event.target.checked)}
            className="size-3.5 accent-[var(--accent)]"
          />
          This stage approves or rejects the work
        </label>

        {stage.requiresApproval ? (
          <Labelled
            text="Send rejected work to"
            hint="A comment is always required when rejecting."
          >
            <select
              className={input}
              value={stage.rejectTargetStageKey ?? ''}
              onChange={(event) =>
                set('rejectTargetStageKey', event.target.value || undefined)
              }
            >
              <option value="">Choose a stage…</option>
              {others.map((candidate) => (
                <option key={candidate.key} value={candidate.key}>
                  {candidate.name || candidate.key}
                </option>
              ))}
            </select>
          </Labelled>
        ) : null}
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        <Labelled text="When complete, continue to">
          <select
            className={input}
            value={stage.nextStageKey ?? ''}
            onChange={(event) => set('nextStageKey', event.target.value || null)}
          >
            <option value="">Finish the workflow</option>
            {others.map((candidate) => (
              <option key={candidate.key} value={candidate.key}>
                {candidate.name || candidate.key}
              </option>
            ))}
          </select>
        </Labelled>

        <div className="flex items-end">
          {isInitial ? (
            <p className="text-xs text-muted">This is the stage the workflow starts on.</p>
          ) : (
            <button
              type="button"
              onClick={onMakeInitial}
              className="rounded-md border border-border-strong bg-surface px-3 py-1.5 text-sm transition hover:bg-accent-soft"
            >
              Start the workflow here
            </button>
          )}
        </div>
      </section>

      <ConditionsEditor
        stage={stage}
        stages={stages}
        isInitial={isInitial}
        onChange={(conditions) => set('conditions', conditions)}
      />

      <FieldsEditor stage={stage} onChange={(fields) => set('fields', fields)} />
      <FilesEditor stage={stage} onChange={(files) => set('files', files)} />
      <ChecklistEditor stage={stage} onChange={(checklist) => set('checklist', checklist)} />
    </div>
  )
}

function Labelled({
  text,
  hint,
  children,
}: {
  text: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className={label}>{text}</span>
      {children}
      {hint ? <span className="text-xs text-subtle">{hint}</span> : null}
    </label>
  )
}

function Part({
  title,
  hint,
  onAdd,
  addLabel,
  children,
}: {
  title: string
  hint: string
  onAdd: () => void
  addLabel: string
  children: React.ReactNode
}) {
  return (
    <section className="rounded-lg border border-border">
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <div>
          <h3 className="text-sm font-semibold">{title}</h3>
          <p className="text-xs text-subtle">{hint}</p>
        </div>
        <button
          type="button"
          onClick={onAdd}
          className={buttonClass('secondary', 'sm')}
        >
          {addLabel}
        </button>
      </div>
      {children}
    </section>
  )
}

function RemoveButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Remove"
      className="shrink-0 rounded border border-border px-2 py-1 text-xs text-muted transition hover:border-border-strong hover:text-status-overdue"
    >
      Remove
    </button>
  )
}

/** Where the stage's people come from (spec §6, §22, §31). */
function AssigneeEditor({
  stage,
  others,
  roles,
  onChange,
}: {
  stage: StageDefinition
  others: StageDefinition[]
  roles: RoleOption[]
  onChange: (next: AssigneeSource[]) => void
}) {
  const update = (index: number, next: AssigneeSource) =>
    onChange(stage.assignees.map((source, i) => (i === index ? next : source)))

  return (
    <Part
      title="Who does this stage"
      hint="A stage goes to everyone these add up to."
      addLabel="Add"
      onAdd={() => onChange([...stage.assignees, { mode: 'role', roleId: '' as RoleId }])}
    >
      {stage.assignees.length === 0 ? (
        <p className="px-3 py-4 text-sm text-muted">
          Nobody yet. Work cannot reach this stage until somebody can receive it.
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {stage.assignees.map((source, index) => (
            <li key={index} className="flex items-center gap-2 px-3 py-2">
              <select
                className={`${input} max-w-52`}
                value={source.mode}
                onChange={(event) => {
                  const mode = event.target.value as AssigneeSource['mode']
                  if (mode === 'role') update(index, { mode, roleId: '' as RoleId })
                  else if (mode === 'users') update(index, { mode, userIds: [] })
                  else if (mode === 'initiator') update(index, { mode })
                  else update(index, { mode, stageKey: others[0]?.key ?? '' })
                }}
              >
                <option value="role">Whoever holds a role</option>
                <option value="initiator">Whoever started the workflow</option>
                <option value="stage_assignee">Whoever did an earlier stage</option>
                <option value="users">Specific people</option>
              </select>

              {source.mode === 'role' ? (
                <select
                  className={input}
                  value={source.roleId}
                  onChange={(event) =>
                    update(index, { mode: 'role', roleId: event.target.value as RoleId })
                  }
                >
                  <option value="">Choose a role…</option>
                  {roles.map((role) => (
                    <option key={role.roleId} value={role.roleId}>
                      {role.name}
                      {role.holders.length === 0 ? ' — nobody assigned' : ''}
                    </option>
                  ))}
                </select>
              ) : null}

              {source.mode === 'stage_assignee' ? (
                <select
                  className={input}
                  value={source.stageKey}
                  onChange={(event) =>
                    update(index, { mode: 'stage_assignee', stageKey: event.target.value })
                  }
                >
                  <option value="">Choose a stage…</option>
                  {others.map((candidate) => (
                    <option key={candidate.key} value={candidate.key}>
                      {candidate.name || candidate.key}
                    </option>
                  ))}
                </select>
              ) : null}

              {source.mode === 'initiator' ? (
                <span className="flex-1 text-xs text-muted">
                  No configuration needed.
                </span>
              ) : null}

              {source.mode === 'users' ? (
                <span className="flex-1 text-xs text-muted">
                  Fixed people. Prefer a role so cover survives someone leaving.
                </span>
              ) : null}

              <RemoveButton
                onClick={() => onChange(stage.assignees.filter((_, i) => i !== index))}
              />
            </li>
          ))}
        </ul>
      )}
    </Part>
  )
}

/**
 * When this stage runs at all (spec §36).
 *
 * Conditions are tested against what earlier stages recorded, so only fields
 * collected before this point are worth offering.
 */
function ConditionsEditor({
  stage,
  stages,
  isInitial,
  onChange,
}: {
  stage: StageDefinition
  stages: StageDefinition[]
  isInitial: boolean
  onChange: (next: StageCondition[] | undefined) => void
}) {
  const conditions = stage.conditions ?? []
  const position = stages.findIndex((candidate) => candidate.key === stage.key)
  const earlierFields = stages
    .slice(0, position < 0 ? stages.length : position)
    .flatMap((earlier) =>
      earlier.fields.map((field) => ({
        key: field.key,
        label: `${field.label || field.key} — ${earlier.name || earlier.key}`,
      })),
    )

  const update = (index: number, next: StageCondition) =>
    onChange(conditions.map((condition, i) => (i === index ? next : condition)))

  if (isInitial) {
    return (
      <section className="rounded-lg border border-border px-3 py-3">
        <h3 className="text-sm font-semibold">When this stage runs</h3>
        <p className="mt-0.5 text-xs text-subtle">
          The first stage always runs: nothing has been recorded yet to test.
        </p>
      </section>
    )
  }

  return (
    <Part
      title="When this stage runs"
      hint="With no conditions it always runs. With conditions, it is skipped unless all of them hold."
      addLabel="Add condition"
      onAdd={() =>
        onChange([
          ...conditions,
          { fieldKey: earlierFields[0]?.key ?? '', operator: 'eq', value: '' },
        ])
      }
    >
      {conditions.length === 0 ? (
        <p className="px-3 py-4 text-sm text-muted">Always runs.</p>
      ) : (
        <ul className="divide-y divide-border">
          {conditions.map((condition, index) => (
            <li key={index} className="flex flex-wrap items-center gap-2 px-3 py-2">
              <select
                className={`${input} max-w-60`}
                value={condition.fieldKey}
                onChange={(event) =>
                  update(index, { ...condition, fieldKey: event.target.value })
                }
              >
                <option value="">Choose a field…</option>
                {earlierFields.map((field) => (
                  <option key={field.key} value={field.key}>
                    {field.label}
                  </option>
                ))}
              </select>

              <select
                className={`${input} max-w-44`}
                value={condition.operator}
                onChange={(event) =>
                  update(index, {
                    ...condition,
                    operator: event.target.value as StageCondition['operator'],
                  })
                }
              >
                <option value="eq">is</option>
                <option value="neq">is not</option>
                <option value="gt">is more than</option>
                <option value="gte">is at least</option>
                <option value="lt">is less than</option>
                <option value="lte">is at most</option>
                <option value="in">is one of</option>
                <option value="not_in">is none of</option>
              </select>

              <input
                className={`${input} max-w-52`}
                placeholder={
                  condition.operator === 'in' || condition.operator === 'not_in'
                    ? 'Yes, Maybe'
                    : 'Yes'
                }
                value={
                  Array.isArray(condition.value)
                    ? condition.value.join(', ')
                    : String(condition.value ?? '')
                }
                onChange={(event) => {
                  const raw = event.target.value
                  const many = condition.operator === 'in' || condition.operator === 'not_in'
                  update(index, {
                    ...condition,
                    value: many
                      ? raw.split(',').map((part) => part.trim()).filter(Boolean)
                      : raw,
                  })
                }}
              />

              <RemoveButton
                onClick={() => {
                  const next = conditions.filter((_, i) => i !== index)
                  onChange(next.length > 0 ? next : undefined)
                }}
              />
            </li>
          ))}
        </ul>
      )}

      {earlierFields.length === 0 ? (
        <p className="px-3 pb-3 text-xs text-subtle">
          No earlier stage collects any information yet, so there is nothing to test
          against.
        </p>
      ) : null}
    </Part>
  )
}

function FieldsEditor({
  stage,
  onChange,
}: {
  stage: StageDefinition
  onChange: (next: FieldDefinition[]) => void
}) {
  const update = (index: number, next: FieldDefinition) =>
    onChange(stage.fields.map((field, i) => (i === index ? next : field)))

  return (
    <Part
      title="Information to collect"
      hint="What the person filling this stage has to record."
      addLabel="Add field"
      onAdd={() =>
        onChange([
          ...stage.fields,
          { key: `field_${stage.fields.length + 1}`, label: '', type: 'text', required: false },
        ])
      }
    >
      {stage.fields.length === 0 ? (
        <p className="px-3 py-4 text-sm text-muted">No information collected here.</p>
      ) : (
        <ul className="divide-y divide-border">
          {stage.fields.map((field, index) => (
            <li key={index} className="space-y-2 px-3 py-2">
              <div className="flex items-center gap-2">
                <input
                  className={input}
                  placeholder="Label"
                  value={field.label}
                  onChange={(event) =>
                    update(index, {
                      ...field,
                      label: event.target.value,
                      key: deriveKey(event.target.value, `field_${index + 1}`, field.key),
                    })
                  }
                />
                <input
                  className={`${input} max-w-44 font-mono`}
                  placeholder="key"
                  value={field.key}
                  onChange={(event) => update(index, { ...field, key: event.target.value })}
                />
                <select
                  className={`${input} max-w-36`}
                  value={field.type}
                  onChange={(event) =>
                    update(index, { ...field, type: event.target.value as FieldType })
                  }
                >
                  {FIELD_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
                <label className="flex shrink-0 items-center gap-1.5 text-xs">
                  <input
                    type="checkbox"
                    checked={field.required}
                    onChange={(event) => update(index, { ...field, required: event.target.checked })}
                    className="size-3.5 accent-[var(--accent)]"
                  />
                  Required
                </label>
                <RemoveButton
                  onClick={() => onChange(stage.fields.filter((_, i) => i !== index))}
                />
              </div>

              {field.type === 'select' ? (
                <input
                  className={input}
                  placeholder="Choices, separated by commas"
                  value={(field.options ?? []).join(', ')}
                  onChange={(event) =>
                    update(index, {
                      ...field,
                      options: event.target.value
                        .split(',')
                        .map((option) => option.trim())
                        .filter(Boolean),
                    })
                  }
                />
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </Part>
  )
}

function FilesEditor({
  stage,
  onChange,
}: {
  stage: StageDefinition
  onChange: (next: RequiredFileDefinition[]) => void
}) {
  const update = (index: number, next: RequiredFileDefinition) =>
    onChange(stage.files.map((file, i) => (i === index ? next : file)))

  return (
    <Part
      title="Files"
      hint="A required file blocks completion until it is uploaded."
      addLabel="Add file"
      onAdd={() =>
        onChange([
          ...stage.files,
          { key: `file_${stage.files.length + 1}`, label: '', required: false },
        ])
      }
    >
      {stage.files.length === 0 ? (
        <p className="px-3 py-4 text-sm text-muted">No files expected here.</p>
      ) : (
        <ul className="divide-y divide-border">
          {stage.files.map((file, index) => (
            <li key={index} className="flex items-center gap-2 px-3 py-2">
              <input
                className={input}
                placeholder="Label"
                value={file.label}
                onChange={(event) =>
                  update(index, {
                    ...file,
                    label: event.target.value,
                    key: deriveKey(event.target.value, `file_${index + 1}`, file.key),
                  })
                }
              />
              <input
                className={`${input} max-w-40 font-mono`}
                placeholder="key"
                value={file.key}
                onChange={(event) => update(index, { ...file, key: event.target.value })}
              />
              <input
                className={`${input} max-w-44`}
                placeholder="pdf, docx"
                value={(file.acceptedExtensions ?? []).join(', ')}
                onChange={(event) =>
                  update(index, {
                    ...file,
                    acceptedExtensions: event.target.value
                      .split(',')
                      .map((extension) => extension.trim().toLowerCase())
                      .filter(Boolean),
                  })
                }
              />
              <label className="flex shrink-0 items-center gap-1.5 text-xs">
                <input
                  type="checkbox"
                  checked={file.required}
                  onChange={(event) => update(index, { ...file, required: event.target.checked })}
                  className="size-3.5 accent-[var(--accent)]"
                />
                Required
              </label>
              <RemoveButton onClick={() => onChange(stage.files.filter((_, i) => i !== index))} />
            </li>
          ))}
        </ul>
      )}
    </Part>
  )
}

function ChecklistEditor({
  stage,
  onChange,
}: {
  stage: StageDefinition
  onChange: (next: ChecklistItemDefinition[]) => void
}) {
  const update = (index: number, next: ChecklistItemDefinition) =>
    onChange(stage.checklist.map((item, i) => (i === index ? next : item)))

  return (
    <Part
      title="Checklist"
      hint="Required items must all be ticked before the stage can be completed."
      addLabel="Add item"
      onAdd={() =>
        onChange([
          ...stage.checklist,
          { key: `check_${stage.checklist.length + 1}`, label: '', required: true },
        ])
      }
    >
      {stage.checklist.length === 0 ? (
        <p className="px-3 py-4 text-sm text-muted">No checklist on this stage.</p>
      ) : (
        <ul className="divide-y divide-border">
          {stage.checklist.map((item, index) => (
            <li key={index} className="flex items-center gap-2 px-3 py-2">
              <input
                className={input}
                placeholder="What to check"
                value={item.label}
                onChange={(event) =>
                  update(index, {
                    ...item,
                    label: event.target.value,
                    key: deriveKey(event.target.value, `check_${index + 1}`, item.key),
                  })
                }
              />
              <input
                className={`${input} max-w-40`}
                placeholder="Group"
                value={item.group ?? ''}
                onChange={(event) =>
                  update(index, { ...item, group: event.target.value || undefined })
                }
              />
              <input
                className={`${input} max-w-40 font-mono`}
                placeholder="key"
                value={item.key}
                onChange={(event) => update(index, { ...item, key: event.target.value })}
              />
              <label className="flex shrink-0 items-center gap-1.5 text-xs">
                <input
                  type="checkbox"
                  checked={item.required}
                  onChange={(event) => update(index, { ...item, required: event.target.checked })}
                  className="size-3.5 accent-[var(--accent)]"
                />
                Required
              </label>
              <RemoveButton
                onClick={() => onChange(stage.checklist.filter((_, i) => i !== index))}
              />
            </li>
          ))}
        </ul>
      )}
    </Part>
  )
}
