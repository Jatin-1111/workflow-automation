/**
 * Whether a workflow template is coherent enough to run.
 *
 * Pure, so the Workflow Builder can show every problem while someone is still
 * editing, and the seed can refuse to load a broken file. The engine trusts
 * templates it is given, which is only safe because nothing reaches it without
 * passing through here first.
 */

import type { StageDefinition } from '@/lib/types/workflow'

export interface TemplateProblem {
  /** Stage the problem belongs to, or undefined for a whole-template problem. */
  stageKey?: string
  field?: string
  message: string
}

export interface TemplateDraft {
  name: string
  stages: StageDefinition[]
  initialStageKey: string
}

const STAGE_KEY_PATTERN = /^[a-z][a-z0-9_]*$/

/** Everything wrong with a template, rather than the first thing wrong. */
export function validateTemplate(draft: TemplateDraft): TemplateProblem[] {
  const problems: TemplateProblem[] = []
  const { stages } = draft

  if (!draft.name.trim()) {
    problems.push({ field: 'name', message: 'Give the workflow a name.' })
  }

  if (stages.length === 0) {
    problems.push({ message: 'A workflow needs at least one stage.' })
    return problems
  }

  const keys = stages.map((stage) => stage.key)
  const seen = new Set<string>()
  for (const key of keys) {
    if (seen.has(key)) {
      problems.push({ stageKey: key, message: `Two stages share the key "${key}".` })
    }
    seen.add(key)
  }

  if (!seen.has(draft.initialStageKey)) {
    problems.push({
      field: 'initialStageKey',
      message: 'The first stage is not one of the stages in this workflow.',
    })
  }

  // Conditions test what the workflow has recorded, and at the first stage it
  // has recorded nothing - so a conditional first stage could only ever skip,
  // finishing the workflow the moment it started.
  const first = stages.find((candidate) => candidate.key === draft.initialStageKey)
  if (first?.conditions && first.conditions.length > 0) {
    problems.push({
      stageKey: first.key,
      field: 'conditions',
      message:
        'The first stage cannot be conditional: nothing has been recorded yet to test.',
    })
  }

  for (const stage of stages) {
    if (!STAGE_KEY_PATTERN.test(stage.key)) {
      problems.push({
        stageKey: stage.key,
        field: 'key',
        message: `"${stage.key}" must be lower case letters, numbers and underscores, starting with a letter.`,
      })
    }
    if (!stage.name.trim()) {
      problems.push({ stageKey: stage.key, field: 'name', message: 'Give the stage a name.' })
    }

    if (stage.assignees.length === 0) {
      problems.push({
        stageKey: stage.key,
        field: 'assignees',
        message: `"${stage.name || stage.key}" has nobody to assign it to.`,
      })
    }

    for (const source of stage.assignees) {
      if (source.mode === 'role' && !source.roleId) {
        problems.push({
          stageKey: stage.key,
          field: 'assignees',
          message: `"${stage.name || stage.key}" is assigned to a role that has not been chosen.`,
        })
      }
      if (source.mode === 'users' && source.userIds.length === 0) {
        problems.push({
          stageKey: stage.key,
          field: 'assignees',
          message: `"${stage.name || stage.key}" names specific people but none are selected.`,
        })
      }
      if (source.mode === 'stage_assignee' && !seen.has(source.stageKey)) {
        problems.push({
          stageKey: stage.key,
          field: 'assignees',
          message: `"${stage.name || stage.key}" takes its assignee from "${source.stageKey}", which does not exist.`,
        })
      }
    }

    if (stage.nextStageKey && !seen.has(stage.nextStageKey)) {
      problems.push({
        stageKey: stage.key,
        field: 'nextStageKey',
        message: `"${stage.name || stage.key}" continues to "${stage.nextStageKey}", which does not exist.`,
      })
    }
    if (stage.nextStageKey === stage.key) {
      problems.push({
        stageKey: stage.key,
        field: 'nextStageKey',
        message: `"${stage.name || stage.key}" continues to itself, which would never finish.`,
      })
    }

    // An approval with nowhere to send rejected work would strand it.
    if (stage.requiresApproval) {
      if (!stage.rejectTargetStageKey) {
        problems.push({
          stageKey: stage.key,
          field: 'rejectTargetStageKey',
          message: `"${stage.name || stage.key}" is an approval but does not say where rejected work goes.`,
        })
      } else if (!seen.has(stage.rejectTargetStageKey)) {
        problems.push({
          stageKey: stage.key,
          field: 'rejectTargetStageKey',
          message: `"${stage.name || stage.key}" sends rejected work to "${stage.rejectTargetStageKey}", which does not exist.`,
        })
      }
    }

    problems.push(...duplicateKeyProblems(stage, 'fields'))
    problems.push(...duplicateKeyProblems(stage, 'files'))
    problems.push(...duplicateKeyProblems(stage, 'checklist'))
    problems.push(...fieldProblems(stage))
  }

  problems.push(...unreachableStageProblems(draft))
  problems.push(...conditionProblems(draft))

  return problems
}

function duplicateKeyProblems(
  stage: StageDefinition,
  part: 'fields' | 'files' | 'checklist',
): TemplateProblem[] {
  const seen = new Set<string>()
  const problems: TemplateProblem[] = []

  for (const item of stage[part]) {
    if (!item.key.trim()) {
      problems.push({
        stageKey: stage.key,
        field: part,
        message: `A ${singular(part)} on "${stage.name || stage.key}" has no key.`,
      })
      continue
    }
    if (seen.has(item.key)) {
      problems.push({
        stageKey: stage.key,
        field: part,
        message: `"${stage.name || stage.key}" has two ${part} keyed "${item.key}".`,
      })
    }
    seen.add(item.key)
  }
  return problems
}

/**
 * A key used as the name of a form input, so it has to behave like one.
 *
 * Shared with stage keys deliberately: both end up in places where a space
 * or a colon would change what the name means.
 */
const ITEM_KEY_PATTERN = STAGE_KEY_PATTERN

/**
 * Whether a stage's inputs can actually be filled in.
 *
 * Every one of these describes a field somebody would be handed and be
 * unable to answer — which is only worth catching before it is published,
 * because afterwards the person holding the stage is stuck.
 */
function fieldProblems(stage: StageDefinition): TemplateProblem[] {
  const problems: TemplateProblem[] = []
  const where = stage.name || stage.key

  for (const field of stage.fields) {
    if (field.key.trim() && !ITEM_KEY_PATTERN.test(field.key)) {
      problems.push({
        stageKey: stage.key,
        field: 'fields',
        message: `Field key "${field.key}" on "${where}" must be lower case letters, numbers and underscores, starting with a letter.`,
      })
    }
    if (!field.label.trim()) {
      problems.push({
        stageKey: stage.key,
        field: 'fields',
        message: `A field on "${where}" has no label, so nobody would know what to enter.`,
      })
    }
    // A select is its own vocabulary. With nothing in it there is no
    // answer that would be accepted, so the stage cannot be completed.
    if (field.type === 'select' && (field.options ?? []).length === 0) {
      problems.push({
        stageKey: stage.key,
        field: 'fields',
        message: `"${field.label || field.key}" on "${where}" is a list with nothing to choose from.`,
      })
    }
    if (field.type === 'select') {
      const seen = new Set<string>()
      for (const option of field.options ?? []) {
        if (seen.has(option)) {
          problems.push({
            stageKey: stage.key,
            field: 'fields',
            message: `"${field.label || field.key}" on "${where}" lists "${option}" twice.`,
          })
        }
        seen.add(option)
      }
    }
  }

  for (const part of ['files', 'checklist'] as const) {
    for (const item of stage[part]) {
      if (item.key.trim() && !ITEM_KEY_PATTERN.test(item.key)) {
        problems.push({
          stageKey: stage.key,
          field: part,
          message: `${singular(part)} key "${item.key}" on "${where}" must be lower case letters, numbers and underscores, starting with a letter.`,
        })
      }
    }
  }

  return problems
}

/**
 * Conditions that test something the workflow never records.
 *
 * A condition on a field no stage collects can never hold, and the engine
 * fails closed, so the stage carrying it is skipped every single time. The
 * workflow would run, and quietly miss a step forever — the kind of fault
 * that is invisible until somebody asks why an approval never happened.
 */
function conditionProblems(draft: TemplateDraft): TemplateProblem[] {
  const collected = new Set(
    draft.stages.flatMap((stage) => stage.fields.map((field) => field.key)),
  )

  return draft.stages.flatMap((stage) =>
    (stage.conditions ?? [])
      .filter((condition) => !collected.has(condition.fieldKey))
      .map((condition) => ({
        stageKey: stage.key,
        field: 'conditions',
        message: `"${stage.name || stage.key}" is skipped unless "${condition.fieldKey}" says so, but no stage collects that. It would never run.`,
      })),
  )
}

function singular(part: 'fields' | 'files' | 'checklist'): string {
  if (part === 'fields') return 'field'
  if (part === 'files') return 'file'
  return 'checklist item'
}

/**
 * Stages nothing leads to.
 *
 * Reachability is followed from the first stage through `nextStageKey` and
 * every rejection target, so a stage only used for revisions still counts.
 */
function unreachableStageProblems(draft: TemplateDraft): TemplateProblem[] {
  const byKey = new Map(draft.stages.map((stage) => [stage.key, stage]))
  const reached = new Set<string>()
  const queue = [draft.initialStageKey]

  while (queue.length > 0) {
    const key = queue.shift()!
    if (reached.has(key)) continue
    reached.add(key)

    const stage = byKey.get(key)
    if (!stage) continue
    for (const next of [stage.nextStageKey, stage.rejectTargetStageKey]) {
      if (next && byKey.has(next)) queue.push(next)
    }
  }

  return draft.stages
    .filter((stage) => !reached.has(stage.key))
    .map((stage) => ({
      stageKey: stage.key,
      message: `Nothing leads to "${stage.name || stage.key}", so it would never run.`,
    }))
}

/** True when a template has no problems at all. */
export function isPublishable(draft: TemplateDraft): boolean {
  return validateTemplate(draft).length === 0
}
