/**
 * Everything the task page needs, in one read.
 *
 * The brief is explicit that a person should be able to operate a task without
 * navigating anywhere else (spec §11), so this assembles the instructions,
 * the earlier stages' work, the files, the checklist, the discussion and the
 * history together.
 */

import 'server-only'
import { listCommentsForInstance } from '@/lib/db/repositories/comments'
import { listFilesForInstance } from '@/lib/db/repositories/files'
import { listProjects } from '@/lib/db/repositories/projects'
import { listTimelineForInstance } from '@/lib/db/repositories/timeline-events'
import { listRoles } from '@/lib/db/repositories/roles'
import { listAllOpenTasks } from '@/lib/db/repositories/tasks'
import { resolveActivation, resolveAssignees } from '@/lib/engine'
import { buildEngineContext } from '@/lib/workflow/engine-context'
import { listUsers } from '@/lib/db/repositories/users'
import { loadTaskContext } from '@/lib/workflow/service'
import { canViewTask } from './visibility'
import { buildProgress, type StageProgress } from './progress'
import {
  assignmentRecipients,
  timelineSentence,
  type TimelineSentence,
} from './timeline-wording'
import { humanise } from '@/features/my-work/format'
import { can } from '@/lib/auth/permissions'
import { deriveBucket, hasBreachedSla } from '@/lib/workflow/buckets'
import type { FieldValue } from '@/lib/types/instance'
import type { TaskId, UserId } from '@/lib/types/ids'
import type { Task } from '@/lib/types/task'
import type { PublicUser } from '@/lib/types/user'
import type { StageDefinition } from '@/lib/types/workflow'

/** What an earlier stage produced, shown as context for the current one. */
export interface PriorStage {
  name: string
  completedBy: string[]
  completedAt?: Date
  values: { label: string; value: string }[]
}

/**
 * Plain view models.
 *
 * Database documents carry a Mongo `_id`, which must not cross into a client
 * component - and by convention never leaves the db layer at all. Rows are
 * therefore rebuilt field by field rather than spread.
 */
export interface TaskFileRow {
  fileId: string
  name: string
  version: number
  slotKey?: string
  sizeBytes: number
  uploadedByName: string
  uploadedAt: Date
  isFinalApproved: boolean
  stageKey?: string
}

export interface TimelineRow {
  eventId: string
  sentence: TimelineSentence
  stageKey?: string
  comment?: string
  at: Date
}

/** Somebody a task could be moved to (spec §46). */
export interface AssignableRow {
  userId: string
  name: string
  roles: string[]
  openTasks: number
}

/** The consequence of a button, in the words the button will use. */
export interface StageOutcome {
  kind: 'stage' | 'finish'
  stageName?: string
  /** Names, or empty when the stage names a role nobody currently holds. */
  people: string[]
}

export interface TaskDetail {
  task: Task
  stage: StageDefinition
  projectName: string
  workflowName: string
  instanceTitle: string
  instanceId: Task['instanceId']
  instanceStatus: string
  dueAt?: Date
  overdue: boolean
  slaBreached: boolean

  /** Whether the viewer may act, as opposed to merely read (spec §46). */
  canOperate: boolean
  canReassign: boolean
  /**
   * Where finishing this stage sends the work, and who receives it.
   *
   * The platform's promise is that completing your part hands the work on
   * without anybody being messaged. That happened invisibly: the button said
   * what it did and nothing said what followed.
   */
  outcome: StageOutcome
  /** Where an approval stage sends work back to, when it does. */
  sendBack?: StageOutcome

  /** Whether the viewer may call off the whole run (spec §42). */
  canCancel: boolean
  /** Why this task is parked, taken from the hold that put it there. */
  heldReason?: string
  assigneeNames: string[]
  assigneeIds: string[]
  /** How the stage is configured to pick people, for context when overriding. */
  assignmentSource?: string
  assignable: AssignableRow[]

  progress: StageProgress[]
  priorStages: PriorStage[]
  files: TaskFileRow[]
  comments: { authorName: string; body: string; createdAt: Date }[]
  timeline: TimelineRow[]
}

function displayValue(value: FieldValue): string {
  if (value === null || value === undefined) return '—'
  if (value instanceof Date) return value.toLocaleDateString('en-GB')
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  return String(value)
}

/**
 * Load a task for a viewer, or null if they have no business seeing it.
 *
 * Assignees can act. People who worked on the instance earlier, or who raised
 * it, can read it. Anyone with organisation-wide visibility can read it. Nobody
 * else gets it at all.
 */
export async function getTaskDetail(
  taskId: TaskId,
  viewer: PublicUser,
  now = new Date(),
): Promise<TaskDetail | null> {
  const loaded = await loadTaskContext(taskId)
  if (!loaded) return null

  const { task, instance, template, tasks } = loaded

  const audience = {
    assignees: task.assignees,
    initiatedBy: instance.initiatedBy,
    everyStageAssignees: tasks.map((candidate) => candidate.assignees),
  }
  if (!canViewTask(viewer, audience)) return null

  // Reading and acting are separate questions, and the gap between them is
  // wider now that managers can read any run: holding the stage is still
  // what decides whether the buttons do anything.
  const isAssignee = task.assignees.includes(viewer.userId)

  const canReassign = can(viewer.accessLevel, 'task.reassign')

  const [projects, users, files, comments, timeline, roles, openTasks] =
    await Promise.all([
      listProjects(),
      listUsers(),
      listFilesForInstance(instance.instanceId),
      listCommentsForInstance(instance.instanceId),
      listTimelineForInstance(instance.instanceId),
      canReassign ? listRoles() : Promise.resolve([]),
      canReassign ? listAllOpenTasks() : Promise.resolve([]),
    ])

  const userName = new Map(users.map((user) => [user.userId, user.name]))
  const nameOf = (userId: UserId) => userName.get(userId) ?? userId

  const stage = template.stages.find((candidate) => candidate.key === task.stageKey)
  if (!stage) return null

  // Resolved the way the engine will resolve it, conditions included, so the
  // button cannot promise a stage that will actually be skipped.
  const context = await buildEngineContext(template, now)

  function outcomeFor(startKey: string | null | undefined): StageOutcome {
    const { stage: next } = resolveActivation(template, startKey, instance.fieldValues)
    if (!next) return { kind: 'finish', people: [] }
    return {
      kind: 'stage',
      stageName: next.name,
      people: resolveAssignees(next, instance, tasks, context).map(nameOf),
    }
  }

  return {
    task,
    stage,
    projectName:
      projects.find((project) => project.projectId === instance.projectId)?.name ??
      'Unassigned',
    workflowName: template.name,
    instanceTitle: instance.title,
    instanceId: instance.instanceId,
    instanceStatus: instance.status,
    dueAt: task.dueAt,
    overdue: deriveBucket(task, now) === 'overdue',
    slaBreached: hasBreachedSla(task, now),

    // Only an assignee of an open task may change anything.
    canOperate: isAssignee && !task.completedAt,
    canReassign: canReassign && !task.completedAt,
    outcome: outcomeFor(stage.nextStageKey),
    sendBack: stage.requiresApproval
      ? outcomeFor(stage.rejectTargetStageKey)
      : undefined,
    canCancel:
      can(viewer.accessLevel, 'instance.cancel') &&
      instance.status !== 'completed' &&
      instance.status !== 'cancelled',
    // The most recent hold is the one that explains the current state; older
    // ones belong to the timeline, which keeps every pass.
    heldReason:
      task.status === 'waiting' || task.status === 'blocked'
        ? timeline
            .filter(
              (event) => event.action === 'task_held' && event.taskId === task.taskId,
            )
            .at(-1)?.comment
        : undefined,
    assigneeNames: task.assignees.map(nameOf),
    assigneeIds: [...task.assignees],
    assignmentSource: describeAssignment(stage, roles),
    assignable: canReassign
      ? users
          .filter((candidate) => candidate.status === 'active')
          .map((candidate) => ({
            userId: candidate.userId,
            name: candidate.name,
            roles: candidate.roleIds.map(
              (roleId) => roles.find((role) => role.roleId === roleId)?.name ?? roleId,
            ),
            // Current load, so the choice is an informed one (spec §17).
            openTasks: openTasks.filter((candidate2) =>
              candidate2.assignees.includes(candidate.userId),
            ).length,
          }))
      : [],

    progress: buildProgress(template.stages, tasks, task, instance.fieldValues),
    priorStages: buildPriorStages(template.stages, tasks, task, nameOf),
    files: files.map((file) => ({
      fileId: file.fileId,
      name: file.name,
      version: file.version,
      slotKey: file.slotKey,
      sizeBytes: file.sizeBytes,
      uploadedByName: nameOf(file.uploadedBy),
      uploadedAt: file.uploadedAt,
      isFinalApproved: file.isFinalApproved,
      stageKey: file.stageKey,
    })),
    comments: comments.map((comment) => ({
      authorName: nameOf(comment.authorId),
      body: comment.body,
      createdAt: comment.createdAt,
    })),
    timeline: timeline.map((event) => ({
      eventId: event.eventId,
      sentence: timelineSentence(
        event.action,
        nameOf(event.actorId),
        assignmentRecipients(event, tasks)?.map(nameOf),
        humanise(event.action).toLowerCase(),
      ),
      stageKey: event.stageKey,
      comment: event.comment,
      at: event.at,
    })),
  }
}

/** How the stage picks its people, in words (spec §6, §22, §31). */
function describeAssignment(
  stage: StageDefinition,
  roles: { roleId: string; name: string }[],
): string | undefined {
  const parts = stage.assignees.map((source) => {
    if (source.mode === 'role') {
      return roles.find((role) => role.roleId === source.roleId)?.name ?? 'a role'
    }
    if (source.mode === 'initiator') return 'whoever started this'
    if (source.mode === 'stage_assignee') return `whoever did ${source.stageKey}`
    return 'named people'
  })
  return parts.length > 0 ? parts.join(' and ') : undefined
}

/**
 * What earlier stages produced.
 *
 * The designer needs the content, the approver needs everything - so rather
 * than guessing, every completed stage's recorded work is available here.
 */
function buildPriorStages(
  stages: StageDefinition[],
  tasks: Task[],
  current: Task,
  nameOf: (userId: UserId) => string,
): PriorStage[] {
  const currentIndex = stages.findIndex((stage) => stage.key === current.stageKey)

  return stages
    .slice(0, currentIndex < 0 ? stages.length : currentIndex)
    .map((stage): PriorStage | null => {
      const completed = tasks
        .filter((task) => task.stageKey === stage.key && task.completedAt)
        .at(-1)
      if (!completed) return null

      return {
        name: stage.name,
        completedBy: completed.completedBy.map(nameOf),
        completedAt: completed.completedAt,
        values: stage.fields
          .map((field) => ({
            label: field.label,
            value: displayValue(completed.fieldValues[field.key]),
          }))
          .filter((entry) => entry.value !== '—'),
      }
    })
    .filter((stage): stage is PriorStage => stage !== null)
}
