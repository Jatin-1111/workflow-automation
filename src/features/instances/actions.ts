'use server'

/**
 * Starting a run of a workflow (spec §21).
 *
 * The moment the platform is for: instead of messaging a colleague, somebody
 * raises the work here and the process takes it from there.
 */

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { requireUser } from '@/lib/auth/dal'
import { isEntityId } from '@/lib/ids/format'
import { listProjects } from '@/lib/db/repositories/projects'
import { startWorkflow } from '@/lib/workflow/service'
import type { ProjectId, WorkflowTemplateId } from '@/lib/types/ids'

export type StartActionState =
  | { ok: false; message: string }
  | { ok: null }

export async function startWorkflowAction(
  _previous: StartActionState,
  formData: FormData,
): Promise<StartActionState> {
  const user = await requireUser()

  const workflowId = String(formData.get('workflowId') ?? '')
  if (!isEntityId(workflowId, 'workflowTemplate')) {
    return { ok: false, message: 'Choose a workflow to start.' }
  }

  const title = String(formData.get('title') ?? '').trim()
  if (!title || title.length > 120) {
    return {
      ok: false,
      message: 'Give this run a name — the client, the episode, the vendor.',
    }
  }

  // Only a project that exists, whatever the form submitted.
  const rawProject = String(formData.get('projectId') ?? '').trim()
  let projectId: ProjectId | undefined
  if (rawProject) {
    const known = await listProjects()
    projectId = known.find((project) => project.projectId === rawProject)?.projectId
  }

  const outcome = await startWorkflow({
    workflowId: workflowId as WorkflowTemplateId,
    initiatedBy: user.userId,
    title,
    projectId,
  })

  if (!outcome.ok) {
    return { ok: false, message: outcome.errors.map((e) => e.message).join(' ') }
  }

  revalidatePath('/my-work')
  revalidatePath('/dashboard')
  revalidatePath('/projects')

  // Straight to the first task: the person who raised it usually does the
  // first stage, and landing on a list would make them hunt for their own work.
  redirect(outcome.firstTaskId ? `/tasks/${outcome.firstTaskId}` : '/my-work')
}
