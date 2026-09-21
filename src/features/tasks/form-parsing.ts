/**
 * Reading a task form.
 *
 * Kept out of the action file so it can be tested directly: a `'use server'`
 * module may only export async functions, which would otherwise put every one
 * of these behind a request. Parsing is where untrusted input first becomes
 * data, so it is worth testing on its own.
 */

import { isEntityId } from '@/lib/ids/format'
import type { StageSubmission } from '@/lib/engine'
import type { FileId, TaskId, UserId } from '@/lib/types/ids'
import type { FieldValue } from '@/lib/types/instance'

/** Prefixes that keep a stage's own inputs apart from the form's controls. */
export const FIELD_PREFIX = 'field:'
export const CHECK_PREFIX = 'check:'

/** Narrow an id that arrived from a form before it reaches the database. */
export function readTaskId(formData: FormData): TaskId | null {
  const raw = String(formData.get('taskId') ?? '')
  return isEntityId(raw, 'task') ? raw : null
}

export function readFileId(formData: FormData, name = 'finalFileId'): FileId | undefined {
  const raw = String(formData.get(name) ?? '')
  return isEntityId(raw, 'file') ? raw : undefined
}

/**
 * Pull the stage's declared inputs out of the form.
 *
 * The action stays ignorant of what any particular workflow collects: fields
 * and checklist items announce themselves by prefix rather than by a list the
 * action would have to be told about.
 */
export function readSubmission(formData: FormData): StageSubmission {
  const fieldValues: Record<string, FieldValue> = {}
  const checkedItemKeys: string[] = []

  for (const [name, value] of formData.entries()) {
    if (typeof value !== 'string') continue
    if (name.startsWith(FIELD_PREFIX)) {
      fieldValues[name.slice(FIELD_PREFIX.length)] = value
    }
    if (name.startsWith(CHECK_PREFIX)) {
      checkedItemKeys.push(name.slice(CHECK_PREFIX.length))
    }
  }

  const comment = String(formData.get('comment') ?? '').trim()
  return { fieldValues, checkedItemKeys, comment: comment || undefined }
}

/** People chosen on a reassignment, narrowed to ids that look like users. */
export function readAssignees(formData: FormData, name = 'assignees'): UserId[] {
  return [
    ...new Set(
      formData
        .getAll(name)
        .filter((value): value is string => typeof value === 'string')
        .filter((value): value is UserId => isEntityId(value, 'user')),
    ),
  ]
}

/** A free-text reason, or nothing when it was left blank. */
export function readReason(formData: FormData, name = 'reason'): string | undefined {
  const value = String(formData.get(name) ?? '').trim()
  return value || undefined
}
