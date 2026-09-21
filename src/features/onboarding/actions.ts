'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { requireUser } from '@/lib/auth/dal'
import {
  dismissSetupCard,
  markTourSeen,
} from '@/lib/db/repositories/users'
import { listTasksForInstance } from '@/lib/db/repositories/tasks'
import { listInstances } from '@/lib/db/repositories/workflow-instances'
import { listActiveTemplates } from '@/lib/db/repositories/workflow-templates'
import { startInstance } from '@/lib/engine'
import { buildEngineContext } from '@/lib/workflow/engine-context'
import { persistStart } from '@/lib/workflow/persist'
import { PRACTICE_WORKFLOW } from '@/lib/seed/workflows/practice'

/** Remember that somebody has been shown the introduction. */
export async function completeTourAction(): Promise<void> {
  const user = await requireUser()
  await markTourSeen(user.userId)
  revalidatePath('/my-work')
}

export async function dismissSetupAction(): Promise<void> {
  const user = await requireUser()
  await dismissSetupCard(user.userId)
  revalidatePath('/my-work')
}

/**
 * Open a practice run, or reopen the one already in progress.
 *
 * Every stage is assigned to whoever started it, so one person can drive the
 * whole thing alone. A second run is never started while one is unfinished:
 * the point is to complete one, not to collect them.
 */
export async function startPracticeAction(): Promise<void> {
  const user = await requireUser()

  const template = (await listActiveTemplates()).find(
    (candidate) => candidate.name === PRACTICE_WORKFLOW.name,
  )
  if (!template) redirect('/help')

  const mine = (await listInstances()).filter(
    (instance) =>
      instance.workflowId === template.workflowId &&
      instance.initiatedBy === user.userId &&
      instance.status !== 'completed' &&
      instance.status !== 'cancelled',
  )

  const existing = mine[0]
  if (existing) {
    const open = (await listTasksForInstance(existing.instanceId)).find(
      (task) => !task.completedAt,
    )
    redirect(open ? `/tasks/${open.taskId}` : '/my-work')
  }

  const now = new Date()
  const outcome = startInstance(
    {
      template,
      initiatedBy: user.userId,
      title: `Practice run — ${user.name}`,
      projectId: template.projectId,
    },
    await buildEngineContext(template, now),
  )
  if (!outcome.ok) redirect('/help')

  const instance = await persistStart(outcome.result, now)
  const [first] = await listTasksForInstance(instance.instanceId)

  revalidatePath('/my-work')
  redirect(first ? `/tasks/${first.taskId}` : '/my-work')
}
