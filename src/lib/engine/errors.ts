/**
 * Refusals the engine can return.
 *
 * The engine refuses invalid transitions rather than relying on the UI to
 * prevent them, so the same rules hold for a form post, a script or a future
 * API client.
 */

export const ENGINE_ERROR_CODES = [
  'task_not_found',
  'stage_not_found',
  'task_already_completed',
  'not_assigned',
  'instance_not_active',
  'missing_required_field',
  'missing_required_file',
  'incomplete_checklist',
  'comment_required',
  'not_an_approval_stage',
  'reject_target_missing',
  'no_assignee_resolved',
  'no_new_assignees',
  'unchanged_assignment',
] as const
export type EngineErrorCode = (typeof ENGINE_ERROR_CODES)[number]

export interface EngineError {
  code: EngineErrorCode
  message: string
  /** Field, checklist item or file slot the refusal points at, when relevant. */
  key?: string
}

export type EngineOutcome<T> =
  | { ok: true; result: T }
  | { ok: false; errors: EngineError[] }

export function refuse<T>(...errors: EngineError[]): EngineOutcome<T> {
  return { ok: false, errors }
}

export function accept<T>(result: T): EngineOutcome<T> {
  return { ok: true, result }
}
