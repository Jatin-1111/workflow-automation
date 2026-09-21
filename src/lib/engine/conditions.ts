/**
 * Conditional stages (spec §36).
 *
 * A stage carrying conditions only runs when all of them hold against what the
 * workflow has recorded so far. When they do not, the stage is skipped and the
 * work carries on to whatever follows it — "if NDA required = no, skip the NDA
 * stage" is expressed by putting the condition on the NDA stage itself.
 *
 * Pure, and deliberately conservative: a condition that cannot be evaluated
 * fails rather than guessing, because silently running a stage that should
 * have been skipped is worse than a workflow that visibly stops.
 */

import type { FieldValue } from '@/lib/types/instance'
import type { StageCondition, StageDefinition, WorkflowTemplate } from '@/lib/types/workflow'

/** Values that can be ordered. Anything else compares as incomparable. */
function asNumber(value: FieldValue | undefined): number | null {
  if (typeof value === 'number') return value
  if (value instanceof Date) return value.getTime()
  if (typeof value === 'string' && value.trim() !== '') {
    // Dates and currency-style strings both arrive as text from a form.
    const numeric = Number(value)
    if (!Number.isNaN(numeric)) return numeric
    const parsed = Date.parse(value)
    if (!Number.isNaN(parsed)) return parsed
  }
  return null
}

/** Loose equality across the shapes a field value can take. */
function looselyEqual(value: FieldValue | undefined, expected: StageCondition['value']): boolean {
  if (value === undefined || value === null) return expected === null
  if (typeof expected === 'boolean' || typeof value === 'boolean') {
    return toBoolean(value) === toBoolean(expected as FieldValue)
  }
  if (value instanceof Date) return value.getTime() === asNumber(expected as FieldValue)
  return String(value).trim().toLowerCase() === String(expected).trim().toLowerCase()
}

/** "Yes", "true" and true all mean the same thing on a form. */
function toBoolean(value: FieldValue): boolean {
  if (typeof value === 'boolean') return value
  const text = String(value).trim().toLowerCase()
  return text === 'true' || text === 'yes' || text === '1'
}

export function evaluateCondition(
  condition: StageCondition,
  fieldValues: Record<string, FieldValue>,
): boolean {
  const value = fieldValues[condition.fieldKey]

  switch (condition.operator) {
    case 'eq':
      return looselyEqual(value, condition.value)
    case 'neq':
      return !looselyEqual(value, condition.value)

    case 'in':
    case 'not_in': {
      const options = Array.isArray(condition.value) ? condition.value : [condition.value]
      const matched = options.some((option) => looselyEqual(value, option))
      return condition.operator === 'in' ? matched : !matched
    }

    case 'gt':
    case 'gte':
    case 'lt':
    case 'lte': {
      const left = asNumber(value)
      const right = asNumber(condition.value as FieldValue)
      // Nothing recorded, or nothing comparable: the condition does not hold.
      if (left === null || right === null) return false
      if (condition.operator === 'gt') return left > right
      if (condition.operator === 'gte') return left >= right
      if (condition.operator === 'lt') return left < right
      return left <= right
    }
  }
}

/** True when a stage should run against the values recorded so far. */
export function stageApplies(
  stage: StageDefinition,
  fieldValues: Record<string, FieldValue>,
): boolean {
  if (!stage.conditions || stage.conditions.length === 0) return true
  return stage.conditions.every((condition) => evaluateCondition(condition, fieldValues))
}

export interface StageResolution {
  /** The stage to activate, or null when the workflow has nothing left to run. */
  stage: StageDefinition | null
  /** Stages passed over on the way, in the order they were skipped. */
  skipped: StageDefinition[]
}

/**
 * Walk forward from a stage until one applies.
 *
 * A skipped stage hands on to whatever it would have handed on to, so removing
 * a step from a run never strands the work. Following the chain is guarded
 * against a template that loops back on itself.
 */
export function resolveActivation(
  template: WorkflowTemplate,
  startKey: string | null | undefined,
  fieldValues: Record<string, FieldValue>,
): StageResolution {
  const byKey = new Map(template.stages.map((stage) => [stage.key, stage]))
  const skipped: StageDefinition[] = []
  const visited = new Set<string>()

  let key = startKey ?? null
  while (key) {
    if (visited.has(key)) break
    visited.add(key)

    const stage = byKey.get(key)
    if (!stage) break

    if (stageApplies(stage, fieldValues)) {
      return { stage, skipped }
    }

    skipped.push(stage)
    key = stage.nextStageKey
  }

  return { stage: null, skipped }
}
