/**
 * Resolves a seed template into a runtime `WorkflowTemplate`.
 *
 * Seeds name roles and projects by machine key; this turns those into the
 * permanent ids the engine works with, so no template ever carries a person's
 * or a project's display name.
 */

import type {
  DepartmentId,
  ProjectId,
  RoleId,
  WorkflowTemplateId,
} from '@/lib/types/ids'
import type {
  AssigneeSource,
  StageDefinition,
  WorkflowTemplate,
} from '@/lib/types/workflow'
import type { AssigneeSourceSeed, StageSeed, WorkflowTemplateSeed } from './types'

export interface TemplateBuildContext {
  workflowId: WorkflowTemplateId
  version: number
  now: Date
  roleIdByKey: Map<string, RoleId>
  projectIdByKey?: Map<string, ProjectId>
  departmentIdByKey?: Map<string, DepartmentId>
}

function resolveAssignee(
  source: AssigneeSourceSeed,
  context: TemplateBuildContext,
  stageKey: string,
): AssigneeSource {
  if (source.mode !== 'role') return source

  const roleId = context.roleIdByKey.get(source.roleKey)
  if (!roleId) {
    throw new Error(
      `Stage "${stageKey}" is assigned to unknown role "${source.roleKey}"`,
    )
  }
  return { mode: 'role', roleId }
}

function resolveStage(
  stage: StageSeed,
  context: TemplateBuildContext,
  stageKeys: Set<string>,
): StageDefinition {
  for (const key of [stage.nextStageKey, stage.rejectTargetStageKey]) {
    if (key && !stageKeys.has(key)) {
      throw new Error(`Stage "${stage.key}" routes to unknown stage "${key}"`)
    }
  }
  if (stage.requiresApproval && !stage.rejectTargetStageKey) {
    throw new Error(
      `Approval stage "${stage.key}" does not say where rejected work goes`,
    )
  }

  return {
    ...stage,
    assignees: stage.assignees.map((source) =>
      resolveAssignee(source, context, stage.key),
    ),
  }
}

export function buildWorkflowTemplate(
  seed: WorkflowTemplateSeed,
  context: TemplateBuildContext,
): WorkflowTemplate {
  const stageKeys = new Set(seed.stages.map((stage) => stage.key))
  if (stageKeys.size !== seed.stages.length) {
    throw new Error(`Workflow "${seed.key}" has duplicate stage keys`)
  }
  if (!stageKeys.has(seed.initialStageKey)) {
    throw new Error(
      `Workflow "${seed.key}" starts at unknown stage "${seed.initialStageKey}"`,
    )
  }

  return {
    workflowId: context.workflowId,
    version: context.version,
    name: seed.name,
    description: seed.description,
    projectId: seed.projectKey
      ? context.projectIdByKey?.get(seed.projectKey)
      : undefined,
    departmentId: seed.departmentKey
      ? context.departmentIdByKey?.get(seed.departmentKey)
      : undefined,
    stages: seed.stages.map((stage) => resolveStage(stage, context, stageKeys)),
    initialStageKey: seed.initialStageKey,
    status: 'active',
    createdAt: context.now,
    updatedAt: context.now,
  }
}
