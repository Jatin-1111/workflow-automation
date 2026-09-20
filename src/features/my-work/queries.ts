/**
 * The My Work dashboard's data.
 *
 * Aggregates a person's tasks across every project and workflow they are
 * authorised to see, so nobody has to open each project to find their own work
 * (spec §7). Each row carries the full trail the brief asks for:
 * Major Project -> Workflow -> Instance -> Stage -> Deadline -> Status.
 */

import 'server-only'
import { listProjects } from '@/lib/db/repositories/projects'
import {
  listCompletedTasksForUser,
  listOpenTasksForUser,
  listTasksForInstance,
} from '@/lib/db/repositories/tasks'
import { listUsers } from '@/lib/db/repositories/users'
import {
  findInstancesByIds,
  listInstancesStartedBy,
} from '@/lib/db/repositories/workflow-instances'
import { listActiveTemplates } from '@/lib/db/repositories/workflow-templates'
import { deriveBucket, hasBreachedSla, hoursWaiting } from '@/lib/workflow/buckets'
import type {
  ProjectId,
  TaskId,
  UserId,
  WorkflowInstanceId,
  WorkflowTemplateId,
} from '@/lib/types/ids'
import type { Priority, TaskStatus, WorkBucket } from '@/lib/types/status'

/** One row of the dashboard. */
export interface WorkItem {
  taskId: TaskId
  instanceId: WorkflowInstanceId
  projectId?: ProjectId
  projectName: string
  workflowId: WorkflowTemplateId
  workflowName: string
  instanceTitle: string
  stageName: string
  status: TaskStatus
  priority: Priority
  bucket: WorkBucket
  dueAt?: Date
  revisionRound: number
  slaBreached: boolean
  /** Progress on this stage's checklist, when it has one. */
  checklist?: { done: number; total: number }
}

/** Work someone raised that now sits with a colleague (spec §15). */
export interface WaitingItem {
  instanceId: WorkflowInstanceId
  projectId?: ProjectId
  workflowId: WorkflowTemplateId
  projectName: string
  workflowName: string
  instanceTitle: string
  stageName: string
  waitingOn: string[]
  hoursWaiting: number
  slaBreached: boolean
}

export interface MyWork {
  items: WorkItem[]
  waitingOnOthers: WaitingItem[]
  counts: Record<WorkBucket, number>
  projects: { projectId: ProjectId; name: string }[]
  workflows: { workflowId: WorkflowTemplateId; name: string }[]
}

/** Lookup tables shared by both halves of the dashboard. */
async function directories() {
  const [projects, templates, users] = await Promise.all([
    listProjects(),
    listActiveTemplates(),
    listUsers(),
  ])

  return {
    projects,
    templates,
    projectName: new Map(projects.map((project) => [project.projectId, project.name])),
    workflowName: new Map(
      templates.map((template) => [template.workflowId, template.name]),
    ),
    userName: new Map(users.map((user) => [user.userId, user.name])),
  }
}

export async function getMyWork(userId: UserId, now = new Date()): Promise<MyWork> {
  const [openTasks, completedTasks, directory] = await Promise.all([
    listOpenTasksForUser(userId),
    listCompletedTasksForUser(userId),
    directories(),
  ])

  const tasks = [...openTasks, ...completedTasks]
  const instances = await findInstancesByIds([
    ...new Set(tasks.map((task) => task.instanceId)),
  ])
  const instanceById = new Map(
    instances.map((instance) => [instance.instanceId, instance]),
  )

  const items: WorkItem[] = tasks.map((task) => {
    const instance = instanceById.get(task.instanceId)
    const total = task.checklist.length

    return {
      taskId: task.taskId,
      instanceId: task.instanceId,
      projectId: task.projectId,
      projectName: task.projectId
        ? (directory.projectName.get(task.projectId) ?? 'Unassigned')
        : 'Unassigned',
      workflowId: task.workflowId,
      workflowName: directory.workflowName.get(task.workflowId) ?? 'Workflow',
      instanceTitle: instance?.title ?? task.instanceId,
      stageName: task.stageName,
      status: task.status,
      priority: task.priority,
      bucket: deriveBucket(task, now),
      dueAt: task.dueAt,
      revisionRound: task.revisionRound,
      slaBreached: hasBreachedSla(task, now),
      checklist: total
        ? { done: task.checklist.filter((item) => item.checked).length, total }
        : undefined,
    }
  })

  const counts = items.reduce(
    (totals, item) => ({ ...totals, [item.bucket]: totals[item.bucket] + 1 }),
    {
      needs_action: 0,
      in_progress: 0,
      waiting: 0,
      upcoming: 0,
      overdue: 0,
      completed: 0,
    } as Record<WorkBucket, number>,
  )

  const waitingOnOthers = await getWaitingOnOthers(userId, now, directory)
  counts.waiting += waitingOnOthers.length

  return {
    items,
    waitingOnOthers,
    counts,
    projects: directory.projects.map((project) => ({
      projectId: project.projectId,
      name: project.name,
    })),
    workflows: directory.templates.map((template) => ({
      workflowId: template.workflowId,
      name: template.name,
    })),
  }
}

/**
 * Instances this person started that are now with someone else.
 *
 * Without this, work you raised disappears from view the moment you hand it
 * on, which is exactly the blindness the platform is meant to remove.
 */
async function getWaitingOnOthers(
  userId: UserId,
  now: Date,
  directory: Awaited<ReturnType<typeof directories>>,
): Promise<WaitingItem[]> {
  const started = await listInstancesStartedBy(userId)

  const waiting = await Promise.all(
    started.map(async (instance): Promise<WaitingItem | null> => {
      const tasks = await listTasksForInstance(instance.instanceId)
      const open = tasks.find((task) => !task.completedAt)
      if (!open || open.assignees.includes(userId)) return null

      return {
        instanceId: instance.instanceId,
        projectId: instance.projectId,
        workflowId: instance.workflowId,
        projectName: instance.projectId
          ? (directory.projectName.get(instance.projectId) ?? 'Unassigned')
          : 'Unassigned',
        workflowName: directory.workflowName.get(instance.workflowId) ?? 'Workflow',
        instanceTitle: instance.title,
        stageName: open.stageName,
        waitingOn: open.assignees.map(
          (assignee) => directory.userName.get(assignee) ?? assignee,
        ),
        hoursWaiting: hoursWaiting(open, now),
        slaBreached: hasBreachedSla(open, now),
      }
    }),
  )

  return waiting.filter((item): item is WaitingItem => item !== null)
}
