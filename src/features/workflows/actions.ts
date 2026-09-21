'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { requireCapability } from '@/lib/auth/dal'
import { nextId } from '@/lib/ids/generate'
import { isEntityId } from '@/lib/ids/format'
import { listRoles } from '@/lib/db/repositories/roles'
import {
  deleteTemplateVersion,
  findTemplateVersion,
  highestVersion,
  insertTemplate,
  listVersionsOf,
  replaceTemplateVersion,
  retireOtherVersions,
  setTemplateStatus,
} from '@/lib/db/repositories/workflow-templates'
import { listInstances } from '@/lib/db/repositories/workflow-instances'
import { validateTemplate } from '@/lib/workflow/template-validation'
import type { DepartmentId, ProjectId, RoleId, WorkflowTemplateId } from '@/lib/types/ids'
import type { StageDefinition, WorkflowTemplate } from '@/lib/types/workflow'

export type BuilderState =
  | { ok: null }
  | { ok: true; message: string }
  | { ok: false; message: string; problems?: string[] }

function fail(message: string, problems?: string[]): BuilderState {
  return { ok: false, message, problems }
}

/** The first stage a brand new workflow gets, so the editor is never empty. */
function startingStage(): StageDefinition {
  return {
    key: 'first_stage',
    name: 'First stage',
    instructions: '',
    assignees: [{ mode: 'initiator' }],
    completionRule: 'any',
    fields: [],
    files: [],
    checklist: [],
    priority: 'medium',
    requiresApproval: false,
    nextStageKey: null,
  }
}

/** Create a new workflow as a draft (spec §35). */
export async function createWorkflowAction(
  _previous: BuilderState,
  formData: FormData,
): Promise<BuilderState> {
  const admin = await requireCapability('admin.manage_workflows')

  const name = String(formData.get('name') ?? '').trim()
  if (!name) return fail('Give the workflow a name.')

  const rawProject = String(formData.get('projectId') ?? '')
  const projectId = isEntityId(rawProject, 'project') ? (rawProject as ProjectId) : undefined

  const now = new Date()
  const workflowId = await nextId('workflowTemplate')

  await insertTemplate({
    workflowId,
    version: 1,
    name,
    description: String(formData.get('description') ?? '').trim() || undefined,
    projectId,
    stages: [startingStage()],
    initialStageKey: 'first_stage',
    status: 'draft',
    createdBy: admin.userId,
    createdAt: now,
    updatedAt: now,
  })

  revalidatePath('/workflows')
  redirect(`/workflows/${workflowId}/1`)
}

/** Everything the editor sends back, as the shape the template stores. */
interface SubmittedTemplate {
  name: string
  description?: string
  projectId?: string
  departmentId?: string
  stages: StageDefinition[]
  initialStageKey: string
}

function parseSubmission(formData: FormData): SubmittedTemplate | null {
  const raw = formData.get('template')
  if (typeof raw !== 'string') return null
  try {
    return JSON.parse(raw) as SubmittedTemplate
  } catch {
    return null
  }
}

/**
 * Narrow what arrived from the browser to roles that actually exist.
 *
 * The editor posts a whole template document, so every id in it is untrusted
 * until checked against the database.
 */
async function withKnownRoles(stages: StageDefinition[]): Promise<StageDefinition[]> {
  const known = new Set((await listRoles()).map((role) => role.roleId))

  return stages.map((stage) => ({
    ...stage,
    assignees: stage.assignees.filter((source) =>
      source.mode === 'role' ? known.has(source.roleId as RoleId) : true,
    ),
  }))
}

async function loadEditableDraft(
  workflowId: string,
  version: number,
): Promise<WorkflowTemplate | { error: BuilderState }> {
  if (!isEntityId(workflowId, 'workflowTemplate')) {
    return { error: fail('That workflow could not be identified.') }
  }

  const template = await findTemplateVersion(workflowId as WorkflowTemplateId, version)
  if (!template) return { error: fail('That workflow version no longer exists.') }

  // A published version is what running work is pinned to, so it is read-only
  // and changes go into a new version instead (spec §38).
  if (template.status !== 'draft') {
    return {
      error: fail('Published versions cannot be edited. Create a new version instead.'),
    }
  }
  return template
}

/** Save a draft, reporting every problem without blocking the save. */
export async function saveWorkflowAction(
  _previous: BuilderState,
  formData: FormData,
): Promise<BuilderState> {
  await requireCapability('admin.manage_workflows')

  const workflowId = String(formData.get('workflowId') ?? '')
  const version = Number(formData.get('version') ?? 0)
  const loaded = await loadEditableDraft(workflowId, version)
  if ('error' in loaded) return loaded.error

  const submitted = parseSubmission(formData)
  if (!submitted) return fail('The workflow could not be read. Try saving again.')

  const stages = await withKnownRoles(submitted.stages)

  await replaceTemplateVersion({
    ...loaded,
    name: submitted.name.trim(),
    description: submitted.description?.trim() || undefined,
    projectId: isEntityId(String(submitted.projectId ?? ''), 'project')
      ? (submitted.projectId as ProjectId)
      : undefined,
    departmentId: isEntityId(String(submitted.departmentId ?? ''), 'department')
      ? (submitted.departmentId as DepartmentId)
      : undefined,
    stages,
    initialStageKey: submitted.initialStageKey,
    updatedAt: new Date(),
  })

  revalidatePath(`/workflows/${workflowId}/${version}`)
  revalidatePath('/workflows')

  // A draft is allowed to be incomplete; publishing is what demands soundness.
  const problems = validateTemplate({
    name: submitted.name,
    stages,
    initialStageKey: submitted.initialStageKey,
  })

  return problems.length === 0
    ? { ok: true, message: 'Saved. This draft is ready to publish.' }
    : {
        ok: true,
        message: `Saved as a draft with ${problems.length} thing${problems.length === 1 ? '' : 's'} still to fix.`,
      }
}

/** Publish a draft so new work starts using it (spec §35, §38). */
export async function publishWorkflowAction(
  _previous: BuilderState,
  formData: FormData,
): Promise<BuilderState> {
  await requireCapability('admin.manage_workflows')

  const workflowId = String(formData.get('workflowId') ?? '')
  const version = Number(formData.get('version') ?? 0)
  const loaded = await loadEditableDraft(workflowId, version)
  if ('error' in loaded) return loaded.error

  const problems = validateTemplate({
    name: loaded.name,
    stages: loaded.stages,
    initialStageKey: loaded.initialStageKey,
  })
  if (problems.length > 0) {
    return fail(
      'This workflow cannot be published yet.',
      problems.map((problem) => problem.message),
    )
  }

  await setTemplateStatus(loaded.workflowId, version, 'active')
  await retireOtherVersions(loaded.workflowId, version)

  revalidatePath(`/workflows/${workflowId}/${version}`)
  revalidatePath('/workflows')
  return { ok: true, message: `Version ${version} is live. New work will use it.` }
}

/**
 * Copy the current version into a new draft (spec §38).
 *
 * Editing a published process means writing the next version of it; work
 * already running keeps following the version it started on.
 */
export async function createVersionAction(
  _previous: BuilderState,
  formData: FormData,
): Promise<BuilderState> {
  const admin = await requireCapability('admin.manage_workflows')

  const workflowId = String(formData.get('workflowId') ?? '')
  if (!isEntityId(workflowId, 'workflowTemplate')) {
    return fail('That workflow could not be identified.')
  }

  const versions = await listVersionsOf(workflowId as WorkflowTemplateId)
  const existingDraft = versions.find((version) => version.status === 'draft')
  if (existingDraft) {
    redirect(`/workflows/${workflowId}/${existingDraft.version}`)
  }

  const source = versions[0]
  if (!source) return fail('That workflow no longer exists.')

  const version = (await highestVersion(workflowId as WorkflowTemplateId)) + 1
  const now = new Date()

  await insertTemplate({
    ...source,
    version,
    status: 'draft',
    createdBy: admin.userId,
    createdAt: now,
    updatedAt: now,
  })

  revalidatePath('/workflows')
  redirect(`/workflows/${workflowId}/${version}`)
}

/** Take a workflow out of use without deleting its history. */
export async function retireWorkflowAction(formData: FormData): Promise<void> {
  await requireCapability('admin.manage_workflows')

  const workflowId = String(formData.get('workflowId') ?? '')
  const version = Number(formData.get('version') ?? 0)
  if (!isEntityId(workflowId, 'workflowTemplate')) return

  await setTemplateStatus(workflowId as WorkflowTemplateId, version, 'inactive')
  revalidatePath('/workflows')
}

/**
 * Discard a draft.
 *
 * Only ever a draft, and only when nothing runs on it - a published version is
 * part of the record of work that has already happened.
 */
export async function discardDraftAction(formData: FormData): Promise<void> {
  await requireCapability('admin.manage_workflows')

  const workflowId = String(formData.get('workflowId') ?? '')
  const version = Number(formData.get('version') ?? 0)
  if (!isEntityId(workflowId, 'workflowTemplate')) return

  const running = await listInstances()
  const inUse = running.some(
    (instance) =>
      instance.workflowId === workflowId && instance.templateVersion === version,
  )
  if (inUse) return

  await deleteTemplateVersion(workflowId as WorkflowTemplateId, version)
  revalidatePath('/workflows')
  redirect('/workflows')
}
