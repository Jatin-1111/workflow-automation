/** Data access for workflow instances. */

import { getCollection, WITHOUT_ID } from '../collection'
import { COLLECTIONS } from '../collections'
import type { ProjectId, UserId, WorkflowInstanceId } from '@/lib/types/ids'
import type { WorkflowInstance } from '@/lib/types/instance'

async function instances() {
  return getCollection<WorkflowInstance>(COLLECTIONS.workflowInstances)
}

export async function insertInstance(doc: WorkflowInstance): Promise<void> {
  await (await instances()).insertOne(doc)
}

export async function replaceInstance(doc: WorkflowInstance): Promise<void> {
  await (await instances()).replaceOne({ instanceId: doc.instanceId }, doc)
}

export async function findInstanceById(
  instanceId: WorkflowInstanceId,
): Promise<WorkflowInstance | null> {
  return (await instances()).findOne({ instanceId }, WITHOUT_ID)
}

export async function findInstancesByIds(
  instanceIds: WorkflowInstanceId[],
): Promise<WorkflowInstance[]> {
  if (instanceIds.length === 0) return []
  return (await instances()).find({ instanceId: { $in: instanceIds } }, WITHOUT_ID).toArray()
}

export async function listInstances(filter?: {
  projectId?: ProjectId
  status?: WorkflowInstance['status']
}): Promise<WorkflowInstance[]> {
  return (await instances())
    .find({ ...filter }, WITHOUT_ID)
    .sort({ startedAt: -1 })
    .toArray()
}

/**
 * Instances a person started but is not currently working on.
 *
 * Feeds the Waiting section of My Work: work someone raised that now sits with
 * a colleague (spec §15).
 */
export async function listInstancesStartedBy(
  initiatedBy: UserId,
  status: WorkflowInstance['status'][] = ['active', 'pending_approval'],
): Promise<WorkflowInstance[]> {
  return (await instances())
    .find({ initiatedBy, status: { $in: status } }, WITHOUT_ID)
    .sort({ startedAt: -1 })
    .toArray()
}
