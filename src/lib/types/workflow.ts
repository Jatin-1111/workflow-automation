/**
 * Workflow template schema — the configuration language the engine executes
 * and the Workflow Builder will eventually author (spec §19, §34–§38).
 *
 * Anything true of one specific process belongs in a template document, never
 * in engine or UI code.
 */

import type {
  DepartmentId,
  ProjectId,
  RoleId,
  UserId,
  WorkflowTemplateId,
} from './ids'
import type { Priority } from './status'

/** Input collected from the user at a stage. */
export const FIELD_TYPES = [
  'text',
  'textarea',
  'number',
  'currency',
  'date',
  'email',
  'phone',
  'select',
  'checkbox',
] as const
export type FieldType = (typeof FIELD_TYPES)[number]

export interface FieldDefinition {
  key: string
  label: string
  type: FieldType
  required: boolean
  helpText?: string
  /** Choices for `select`. */
  options?: string[]
}

export interface RequiredFileDefinition {
  key: string
  label: string
  required: boolean
  /** Accepted extensions, e.g. `['pdf', 'docx']`. Empty means any (spec §39). */
  acceptedExtensions?: string[]
}

export interface ChecklistItemDefinition {
  key: string
  label: string
  /** Grouping heading, e.g. `Formatting` / `Content` / `Images` (spec §27). */
  group?: string
  required: boolean
}

/**
 * Where a stage's assignees come from. A stage resolves the union of its
 * sources, which is how a two-owner stage like Deliverables Discussion is
 * expressed without naming anyone in code (spec §22).
 */
export type AssigneeSource =
  /** Whoever currently holds this workflow role (spec §6). */
  | { mode: 'role'; roleId: RoleId }
  /** Explicit people — an override, used sparingly. */
  | { mode: 'users'; userIds: UserId[] }
  /** Whoever started the instance, e.g. the Sales Owner on dispatch (spec §31). */
  | { mode: 'initiator' }
  /** Whoever completed an earlier stage, e.g. send revisions back to the designer. */
  | { mode: 'stage_assignee'; stageKey: string }

/** Whether one assignee finishing the stage is enough, or all must (spec §22). */
export type CompletionRule = 'any' | 'all'

/**
 * Conditional routing (spec §36). Modelled now, evaluated later — the engine
 * ignores conditions until the evaluator ships.
 */
export interface StageCondition {
  /** Field on the instance to test, e.g. `nda_required` or `estimated_value`. */
  fieldKey: string
  operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'not_in'
  value: string | number | boolean | Array<string | number>
}

export interface StageDefinition {
  /** Stable key referenced by routing. Never renamed once instances exist. */
  key: string
  name: string
  description?: string
  /** Shown to the assignee as "what I need to do" (spec §11). */
  instructions?: string

  assignees: AssigneeSource[]
  completionRule: CompletionRule

  fields: FieldDefinition[]
  files: RequiredFileDefinition[]
  checklist: ChecklistItemDefinition[]

  priority: Priority
  /** Deadline offset from the moment the stage activates. */
  dueInHours?: number
  /** Breach threshold surfaced on the stuck-work view (spec §43). */
  slaHours?: number

  /** Stage is an approval gate offering Approve / Request Changes (spec §28). */
  requiresApproval: boolean
  /** Where Request Changes sends the work back to (spec §29). */
  rejectTargetStageKey?: string

  /** Next stage on completion. `null` completes the instance. */
  nextStageKey: string | null

  /** Stage is skipped unless every condition passes. Not yet evaluated. */
  conditions?: StageCondition[]
}

/**
 * A template's lifecycle.
 *
 * A draft can be edited freely because nothing runs on it. Publishing makes it
 * active; from then on it is immutable and changes go into a new version, so
 * work already running keeps the process it started with (spec §38).
 */
export const TEMPLATE_STATUSES = ['draft', 'active', 'inactive'] as const
export type TemplateStatus = (typeof TEMPLATE_STATUSES)[number]

export interface WorkflowTemplate {
  /** Stable across versions — every version of Proposal Creation shares it. */
  workflowId: WorkflowTemplateId
  /** Running instances stay pinned to the version they started on (spec §38). */
  version: number
  name: string
  description?: string
  projectId?: ProjectId
  departmentId?: DepartmentId
  stages: StageDefinition[]
  initialStageKey: string
  status: TemplateStatus
  createdBy?: UserId
  createdAt: Date
  updatedAt: Date
}
