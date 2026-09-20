/** Data access for workflow templates. */

import { getCollection } from '../collection'
import { COLLECTIONS } from '../collections'
import type { ProjectId, WorkflowTemplateId } from '@/lib/types/ids'
import type { WorkflowTemplate } from '@/lib/types/workflow'

async function templates() {
  return getCollection<WorkflowTemplate>(COLLECTIONS.workflowTemplates)
}

export async function insertWorkflowTemplates(
  docs: WorkflowTemplate[],
): Promise<void> {
  if (docs.length === 0) return
  await (await templates()).insertMany(docs)
}

/**
 * The exact version an instance is pinned to.
 *
 * Running work must keep reading the process it started on, so this is the
 * lookup the engine's callers use (spec §38).
 */
export async function findTemplateVersion(
  workflowId: WorkflowTemplateId,
  version: number,
): Promise<WorkflowTemplate | null> {
  return (await templates()).findOne({ workflowId, version })
}

/** The newest active version, used when starting new work. */
export async function findLatestActiveTemplate(
  workflowId: WorkflowTemplateId,
): Promise<WorkflowTemplate | null> {
  return (await templates()).findOne(
    { workflowId, status: 'active' },
    { sort: { version: -1 } },
  )
}

export async function listActiveTemplates(
  projectId?: ProjectId,
): Promise<WorkflowTemplate[]> {
  const filter = projectId ? { status: 'active' as const, projectId } : { status: 'active' as const }
  return (await templates()).find(filter).sort({ name: 1 }).toArray()
}
