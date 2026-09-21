'use client'

/**
 * THE WORKFLOW BUILDER (spec §34, §35).
 *
 * Holds the whole template in state and posts it as one document, so a stage
 * can be renamed, reordered or rerouted without a round trip per keystroke.
 * Problems are computed with the same validator the server publishes against,
 * so what the editor shows and what publishing allows never disagree.
 */

import { useActionState, useMemo, useState } from 'react'
import Link from 'next/link'
import { StageForm } from './stage-form'
import {
  publishWorkflowAction,
  saveWorkflowAction,
  type BuilderState,
} from './actions'
import { Hint } from '@/features/ui/primitives'
import { validateTemplate } from '@/lib/workflow/template-validation'
import type { StageDefinition } from '@/lib/types/workflow'

const IDLE: BuilderState = { ok: null }

/** Selection sentinel meaning "the last stage, whatever it turns out to be". */
const LAST = Symbol('last stage')

export interface RoleOption {
  roleId: string
  name: string
  holders: string[]
}

export interface ProjectOption {
  projectId: string
  name: string
}

/**
 * The template as the editor needs it.
 *
 * Rebuilt field by field rather than passing the stored document, so Mongo's
 * `_id` never crosses into a client component.
 */
export interface EditableTemplate {
  workflowId: string
  version: number
  name: string
  description?: string
  projectId?: string
  stages: StageDefinition[]
  initialStageKey: string
  status: string
}

interface Props {
  template: EditableTemplate
  roles: RoleOption[]
  projects: ProjectOption[]
  /** Versions cannot be edited once work is pinned to them (spec §38). */
  editable: boolean
}

/** Turn a stage name into a usable machine key. */
function toKey(name: string, taken: string[]): string {
  const base =
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .replace(/^([0-9])/, 'stage_$1') || 'stage'

  let candidate = base
  let suffix = 2
  while (taken.includes(candidate)) {
    candidate = `${base}_${suffix}`
    suffix += 1
  }
  return candidate
}

export function WorkflowEditor({ template, roles, projects, editable }: Props) {
  const [name, setName] = useState(template.name)
  const [description, setDescription] = useState(template.description ?? '')
  const [projectId, setProjectId] = useState(template.projectId ?? '')
  const [stages, setStages] = useState<StageDefinition[]>(template.stages)
  const [initialStageKey, setInitialStageKey] = useState(template.initialStageKey)

  /**
   * Which stage is open, tracked by key rather than position.
   *
   * Positions shift when stages are reordered or removed, and a click handler
   * that captured one would act on whatever moved into its place. The sentinel
   * means "whichever is last", so adding a stage selects the new one without
   * needing to know the length while the update is still in flight.
   */
  const [selectedKey, setSelectedKey] = useState<string | typeof LAST>(
    template.stages[0]?.key ?? LAST,
  )
  const selected =
    selectedKey === LAST
      ? Math.max(0, stages.length - 1)
      : Math.max(0, stages.findIndex((candidate) => candidate.key === selectedKey))
  const setSelected = (index: number) => setSelectedKey(stages[index]?.key ?? LAST)

  const [saveState, save, saving] = useActionState(saveWorkflowAction, IDLE)
  const [publishState, publish, publishing] = useActionState(publishWorkflowAction, IDLE)

  const problems = useMemo(
    () => validateTemplate({ name, stages, initialStageKey }),
    [name, stages, initialStageKey],
  )

  const serialised = JSON.stringify({
    name,
    description,
    projectId,
    stages,
    initialStageKey,
  })

  const stage = stages[selected]
  const problemsFor = (key: string) => problems.filter((problem) => problem.stageKey === key)

  const replaceStage = (index: number, next: StageDefinition) => {
    const previousKey = stages[index].key
    setStages((current) => {
      const updated = current.map((candidate, i) => (i === index ? next : candidate))
      // Renaming a key must carry every reference with it, or routing breaks.
      if (next.key === previousKey) return updated
      return updated.map((candidate) => ({
        ...candidate,
        nextStageKey: candidate.nextStageKey === previousKey ? next.key : candidate.nextStageKey,
        rejectTargetStageKey:
          candidate.rejectTargetStageKey === previousKey
            ? next.key
            : candidate.rejectTargetStageKey,
        assignees: candidate.assignees.map((source) =>
          source.mode === 'stage_assignee' && source.stageKey === previousKey
            ? { ...source, stageKey: next.key }
            : source,
        ),
      }))
    })
    if (initialStageKey === previousKey) setInitialStageKey(next.key)
  }

  const addStage = () => {
    // Everything is derived inside the updater: reading `stages` here would
    // use the value from the last render, so several quick clicks would all
    // generate the same stage key.
    setStages((current) => {
      const key = toKey(`Stage ${current.length + 1}`, current.map((s) => s.key))
      const created: StageDefinition = {
        key,
        name: `Stage ${current.length + 1}`,
        instructions: '',
        assignees: [{ mode: 'initiator' }],
        completionRule: 'any',
        fields: [],
        files: [],
        checklist: [],
        priority: 'medium',
        requiresApproval: false,
        nextStageKey: null,
      }
      // Hook the previous last stage onto the new one, which is nearly always
      // what someone adding a stage at the end means.
      const previous = current.at(-1)
      const linked =
        previous && previous.nextStageKey === null
          ? current.map((candidate, i) =>
              i === current.length - 1 ? { ...candidate, nextStageKey: key } : candidate,
            )
          : current

      return [...linked, created]
    })
    setSelectedKey(LAST)
  }

  const duplicateStage = (index: number) => {
    const source = stages[index]
    // The copy keeps everything except its identity and its routing: where a
    // duplicated stage belongs in the flow is a decision, not a default.
    const key = toKey(`${source.name} copy`, stages.map((candidate) => candidate.key))
    const copy: StageDefinition = {
      ...structuredClone(source),
      key,
      name: `${source.name} copy`,
      nextStageKey: null,
    }

    setStages((current) => [
      ...current.slice(0, index + 1),
      copy,
      ...current.slice(index + 1),
    ])
    setSelectedKey(key)
  }

  const moveStage = (index: number, delta: number) => {
    const target = index + delta
    if (target < 0 || target >= stages.length) return
    setStages((current) => {
      const next = [...current]
      ;[next[index], next[target]] = [next[target], next[index]]
      return next
    })
  }

  const removeStage = (index: number) => {
    const removed = stages[index]
    setStages((current) =>
      current
        .filter((_, i) => i !== index)
        // Clear references rather than leaving them pointing at nothing.
        .map((candidate) => ({
          ...candidate,
          nextStageKey: candidate.nextStageKey === removed.key ? null : candidate.nextStageKey,
          rejectTargetStageKey:
            candidate.rejectTargetStageKey === removed.key
              ? undefined
              : candidate.rejectTargetStageKey,
          assignees: candidate.assignees.filter(
            (source) => !(source.mode === 'stage_assignee' && source.stageKey === removed.key),
          ),
        })),
    )
    if (initialStageKey === removed.key) {
      setInitialStageKey(stages.find((_, i) => i !== index)?.key ?? '')
    }
    if (selectedKey === removed.key) setSelectedKey(LAST)
  }

  const status = [publishState, saveState].find((candidate) => candidate.ok !== null)

  return (
    <div className="space-y-6">
      <section className="grid gap-3 rounded-xl border border-border bg-surface p-4 sm:grid-cols-3">
        <label className="flex flex-col gap-1 sm:col-span-1">
          <span className="text-xs font-medium text-muted">
            Workflow name
          </span>
          <input
            className="rounded-md border border-border bg-surface px-2.5 py-1.5 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft"
            value={name}
            onChange={(event) => setName(event.target.value)}
            disabled={!editable}
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-muted">
            Major Project
          </span>
          <select
            className="rounded-md border border-border bg-surface px-2.5 py-1.5 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft"
            value={projectId}
            onChange={(event) => setProjectId(event.target.value)}
            disabled={!editable}
          >
            <option value="">Not tied to a project</option>
            {projects.map((project) => (
              <option key={project.projectId} value={project.projectId}>
                {project.name}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-muted">
            Description
          </span>
          <input
            className="rounded-md border border-border bg-surface px-2.5 py-1.5 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            disabled={!editable}
          />
        </label>
      </section>

      {problems.length > 0 ? (
        <section className="rounded-lg border border-border bg-accent-soft px-4 py-3">
          <p className="text-sm font-medium text-status-overdue">
            {problems.length} thing{problems.length === 1 ? '' : 's'} to fix before this can be
            published
          </p>
          <ul className="mt-1 list-inside list-disc space-y-0.5 text-sm text-muted">
            {problems.slice(0, 8).map((problem, index) => (
              <li key={index}>{problem.message}</li>
            ))}
          </ul>
        </section>
      ) : (
        <p className="rounded-xl border border-border bg-surface px-5 py-3 text-sm text-status-complete">
          This workflow is sound and can be published.
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <section className="rounded-xl border border-border bg-surface">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h2 className="text-sm font-semibold">
              Stages <span className="font-normal text-subtle">{stages.length}</span>
            </h2>
            {editable ? (
              <button
                type="button"
                onClick={addStage}
                className="rounded-md border border-border-strong bg-surface px-2.5 py-1 text-xs font-medium transition hover:bg-accent-soft"
              >
                Add stage
              </button>
            ) : null}
          </div>

          <ol className="divide-y divide-border">
            {stages.map((candidate, index) => {
              const issues = problemsFor(candidate.key).length
              return (
                <li key={`${candidate.key}-${index}`}>
                  <div
                    className={`flex items-center gap-2 px-3 py-2 ${
                      index === selected ? 'bg-accent-soft' : ''
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => setSelected(index)}
                      className="min-w-0 flex-1 text-left"
                    >
                      <span className="flex items-center gap-2 text-sm font-medium">
                        <span className="tabular-nums text-subtle">{index + 1}</span>
                        {candidate.name || candidate.key}
                        {candidate.key === initialStageKey ? (
                          <span className="rounded border border-border px-1 text-[10px] text-muted">
                            start
                          </span>
                        ) : null}
                        {candidate.requiresApproval ? (
                          <span className="rounded border border-border px-1 text-[10px] text-status-action">
                            approval
                          </span>
                        ) : null}
                        {candidate.conditions && candidate.conditions.length > 0 ? (
                          <span
                            title="Only runs when its conditions hold"
                            className="rounded border border-border px-1 text-[10px] text-muted"
                          >
                            conditional
                          </span>
                        ) : null}
                      </span>
                      <span className="block font-mono text-[11px] text-subtle">
                        {candidate.key}
                        {issues > 0 ? (
                          <span className="ml-2 text-status-overdue">
                            {issues} issue{issues === 1 ? '' : 's'}
                          </span>
                        ) : null}
                      </span>
                    </button>

                    {editable ? (
                      <span className="flex shrink-0 items-center gap-1">
                        <IconButton label="Move up" onClick={() => moveStage(index, -1)}>
                          ↑
                        </IconButton>
                        <IconButton label="Move down" onClick={() => moveStage(index, 1)}>
                          ↓
                        </IconButton>
                        <IconButton label="Duplicate" onClick={() => duplicateStage(index)}>
                          ⧉
                        </IconButton>
                        <IconButton
                          label="Delete"
                          onClick={() => removeStage(index)}
                          disabled={stages.length === 1}
                        >
                          ✕
                        </IconButton>
                      </span>
                    ) : null}
                  </div>
                </li>
              )
            })}
          </ol>
        </section>

        <section className="rounded-xl border border-border bg-surface p-4">
          {stage ? (
            editable ? (
              <StageForm
                key={selected}
                stage={stage}
                stages={stages}
                roles={roles}
                isInitial={stage.key === initialStageKey}
                onChange={(next) => replaceStage(selected, next)}
                onMakeInitial={() => setInitialStageKey(stage.key)}
              />
            ) : (
              <ReadOnlyStage stage={stage} />
            )
          ) : (
            <p className="text-sm text-muted">Add a stage to begin.</p>
          )}
        </section>
      </div>

      {editable ? (
        <div className="sticky bottom-0 flex flex-wrap items-center gap-3 border-t border-border bg-background/95 py-3">
          <form action={save}>
            <input type="hidden" name="workflowId" value={template.workflowId} />
            <input type="hidden" name="version" value={template.version} />
            <input type="hidden" name="template" value={serialised} />
            <button
              type="submit"
              disabled={saving || publishing}
              className="rounded-md border border-border-strong bg-surface px-5 py-3 text-sm font-medium transition hover:bg-accent-soft disabled:opacity-60"
            >
              {saving ? 'Saving…' : 'Save draft'}
            </button>
          </form>

          <form action={publish}>
            <input type="hidden" name="workflowId" value={template.workflowId} />
            <input type="hidden" name="version" value={template.version} />
            <button
              type="submit"
              disabled={saving || publishing || problems.length > 0}
              title={
                problems.length > 0 ? 'Fix the problems listed above first' : undefined
              }
              className="rounded-md bg-accent px-5 py-3 text-sm font-medium text-white transition hover:bg-accent-hover disabled:opacity-60"
            >
              {publishing ? 'Publishing…' : `Publish version ${template.version}`}
            </button>
          </form>

          {status && status.ok !== null ? (
            <p
              role="status"
              className={`text-sm ${status.ok ? 'text-status-complete' : 'text-status-overdue'}`}
            >
              {status.message}
            </p>
          ) : (
            <p className="text-sm text-subtle">
              Publishing only affects work started afterwards.
            </p>
          )}
        </div>
      ) : (
        <p className="rounded-xl border border-border bg-surface px-4 py-3 text-sm text-muted">
          This version is published, so it cannot be changed — work already running is
          following it. Create a new version to make changes.{' '}
          <Link href="/workflows" className="text-accent underline-offset-4 hover:underline">
            Back to workflows
          </Link>
        </p>
      )}
    </div>
  )
}

function IconButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string
  onClick: () => void
  disabled?: boolean
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className="rounded border border-border px-1.5 py-0.5 text-xs text-muted transition hover:border-border-strong hover:text-foreground disabled:opacity-40"
    >
      {children}
    </button>
  )
}

function ReadOnlyStage({ stage }: { stage: StageDefinition }) {
  return (
    <dl className="space-y-3 text-sm">
      <Row label="Stage">{stage.name}</Row>
      <Row label="Key">
        <span className="font-mono text-xs">{stage.key}</span>
      </Row>
      {stage.instructions ? <Row label="Instructions">{stage.instructions}</Row> : null}
      <Row label="Completion">
        {stage.completionRule === 'all' ? 'Everyone must finish' : 'Either owner finishes it'}
      </Row>
      <Row label="Priority">{stage.priority}</Row>
      {stage.dueInHours ? <Row label="Due in">{stage.dueInHours} hours</Row> : null}
      {stage.slaHours ? <Row label="SLA">{stage.slaHours} hours</Row> : null}
      <Row label="Approval">
        {stage.requiresApproval
          ? `Yes — rejections go to ${stage.rejectTargetStageKey}`
          : 'No'}
      </Row>
      <Row label="Continues to">{stage.nextStageKey ?? 'Finishes the workflow'}</Row>
      <Row label="Collects">
        {stage.fields.length} field{stage.fields.length === 1 ? '' : 's'},{' '}
        {stage.files.length} file{stage.files.length === 1 ? '' : 's'},{' '}
        {stage.checklist.length} checklist item{stage.checklist.length === 1 ? '' : 's'}
      </Row>
    </dl>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium text-muted">{label}</dt>
      <dd className="mt-0.5">{children}</dd>
    </div>
  )
}
