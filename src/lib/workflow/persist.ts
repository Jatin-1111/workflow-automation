/**
 * Persists engine results.
 *
 * The engine emits drafts because it cannot allocate permanent ids; this is
 * where those drafts become records. Keeping the allocation here is what lets
 * the engine stay pure and unit testable.
 */

import { nextId, nextIds } from '@/lib/ids/generate'
import { insertNotifications } from '@/lib/db/repositories/notifications'
import { insertTasks, updateTask } from '@/lib/db/repositories/tasks'
import { appendTimelineEvents } from '@/lib/db/repositories/timeline-events'
import {
  insertInstance,
  replaceInstance,
} from '@/lib/db/repositories/workflow-instances'
import type { EngineResult, StartResult } from '@/lib/engine'
import type { WorkflowInstanceId } from '@/lib/types/ids'
import type { WorkflowInstance } from '@/lib/types/instance'
import type { Notification } from '@/lib/types/notification'
import type { Task } from '@/lib/types/task'
import type { TimelineEvent } from '@/lib/types/timeline'

/** Give drafts their permanent ids and bind them to the instance. */
async function materialise(
  instanceId: WorkflowInstanceId,
  result: Pick<EngineResult, 'newTasks' | 'events' | 'notifications'>,
  now: Date,
): Promise<{ tasks: Task[]; events: TimelineEvent[]; notifications: Notification[] }> {
  const taskIds = await nextIds('task', result.newTasks.length)
  const tasks: Task[] = result.newTasks.map((draft, index) => ({
    ...draft,
    instanceId,
    taskId: taskIds[index],
    createdAt: now,
    updatedAt: now,
  }))

  const eventIds = await nextIds('timelineEvent', result.events.length)
  const events: TimelineEvent[] = result.events.map((draft, index) => ({
    ...draft,
    instanceId,
    eventId: eventIds[index],
  }))

  const notificationIds = await nextIds('notification', result.notifications.length)
  const notifications: Notification[] = result.notifications.map((draft, index) => ({
    notificationId: notificationIds[index],
    recipientId: draft.recipientId,
    kind: draft.kind,
    title: draft.title,
    body: draft.body,
    instanceId,
    // A notification about a newly opened stage points at that stage's task.
    taskId: tasks.find((task) => task.stageKey === draft.taskStageKey)?.taskId,
    createdAt: now,
  }))

  return { tasks, events, notifications }
}

/** Write a newly started workflow and return the instance that was created. */
export async function persistStart(
  start: StartResult,
  now: Date = new Date(),
): Promise<WorkflowInstance> {
  const instanceId = await nextId('workflowInstance')

  const instance: WorkflowInstance = {
    ...start.instance,
    instanceId,
    createdAt: now,
    updatedAt: now,
  }

  const { tasks, events, notifications } = await materialise(instanceId, start, now)

  await insertInstance(instance)
  await insertTasks(tasks)
  await appendTimelineEvents(events)
  await insertNotifications(notifications)

  return instance
}

/** Write the outcome of an operation on a running workflow. */
export async function persistResult(
  result: EngineResult,
  now: Date = new Date(),
): Promise<WorkflowInstance> {
  const { instanceId } = result.instance
  const { tasks, events, notifications } = await materialise(instanceId, result, now)

  for (const update of result.taskUpdates) {
    await updateTask(update.taskId, { ...update.changes, updatedAt: now })
  }

  await replaceInstance({ ...result.instance, updatedAt: now })
  await insertTasks(tasks)
  await appendTimelineEvents(events)
  await insertNotifications(notifications)

  return result.instance
}
