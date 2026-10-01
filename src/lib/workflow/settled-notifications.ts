/**
 * Which notifications stop being true when work moves.
 *
 * A notification that asks somebody to act on a task was never cleared: the
 * bell went on saying "Approval required: Review" for a review approved
 * minutes ago, and for a run finished days before. A reviewer with three
 * unread, of which one needed her, learned to ignore the bell.
 *
 * Once a task is finished or called off, nobody is being asked to act on it
 * any more. Once it is moved to somebody else, the people it left are not.
 * Those notifications are marked read — not deleted: they still happened, and
 * still lead to the task.
 *
 * Pure, so the rule is tested without a database.
 */

import type { NotificationKind } from '@/lib/types/notification'
import type { TaskId, UserId } from '@/lib/types/ids'
import type { Task } from '@/lib/types/task'

/** Kinds that ask the recipient to do something with the task. */
export const ACTIONABLE_KINDS = [
  'task_assigned',
  'task_reassigned',
  'approval_required',
  'changes_requested',
  'deadline_approaching',
  'task_overdue',
] as const satisfies readonly NotificationKind[]

export interface Settlement {
  taskId: TaskId
  /** People still holding the task, whose notifications stay as they are. */
  stillHeldBy: UserId[]
}

function isClosed(task: Partial<Task>): boolean {
  return Boolean(task.completedAt) || task.status === 'completed' || task.status === 'cancelled'
}

/** What a set of task changes settles, for the inbox. */
export function settlementsFor(
  updates: { taskId: TaskId; changes: Partial<Task> }[],
): Settlement[] {
  const settled: Settlement[] = []
  for (const { taskId, changes } of updates) {
    if (isClosed(changes)) settled.push({ taskId, stillHeldBy: [] })
    else if (changes.assignees) settled.push({ taskId, stillHeldBy: changes.assignees })
  }
  return settled
}

/** The same rule applied to a task as stored, for clearing what built up before it. */
export function settlementForTask(task: Task): Settlement {
  return { taskId: task.taskId, stillHeldBy: isClosed(task) ? [] : task.assignees }
}
