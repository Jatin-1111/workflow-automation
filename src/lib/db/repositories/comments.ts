/** Data access for instance comments (spec §40). */

import { getCollection, WITHOUT_ID } from '../collection'
import { COLLECTIONS } from '../collections'
import type { WorkflowInstanceId } from '@/lib/types/ids'
import type { Comment } from '@/lib/types/comment'

async function comments() {
  return getCollection<Comment>(COLLECTIONS.comments)
}

export async function insertComment(doc: Comment): Promise<void> {
  await (await comments()).insertOne(doc)
}

/** Comments stay with the workflow, not with one stage (spec §40). */
export async function listCommentsForInstance(
  instanceId: WorkflowInstanceId,
): Promise<Comment[]> {
  return (await comments()).find({ instanceId }, WITHOUT_ID).sort({ createdAt: 1 }).toArray()
}
