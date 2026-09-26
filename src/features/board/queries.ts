/**
 * A workflow as a board.
 *
 * Trello's shape mapped onto this product: the board is a workflow, a list is
 * a stage, a card is one run sitting at that stage. The mapping holds because
 * a run is only ever at one stage, so every card has exactly one column.
 *
 * Read at the template's latest published version for the column order, while
 * each card reports the stage its own run is actually on — a run pinned to an
 * older version can sit at a stage this version no longer has, and those are
 * collected rather than dropped.
 */

import 'server-only'
import { listAllOpenTasks } from '@/lib/db/repositories/tasks'
import { listFilesForInstance } from '@/lib/db/repositories/files'
import { listInstances } from '@/lib/db/repositories/workflow-instances'
import { listUsers } from '@/lib/db/repositories/users'
import { listProjects } from '@/lib/db/repositories/projects'
import { deriveBucket, hasBreachedSla } from '@/lib/workflow/buckets'
import type { ProjectId, TaskId, UserId, WorkflowInstanceId } from '@/lib/types/ids'
import type { WorkflowTemplate } from '@/lib/types/workflow'
import type { Priority } from '@/lib/types/status'

export interface BoardCard {
  instanceId: WorkflowInstanceId
  /** The open task at this stage: what a move acts on. */
  taskId?: TaskId
  title: string
  projectName?: string
  stageKey: string
  assignees: { userId: UserId; name: string; initials: string }[]
  dueAt?: Date
  overdue: boolean
  slaBreached: boolean
  priority: Priority
  checklistDone: number
  checklistTotal: number
  fileCount: number
  revisionRound: number
  /** Whether the viewer may act on this card, which is what drag depends on. */
  mine: boolean
}

export interface BoardColumn {
  key: string
  name: string
  requiresApproval: boolean
  cards: BoardCard[]
}

export interface Board {
  workflowId: string
  name: string
  version: number
  columns: BoardColumn[]
  /** Runs whose stage is not on this version's board, so nothing is hidden. */
  elsewhere: BoardCard[]
  done: BoardCard[]
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/)
  const first = parts[0]?.[0] ?? '?'
  const last = parts.length > 1 ? parts[parts.length - 1][0] : ''
  return (first + last).toUpperCase()
}

export async function getBoard(
  template: WorkflowTemplate,
  viewer: UserId,
  now = new Date(),
): Promise<Board> {
  const [instances, openTasks, users, projects] = await Promise.all([
    listInstances(),
    listAllOpenTasks(),
    listUsers(),
    listProjects(),
  ])

  const nameOf = new Map(users.map((user) => [user.userId as string, user.name]))
  const runs = instances.filter(
    (instance) => instance.workflowId === template.workflowId,
  )

  // One read per run rather than per card: a board of twenty cards would
  // otherwise make twenty round trips for attachment counts alone.
  const fileCounts = new Map<string, number>()
  await Promise.all(
    runs.map(async (run) => {
      fileCounts.set(run.instanceId, (await listFilesForInstance(run.instanceId)).length)
    }),
  )

  const projectNames = new Map<ProjectId, string>(
    projects.map((project) => [project.projectId, project.name]),
  )

  function cardFor(run: (typeof runs)[number]): BoardCard {
    const task = openTasks.find((candidate) => candidate.instanceId === run.instanceId)
    const assignees = (task?.assignees ?? []).map((userId) => ({
      userId,
      name: nameOf.get(userId) ?? userId,
      initials: initialsOf(nameOf.get(userId) ?? userId),
    }))

    return {
      instanceId: run.instanceId,
      taskId: task?.taskId,
      title: run.title,
      projectName: run.projectId ? projectNames.get(run.projectId) : undefined,
      stageKey: task?.stageKey ?? run.currentStageKeys[0] ?? '',
      assignees,
      dueAt: task?.dueAt,
      overdue: task ? deriveBucket(task, now) === 'overdue' : false,
      slaBreached: task ? hasBreachedSla(task, now) : false,
      priority: task?.priority ?? run.priority,
      checklistDone: task?.checklist.filter((item) => item.checked).length ?? 0,
      checklistTotal: task?.checklist.length ?? 0,
      fileCount: fileCounts.get(run.instanceId) ?? 0,
      revisionRound: task?.revisionRound ?? 1,
      mine: Boolean(task?.assignees.includes(viewer)),
    }
  }

  const live = runs.filter(
    (run) => run.status !== 'completed' && run.status !== 'cancelled',
  )
  const cards = live.map(cardFor)
  const columnKeys = new Set(template.stages.map((stage) => stage.key))

  return {
    workflowId: template.workflowId,
    name: template.name,
    version: template.version,
    columns: template.stages.map((stage) => ({
      key: stage.key,
      name: stage.name,
      requiresApproval: stage.requiresApproval,
      cards: cards.filter((card) => card.stageKey === stage.key),
    })),
    elsewhere: cards.filter((card) => !columnKeys.has(card.stageKey)),
    done: runs
      .filter((run) => run.status === 'completed' || run.status === 'cancelled')
      .map(cardFor),
  }
}

