/** One person's assigned stage — the unit of work on the My Work dashboard. */

import type {
  FileId,
  ProjectId,
  TaskId,
  UserId,
  WorkflowInstanceId,
  WorkflowTemplateId,
} from './ids'
import type { FieldValue } from './instance'
import type { CompletionRule } from './workflow'
import type { Priority, TaskStatus } from './status'

/**
 * A file attached to this task. The `FileRecord` is the source of truth; this
 * reference carries the slot so the engine can check required-file rules
 * without reaching into file storage.
 */
export interface TaskFileRef {
  fileId: FileId
  /** Template `RequiredFileDefinition.key` this upload satisfies, when any. */
  slotKey?: string
}

export interface ChecklistItemState {
  key: string
  checked: boolean
  checkedBy?: UserId
  checkedAt?: Date
}

export interface Task {
  taskId: TaskId
  instanceId: WorkflowInstanceId
  workflowId: WorkflowTemplateId
  /** Denormalised so My Work can filter by project without a join (spec §10). */
  projectId?: ProjectId

  stageKey: string
  /** Snapshot of the stage name from the pinned template version. */
  stageName: string

  assignees: UserId[]
  completionRule: CompletionRule
  /** Who has finished, for `completionRule: 'all'`. */
  completedBy: UserId[]

  status: TaskStatus
  priority: Priority

  /** Revision pass, incremented each time Request Changes routes work back (spec §29). */
  revisionRound: number

  fieldValues: Record<string, FieldValue>
  checklist: ChecklistItemState[]
  files: TaskFileRef[]

  activatedAt: Date
  dueAt?: Date
  /** When the SLA is breached, for the stuck-work view (spec §43). */
  slaBreachAt?: Date
  completedAt?: Date
  createdAt: Date
  updatedAt: Date
}
