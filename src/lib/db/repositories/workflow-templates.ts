/** Data access for workflow templates. */

import { getCollection, WITHOUT_ID } from '../collection'
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
  return (await templates()).findOne({ workflowId, version }, WITHOUT_ID)
}

/** The newest active version, used when starting new work. */
export async function findLatestActiveTemplate(
  workflowId: WorkflowTemplateId,
): Promise<WorkflowTemplate | null> {
  return (await templates()).findOne(
    { workflowId, status: 'active' },
    { sort: { version: -1 }, ...WITHOUT_ID },
  )
}

/** Every version of every workflow, newest version first (spec §45). */
export async function listAllTemplates(): Promise<WorkflowTemplate[]> {
  return (await templates()).find({}, WITHOUT_ID).sort({ name: 1, version: -1 }).toArray()
}

export async function listVersionsOf(
  workflowId: WorkflowTemplateId,
): Promise<WorkflowTemplate[]> {
  return (await templates()).find({ workflowId }, WITHOUT_ID).sort({ version: -1 }).toArray()
}

export async function insertTemplate(doc: WorkflowTemplate): Promise<void> {
  await (await templates()).insertOne(doc)
}

/**
 * Overwrite one version in place.
 *
 * Only ever called for a draft: once a version is active, instances are
 * pinned to it and changing it would rewrite a process already running.
 */
export async function replaceTemplateVersion(doc: WorkflowTemplate): Promise<void> {
  await (await templates()).replaceOne(
    { workflowId: doc.workflowId, version: doc.version },
    doc,
  )
}

export async function setTemplateStatus(
  workflowId: WorkflowTemplateId,
  version: number,
  status: WorkflowTemplate['status'],
): Promise<void> {
  await (await templates()).updateOne(
    { workflowId, version },
    { $set: { status, updatedAt: new Date() } },
  )
}

/** Retire every other version, so exactly one is active at a time. */
export async function retireOtherVersions(
  workflowId: WorkflowTemplateId,
  keepVersion: number,
): Promise<void> {
  await (await templates()).updateMany(
    { workflowId, version: { $ne: keepVersion }, status: 'active' },
    { $set: { status: 'inactive', updatedAt: new Date() } },
  )
}

export async function highestVersion(
  workflowId: WorkflowTemplateId,
): Promise<number> {
  const latest = await (await templates()).findOne(
    { workflowId },
    { sort: { version: -1 }, ...WITHOUT_ID },
  )
  return latest?.version ?? 0
}

export async function deleteTemplateVersion(
  workflowId: WorkflowTemplateId,
  version: number,
): Promise<void> {
  await (await templates()).deleteOne({ workflowId, version, status: 'draft' })
}

export async function searchTemplates(
  pattern: RegExp,
  limit = 10,
): Promise<WorkflowTemplate[]> {
  return (await templates())
    .find({ status: 'active', $or: [{ name: pattern }, { description: pattern }] }, WITHOUT_ID)
    .limit(limit)
    .toArray()
}

export async function listActiveTemplates(
  projectId?: ProjectId,
): Promise<WorkflowTemplate[]> {
  const filter = projectId ? { status: 'active' as const, projectId } : { status: 'active' as const }
  return (await templates()).find(filter, WITHOUT_ID).sort({ name: 1 }).toArray()
}
