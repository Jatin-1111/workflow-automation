/**
 * Move a few seeded deadlines so the demo data shows the product's point.
 *
 * The seed activates everything at once, so every deadline lands a day or
 * more out and every task sits in Upcoming. That leaves "Needs action" — the
 * first thing anybody sees — empty, and leaves the management dashboard with
 * nothing overdue and nothing stuck, which is precisely the behaviour the
 * platform exists to demonstrate.
 *
 * This nudges a handful of tasks: one past its deadline, two due today, the
 * rest untouched. Nothing is invented — the deadlines are the stage's own,
 * moved in time — and `npm run seed -- --reset` puts it all back.
 *
 *   npm run demo:stage
 */

import { closeMongoClient } from '@/lib/db/client'
import { listAllOpenTasks, updateTask } from '@/lib/db/repositories/tasks'
import { findInstancesByIds } from '@/lib/db/repositories/workflow-instances'
import { endOfBusinessDay } from '@/lib/workflow/business-day'

const HOUR = 3_600_000

async function main() {
  const now = new Date()
  const tasks = await listAllOpenTasks()
  if (tasks.length === 0) {
    console.log('No open tasks. Run `npm run seed -- --reset` first.')
    return
  }

  const instances = await findInstancesByIds([
    ...new Set(tasks.map((task) => task.instanceId)),
  ])
  const titleOf = new Map(instances.map((i) => [i.instanceId as string, i.title]))

  // Deepest in a workflow first, so the overdue one is a stage with history
  // behind it rather than a request nobody has touched.
  const ordered = [...tasks].sort(
    (a, b) => a.activatedAt.getTime() - b.activatedAt.getTime(),
  )

  const [late, ...rest] = ordered
  const dueToday = rest.slice(0, 2)

  await updateTask(late.taskId, {
    activatedAt: new Date(now.getTime() - 54 * HOUR),
    dueAt: new Date(now.getTime() - 30 * HOUR),
    slaBreachAt: new Date(now.getTime() - 18 * HOUR),
    updatedAt: now,
  })
  console.log(
    `overdue   ${late.taskId} ${late.stageName} — ${titleOf.get(late.instanceId)}`,
  )

  for (const task of dueToday) {
    await updateTask(task.taskId, {
      activatedAt: new Date(now.getTime() - 5 * HOUR),
      dueAt: endOfBusinessDay(now),
      slaBreachAt: new Date(now.getTime() + 2 * HOUR),
      updatedAt: now,
    })
    console.log(
      `due today ${task.taskId} ${task.stageName} — ${titleOf.get(task.instanceId)}`,
    )
  }

  console.log(
    `\n${tasks.length - 1 - dueToday.length} other task(s) left in Upcoming. ` +
      'Reseed to undo.',
  )
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error)
    process.exitCode = 1
  })
  .finally(closeMongoClient)
