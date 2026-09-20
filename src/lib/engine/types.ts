/**
 * The engine's input and output shapes.
 *
 * The engine is a pure state machine: it receives the current state and a
 * request, and returns the next state plus the records to persist. It never
 * touches the database, so it cannot allocate permanent ids - it emits drafts
 * and the persistence layer assigns ids on write.
 */

import type { ProjectId, TaskId, UserId } from '@/lib/types/ids'
import type { FieldValue, WorkflowInstance } from '@/lib/types/instance'
import type { Notification } from '@/lib/types/notification'
import type { Task } from '@/lib/types/task'
import type { TimelineEvent } from '@/lib/types/timeline'
import type { WorkflowTemplate } from '@/lib/types/workflow'
import type { RoleId } from '@/lib/types/ids'

export type InstanceDraft = Omit<
  WorkflowInstance,
  'instanceId' | 'createdAt' | 'updatedAt'
>
export type TaskDraft = Omit<Task, 'taskId' | 'createdAt' | 'updatedAt'>
export type TimelineEventDraft = Omit<TimelineEvent, 'eventId' | 'instanceId'>
export type NotificationDraft = Omit<
  Notification,
  'notificationId' | 'instanceId' | 'taskId' | 'createdAt'
> & { taskStageKey?: string }

/** A change to an existing task, addressed by its permanent id. */
export interface TaskUpdate {
  taskId: TaskId
  changes: Partial<Task>
}

/**
 * Everything the engine needs that it cannot derive from workflow state.
 *
 * `usersByRole` is resolved by the caller from the database, which is what
 * keeps role-to-person mapping out of the engine (spec §6).
 */
export interface EngineContext {
  now: Date
  usersByRole: Record<string, UserId[]>
}

/** The outcome of a successful operation: next state plus records to write. */
export interface EngineResult {
  instance: WorkflowInstance
  taskUpdates: TaskUpdate[]
  newTasks: TaskDraft[]
  events: TimelineEventDraft[]
  notifications: NotificationDraft[]
}

/** The outcome of starting an instance, where the instance has no id yet. */
export interface StartResult {
  instance: InstanceDraft
  newTasks: TaskDraft[]
  events: TimelineEventDraft[]
  notifications: NotificationDraft[]
}

/** What a user submits when saving or completing a stage. */
export interface StageSubmission {
  /** Values for the stage's declared fields. */
  fieldValues?: Record<string, FieldValue>
  /** The complete set of checked items, not a delta. */
  checkedItemKeys?: string[]
  /** Required-file slots satisfied so far, resolved by the caller. */
  uploadedSlotKeys?: string[]
  /** Mandatory when requesting changes (spec §29). */
  comment?: string
}

export interface StartInstanceRequest {
  template: WorkflowTemplate
  initiatedBy: UserId
  title: string
  projectId?: ProjectId
  fieldValues?: Record<string, FieldValue>
}

/** State a per-task operation acts on. */
export interface TaskOperationRequest {
  template: WorkflowTemplate
  instance: WorkflowInstance
  /** Every task of this instance, used to resolve earlier stage assignees. */
  tasks: Task[]
  taskId: TaskId
  actor: UserId
  submission?: StageSubmission
  context: EngineContext
}

export type { RoleId }
