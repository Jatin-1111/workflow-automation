/** Data access for the append-only instance timeline (spec §33). */

import { getCollection, WITHOUT_ID } from '../collection'
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

/** Every event, for reporting. Read only by the metrics layer. */
export async function listAllTimelineEvents(): Promise<TimelineEvent[]> {
  return (await events()).find({}, WITHOUT_ID).toArray()
}

export async function listTimelineForInstance(
  instanceId: WorkflowInstanceId,
): Promise<TimelineEvent[]> {
  return (await events()).find({ instanceId }, WITHOUT_ID).sort({ at: 1 }).toArray()
}
