/**
 * Which task opens a run of a workflow.
 *
 * A run has no page of its own; its tasks are the way in. Two places need
 * the same answer — the Overview's lists of runs and search — and a search
 * result for a run used to open nothing at all, while looking like it would.
 *
 * The task somebody is working on now, if there is one: that is where the
 * run is. Otherwise the most recent, which for a finished run is its last
 * stage and carries the whole history.
 *
 * Pure.
 */

import type { Task } from '@/lib/types/task'

export function entryTaskFor(tasksOfRun: Task[]): Task | undefined {
  const open = tasksOfRun.find((task) => !task.completedAt && task.status !== 'cancelled')
  if (open) return open
  return [...tasksOfRun].sort((a, b) => b.activatedAt.getTime() - a.activatedAt.getTime())[0]
}
