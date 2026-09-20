/**
 * Completion gates.
 *
 * Mandatory fields, files and checklist items are enforced here, so a stage
 * cannot be completed early regardless of what the UI allows (spec §14, §27).
 */

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

/** Field values supplied for fields this stage does not declare are ignored. */
export function pickDeclaredFields(
  stage: StageDefinition,
  submitted: StageSubmission['fieldValues'],
): Record<string, FieldValue> {
  if (!submitted) return {}
  const declared = new Set(stage.fields.map((field) => field.key))
  return Object.fromEntries(
    Object.entries(submitted).filter(([key]) => declared.has(key)),
  )
}
