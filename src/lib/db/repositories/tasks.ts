/** Data access for tasks — the collection the My Work dashboard reads. */

import { getCollection, WITHOUT_ID } from '../collection'
import { COLLECTIONS } from '../collections'
import type { ProjectId, TaskId, UserId, WorkflowInstanceId } from '@/lib/types/ids'
import type { Task } from '@/lib/types/task'

async function tasks() {
  return getCollection<Task>(COLLECTIONS.tasks)
}

export async function insertTasks(docs: Task[]): Promise<void> {
  if (docs.length === 0) return
  await (await tasks()).insertMany(docs)
}

export async function updateTask(
  taskId: TaskId,
  changes: Partial<Task>,
): Promise<void> {
  await (await tasks()).updateOne({ taskId }, { $set: changes })
}

export async function findTaskById(taskId: TaskId): Promise<Task | null> {
  return (await tasks()).findOne({ taskId }, WITHOUT_ID)
}

/** Every task of an instance, which is what the engine operates over. */
export async function listTasksForInstance(
  instanceId: WorkflowInstanceId,
): Promise<Task[]> {
  return (await tasks()).find({ instanceId }, WITHOUT_ID).sort({ activatedAt: 1 }).toArray()
}

/**
 * Every open task assigned to one person, across every project and workflow.
 *
 * This is the query the My Work dashboard is built on: the whole point is that
 * nobody has to open each project to find their work (spec §7).
 */
export async function listOpenTasksForUser(userId: UserId): Promise<Task[]> {
  return (await tasks())
    .find({ assignees: userId, status: { $ne: 'completed' } }, WITHOUT_ID)
    .sort({ dueAt: 1, activatedAt: 1 })
    .toArray()
}

export async function listCompletedTasksForUser(
  userId: UserId,
  limit = 50,
): Promise<Task[]> {
  return (await tasks())
    .find({ assignees: userId, status: 'completed' }, WITHOUT_ID)
    .sort({ completedAt: -1 })
    .limit(limit)
    .toArray()
}

export async function listOpenTasksForProject(projectId: ProjectId): Promise<Task[]> {
  return (await tasks())
    .find({ projectId, status: { $ne: 'completed' } }, WITHOUT_ID)
    .sort({ dueAt: 1 })
    .toArray()
}

/** Open tasks across the organisation, for the management views. */
export async function searchTasks(pattern: RegExp, limit = 20): Promise<Task[]> {
  return (await tasks())
    .find({ stageName: pattern }, WITHOUT_ID)
    .sort({ dueAt: 1 })
    .limit(limit)
    .toArray()
}

/** Every instance a person has ever been assigned work on. */
export async function listInstanceIdsAssignedTo(
  userId: UserId,
): Promise<WorkflowInstanceId[]> {
  const rows = await (await tasks())
    .find({ assignees: userId }, { projection: { instanceId: 1, _id: 0 } })
    .toArray()
  return [...new Set(rows.map((row) => row.instanceId))]
}

export async function listAllOpenTasks(): Promise<Task[]> {
  return (await tasks())
    .find({ status: { $ne: 'completed' } }, WITHOUT_ID)
    .sort({ dueAt: 1 })
    .toArray()
}
