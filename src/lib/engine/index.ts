/**
 * The Business Orbit workflow engine.
 *
 * A pure state machine over a pinned workflow template. It knows nothing about
 * proposals, podcasts or any other specific process - everything particular to
 * a process lives in its template document (spec §34, §52).
 *
 * Conditional stages (spec §36) are carried in the schema but not yet
 * evaluated: a stage with `conditions` runs as though it had none.
 */

export {
  approve,
  completeStage,
  recordFileUpload,
  requestChanges,
  saveProgress,
  startInstance,
} from './operations'

export { resolveAssignees } from './assignees'
export { findStage, nextStageOf } from './stages'
export { validateCompletion } from './validation'
export { nextRevisionRound } from './activate'

export type {
  EngineError,
  EngineErrorCode,
  EngineOutcome,
} from './errors'

export type {
  EngineContext,
  EngineResult,
  InstanceDraft,
  NotificationDraft,
  StageSubmission,
  StartInstanceRequest,
  StartResult,
  TaskDraft,
  TaskOperationRequest,
  TaskUpdate,
  TimelineEventDraft,
} from './types'
