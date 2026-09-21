/**
 * The Business Orbit workflow engine.
 *
 * A pure state machine over a pinned workflow template. It knows nothing about
 * proposals, podcasts or any other specific process - everything particular to
 * a process lives in its template document (spec §34, §52).
 *
 * A stage carrying conditions runs only when they hold against what the
 * workflow has recorded; otherwise it is skipped and the work carries on
 * (spec §36).
 */

export {
  approve,
  completeStage,
  recordFileUpload,
  reassignTask,
  requestChanges,
  saveProgress,
  startInstance,
} from './operations'

export { resolveAssignees } from './assignees'
export { findStage, nextStageOf } from './stages'
export { validateCompletion } from './validation'
export { nextRevisionRound } from './activate'
export { evaluateCondition, resolveActivation, stageApplies } from './conditions'

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
