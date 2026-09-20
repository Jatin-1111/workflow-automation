/** Versioned file attached to a workflow instance (spec §39). */

import type {
  FileId,
  TaskId,
  UserId,
  WorkflowInstanceId,
  WorkflowTemplateId,
} from './ids'

export interface FileRecord {
  fileId: FileId
  instanceId: WorkflowInstanceId
  workflowId: WorkflowTemplateId
  taskId?: TaskId
  stageKey?: string
  /** Template `RequiredFileDefinition.key` this upload satisfies, when any. */
  slotKey?: string

  name: string
  mimeType: string
  sizeBytes: number
  /** Increments per slot within an instance: v1 content, v2 designed, ... */
  version: number
  /** Opaque storage locator. Local path today, object key later. */
  storageKey: string

  /** Set when an approver marks this the final approved file (spec §30). */
  isFinalApproved: boolean

  uploadedBy: UserId
  uploadedAt: Date
}
