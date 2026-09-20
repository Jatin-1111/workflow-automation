/** A single live run of a workflow template, e.g. "Proposal — ABC Technologies". */

import type {
  ProjectId,
  UserId,
  WorkflowInstanceId,
  WorkflowTemplateId,
} from './ids'
import type { InstanceStatus, Priority } from './status'

/** Value captured from a template-defined field. */
export type FieldValue = string | number | boolean | Date | null

export interface WorkflowInstance {
  instanceId: WorkflowInstanceId
  workflowId: WorkflowTemplateId
  /** Pinned at creation; never follows the template to a newer version (spec §38). */
  templateVersion: number
  projectId?: ProjectId

  /** Human label for dashboards, e.g. "Proposal — ABC Technologies". */
  title: string

  /**
   * Stages currently open. Single-element today; an array so parallel branches
   * do not require a migration.
   */
  currentStageKeys: string[]

  status: InstanceStatus
  priority: Priority

  /** Resolves `{ mode: 'initiator' }` assignee sources. */
  initiatedBy: UserId

  /** Accumulated field values from every completed stage, keyed by field key. */
  fieldValues: Record<string, FieldValue>

  startedAt: Date
  completedAt?: Date
  createdAt: Date
  updatedAt: Date
}
