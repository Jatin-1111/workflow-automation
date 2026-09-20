/** Stage lookup and task construction. Pure helpers over a pinned template. */

import type { Task } from '@/lib/types/task'
import type { StageDefinition, WorkflowTemplate } from '@/lib/types/workflow'
import type { UserId } from '@/lib/types/ids'
import type { TaskDraft } from './types'

export function findStage(
  template: WorkflowTemplate,
  stageKey: string,
): StageDefinition | undefined {
  return template.stages.find((stage) => stage.key === stageKey)
}

/** The stage that follows on completion, or undefined when the workflow ends. */
export function nextStageOf(
  template: WorkflowTemplate,
  stage: StageDefinition,
): StageDefinition | undefined {
  return stage.nextStageKey ? findStage(template, stage.nextStageKey) : undefined
}

function addHours(from: Date, hours: number | undefined): Date | undefined {
  return hours === undefined ? undefined : new Date(from.getTime() + hours * 3_600_000)
}

/**
 * Build the task for a stage that is being activated.
 *
 * A stage that gates on approval opens as `pending_approval` so the management
 * views can distinguish work in progress from work awaiting a decision.
 */
export function buildTaskDraft(params: {
  stage: StageDefinition
  instance: { instanceId: Task['instanceId']; workflowId: Task['workflowId']; projectId?: Task['projectId'] }
  assignees: UserId[]
  activatedAt: Date
  revisionRound: number
}): TaskDraft {
  const { stage, instance, assignees, activatedAt, revisionRound } = params

  return {
    instanceId: instance.instanceId,
    workflowId: instance.workflowId,
    projectId: instance.projectId,
    stageKey: stage.key,
    stageName: stage.name,
    assignees,
    completionRule: stage.completionRule,
    completedBy: [],
    status: stage.requiresApproval ? 'pending_approval' : 'not_started',
    priority: stage.priority,
    revisionRound,
    fieldValues: {},
    checklist: stage.checklist.map((item) => ({ key: item.key, checked: false })),
    files: [],
    activatedAt,
    dueAt: addHours(activatedAt, stage.dueInHours),
    slaBreachAt: addHours(activatedAt, stage.slaHours),
  }
}
