/**
 * Seed form of a workflow template.
 *
 * Identical to the runtime `WorkflowTemplate` except that roles and projects
 * are named by machine key; the seed resolves those to permanent ids. This is
 * the shape the Workflow Builder will produce, which is what keeps the engine
 * generic while the builder UI is still to come (spec §34).
 */

import type {
  ChecklistItemDefinition,
  CompletionRule,
  FieldDefinition,
  RequiredFileDefinition,
  StageCondition,
} from '@/lib/types/workflow'
import type { Priority } from '@/lib/types/status'

export type AssigneeSourceSeed =
  | { mode: 'role'; roleKey: string }
  | { mode: 'initiator' }
  | { mode: 'stage_assignee'; stageKey: string }

export interface StageSeed {
  key: string
  name: string
  description?: string
  instructions?: string
  assignees: AssigneeSourceSeed[]
  completionRule: CompletionRule
  fields: FieldDefinition[]
  files: RequiredFileDefinition[]
  checklist: ChecklistItemDefinition[]
  priority: Priority
  dueInHours?: number
  slaHours?: number
  requiresApproval: boolean
  rejectTargetStageKey?: string
  nextStageKey: string | null
  conditions?: StageCondition[]
}

export interface WorkflowTemplateSeed {
  key: string
  name: string
  description: string
  /** Major Project this process belongs to, by seed key. */
  projectKey?: string
  departmentKey?: string
  stages: StageSeed[]
  initialStageKey: string
}
