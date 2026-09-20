/**
 * In-memory runtime for the workflow engine.
 *
 * Applies engine results to plain objects with a local id allocator, so a
 * workflow can be driven end to end with no database at all. Used to verify
 * that a template behaves as intended, and to prove the engine has no hidden
 * dependency on storage.
 */

import { formatId } from '@/lib/ids/format'
import type {
  FileId,
  TaskId,
  TimelineEventId,
  UserId,
  WorkflowInstanceId,
} from '@/lib/types/ids'
import type { WorkflowInstance } from '@/lib/types/instance'
import type { Notification } from '@/lib/types/notification'
import type { Task } from '@/lib/types/task'
import type { TimelineEvent } from '@/lib/types/timeline'
import type { EngineResult, StartResult } from './types'

export interface WorkflowState {
  instance: WorkflowInstance
  tasks: Task[]
  events: TimelineEvent[]
  notifications: Notification[]
}

/** Local sequence allocator standing in for the counters collection. */
export class MemoryIds {
  private readonly sequences = new Map<string, number>()

  next<K extends Parameters<typeof formatId>[0]>(kind: K) {
    const sequence = (this.sequences.get(kind) ?? 0) + 1
    this.sequences.set(kind, sequence)
    return formatId(kind, sequence)
  }
}

/** Open a workflow from a `startInstance` result. */
export function applyStart(
  start: StartResult,
  ids: MemoryIds,
  now: Date,
): WorkflowState {
  const instanceId = ids.next('workflowInstance') as WorkflowInstanceId

  const instance: WorkflowInstance = {
    ...start.instance,
    instanceId,
    createdAt: now,
    updatedAt: now,
  }

  const tasks = start.newTasks.map((draft) => ({
    ...draft,
    instanceId,
    taskId: ids.next('task') as TaskId,
    createdAt: now,
    updatedAt: now,
  }))

  return {
    instance,
    tasks,
    events: start.events.map((event) => ({
      ...event,
      eventId: ids.next('timelineEvent') as TimelineEventId,
      instanceId,
    })),
    notifications: start.notifications.map((notification) => ({
      notificationId: ids.next('notification'),
      recipientId: notification.recipientId,
      kind: notification.kind,
      title: notification.title,
      body: notification.body,
      instanceId,
      taskId: tasks.find((task) => task.stageKey === notification.taskStageKey)?.taskId,
      createdAt: now,
    })),
  }
}

/** Fold an engine result into the current state. */
export function applyResult(
  state: WorkflowState,
  result: EngineResult,
  ids: MemoryIds,
  now: Date,
): WorkflowState {
  const { instanceId } = state.instance

  const updated = state.tasks.map((task) => {
    const update = result.taskUpdates.find((candidate) => candidate.taskId === task.taskId)
    return update ? { ...task, ...update.changes, updatedAt: now } : task
  })

  const created = result.newTasks.map((draft) => ({
    ...draft,
    instanceId,
    taskId: ids.next('task') as TaskId,
    createdAt: now,
    updatedAt: now,
  }))

  const tasks = [...updated, ...created]

  return {
    instance: result.instance,
    tasks,
    events: [
      ...state.events,
      ...result.events.map((event) => ({
        ...event,
        eventId: ids.next('timelineEvent') as TimelineEventId,
        instanceId,
      })),
    ],
    notifications: [
      ...state.notifications,
      ...result.notifications.map((notification) => ({
        notificationId: ids.next('notification'),
        recipientId: notification.recipientId,
        kind: notification.kind,
        title: notification.title,
        body: notification.body,
        instanceId,
        taskId: created.find((task) => task.stageKey === notification.taskStageKey)?.taskId,
        createdAt: now,
      })),
    ],
  }
}

/** The open task at a stage, if the workflow is currently sitting there. */
export function openTaskAt(state: WorkflowState, stageKey: string): Task | undefined {
  return state.tasks.find((task) => task.stageKey === stageKey && !task.completedAt)
}

/** Every task currently assigned to a person, across all stages. */
export function openTasksFor(state: WorkflowState, userId: UserId): Task[] {
  return state.tasks.filter(
    (task) => !task.completedAt && task.assignees.includes(userId),
  )
}

/** Allocate a file id without a storage layer, for dry runs. */
export function nextFileId(ids: MemoryIds): FileId {
  return ids.next('file') as FileId
}
