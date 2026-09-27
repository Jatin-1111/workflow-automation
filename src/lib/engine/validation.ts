/**
 * Completion gates.
 *
 * Mandatory fields, files and checklist items are enforced here, so a stage
 * cannot be completed early regardless of what the UI allows (spec §14, §27).
 */

import { coerceFieldValue } from '@/lib/validation/field-value'
import type { FieldValue } from '@/lib/types/instance'
import type { StageDefinition } from '@/lib/types/workflow'
import type { EngineError } from './errors'
import type { StageSubmission } from './types'

function isBlank(value: FieldValue | undefined): boolean {
  if (value === undefined || value === null) return true
  if (typeof value === 'string') return value.trim() === ''
  return false
}

/**
 * Everything blocking completion of this stage, as a list rather than the
 * first failure, so a form can show every outstanding requirement at once.
 */
export function validateCompletion(
  stage: StageDefinition,
  merged: {
    fieldValues: Record<string, FieldValue>
    checkedItemKeys: string[]
    uploadedSlotKeys: string[]
  },
): EngineError[] {
  const errors: EngineError[] = []

  for (const field of stage.fields) {
    if (field.required && isBlank(merged.fieldValues[field.key])) {
      errors.push({
        code: 'missing_required_field',
        message: `${field.label} is required.`,
        key: field.key,
      })
    }
  }

  for (const file of stage.files) {
    if (file.required && !merged.uploadedSlotKeys.includes(file.key)) {
      errors.push({
        code: 'missing_required_file',
        message: `${file.label} must be uploaded.`,
        key: file.key,
      })
    }
  }

  for (const item of stage.checklist) {
    if (item.required && !merged.checkedItemKeys.includes(item.key)) {
      errors.push({
        code: 'incomplete_checklist',
        message: `Checklist item "${item.label}" is not complete.`,
        key: item.key,
      })
    }
  }

  return errors
}

export interface DeclaredFields {
  /** The values to store, as the type each field declares. */
  values: Record<string, FieldValue>
  /** Answers that are not the type their field asked for. */
  errors: EngineError[]
}

/**
 * Narrow a submission to the fields this stage declares, and to their types.
 *
 * Two jobs that belong together because both need the stage definition.
 * Values for fields the stage does not declare are dropped, as they always
 * were; values for fields it does declare are now read as the type the
 * field announces, so a number field stores a number and a select stores
 * one of its own options.
 *
 * Here rather than in the action because the engine is where a rule has to
 * live to be true for every caller. A form post, a script and a future API
 * client all arrive through this function, and the UI preventing bad input
 * is a convenience rather than the enforcement.
 *
 * Nothing already recorded is re-examined. A value stored before this
 * existed stays exactly as it was: this reads what is arriving, not what
 * has arrived, so history is never retrospectively invalid.
 */
export function coerceDeclaredFields(
  stage: StageDefinition,
  submitted: StageSubmission['fieldValues'],
): DeclaredFields {
  const values: Record<string, FieldValue> = {}
  const errors: EngineError[] = []
  if (!submitted) return { values, errors }

  for (const field of stage.fields) {
    if (!(field.key in submitted)) continue

    const result = coerceFieldValue(field, submitted[field.key])
    if (result.ok) {
      values[field.key] = result.value
    } else {
      errors.push({
        code: 'invalid_field_value',
        message: result.message,
        key: field.key,
      })
    }
  }

  return { values, errors }
}
