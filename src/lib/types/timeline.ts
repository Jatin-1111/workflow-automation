/**
 * Append-only audit trail for a workflow instance (spec §33).
 *
 * Every state change writes an event carrying actor, timestamp, action, stage
 * and — where relevant — comment and file version. Events are never updated or
 * deleted.
 */

import type {
  FileId,
  TaskId,
  TimelineEventId,
  UserId,
  WorkflowInstanceId,
} from './ids'

export const TIMELINE_ACTIONS = [
  'instance_created',
  'stage_activated',
  /** Passed over because its conditions did not hold (spec §36). */
  'stage_skipped',
  'stage_completed',
  /** One assignee of a shared stage finished their part (spec §22). */
  'assignee_completed',
  'task_assigned',
  'task_reassigned',
  'progress_saved',
  'file_uploaded',
  'checklist_updated',
  'comment_added',
  'approval_granted',
  'changes_requested',
  /** Paused pending something outside, or stopped by an impediment (spec §42). */
  'task_held',
  'task_resumed',
  'instance_completed',
  'instance_cancelled',
] as const
export type TimelineAction = (typeof TIMELINE_ACTIONS)[number]

export interface TimelineEvent {
  eventId: TimelineEventId
  instanceId: WorkflowInstanceId
  taskId?: TaskId
  stageKey?: string
  /** Who acted. Resolve the display name at read time (spec §4). */
  actorId: UserId
  action: TimelineAction
  /** Mandatory on `changes_requested` (spec §29). */
  comment?: string
  fileId?: FileId
  fileVersion?: number
  at: Date
}
