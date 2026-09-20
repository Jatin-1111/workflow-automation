/** Data access for the append-only instance timeline (spec §33). */

import { getCollection } from '../collection'
import { COLLECTIONS } from '../collections'
import type { WorkflowInstanceId } from '@/lib/types/ids'
import type { TimelineEvent } from '@/lib/types/timeline'

async function events() {
  return getCollection<TimelineEvent>(COLLECTIONS.timelineEvents)
}

/** Append only. Timeline history is never updated or deleted. */
export async function appendTimelineEvents(docs: TimelineEvent[]): Promise<void> {
  if (docs.length === 0) return
  await (await events()).insertMany(docs)
}

export async function listTimelineForInstance(
  instanceId: WorkflowInstanceId,
): Promise<TimelineEvent[]> {
  return (await events()).find({ instanceId }).sort({ at: 1 }).toArray()
}
