/**
 * Activating a stage.
 *
 * Shared by every path that moves work forward or sends it back, so routing,
 * assignment, deadlines and notifications behave identically however the stage
 * was reached.
 */

import type { WorkflowInstance } from '@/lib/types/instance'
import type { Task } from '@/lib/types/task'
import type { StageDefinition } from '@/lib/types/workflow'
import { resolveAssignees } from './assignees'
import { refuse, type EngineOutcome } from './errors'
import { buildTaskDraft } from './stages'
import type {
  EngineContext,
  NotificationDraft,
  TaskDraft,
  TimelineEventDraft,
} from './types'

export interface Activation {
  task: TaskDraft
  events: TimelineEventDraft[]
  notifications: NotificationDraft[]
}

/** The revision pass a stage is being entered on, counting from 1. */
export function nextRevisionRound(tasks: Task[], stageKey: string): number {
  const rounds = tasks
    .filter((task) => task.stageKey === stageKey)
    .map((task) => task.revisionRound)
  return rounds.length === 0 ? 1 : Math.max(...rounds) + 1
}

export function activateStage(params: {
  stage: StageDefinition
  instance: WorkflowInstance
  tasks: Task[]
  actor: Task['assignees'][number]
  context: EngineContext
}): EngineOutcome<Activation> {
  const { stage, instance, tasks, actor, context } = params

  const assignees = resolveAssignees(stage, instance, tasks, context)
  if (assignees.length === 0) {
    // Refuse loudly: a stage whose role has no holder would strand the work.
    return refuse({
      code: 'no_assignee_resolved',
      message: `No one is currently assigned to "${stage.name}". Map its role to a user first.`,
      key: stage.key,
    })
  }

  const task = buildTaskDraft({
    stage,
    instance,
    assignees,
    activatedAt: context.now,
    revisionRound: nextRevisionRound(tasks, stage.key),
  })

  const events: TimelineEventDraft[] = [
    {
      stageKey: stage.key,
      actorId: actor,
      action: 'stage_activated',
      at: context.now,
    },
    {
      stageKey: stage.key,
      actorId: actor,
      action: 'task_assigned',
      at: context.now,
    },
  ]

  const notifications: NotificationDraft[] = assignees.map((recipientId) => ({
    recipientId,
    kind: stage.requiresApproval ? 'approval_required' : 'task_assigned',
    title: stage.requiresApproval
      ? `Approval required: ${stage.name}`
      : `New task: ${stage.name}`,
    body: instance.title,
    taskStageKey: stage.key,
  }))

  return { ok: true, result: { task, events, notifications } }
}
