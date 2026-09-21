/** Data access for versioned file records (spec §39). */

import { getCollection, WITHOUT_ID } from '../collection'
import { COLLECTIONS } from '../collections'
import type { FileId, WorkflowInstanceId } from '@/lib/types/ids'
import type { FileRecord } from '@/lib/types/file'

async function files() {
  return getCollection<FileRecord>(COLLECTIONS.files)
}

export async function insertFile(doc: FileRecord): Promise<void> {
  await (await files()).insertOne(doc)
}

export async function findFileById(fileId: FileId): Promise<FileRecord | null> {
  return (await files()).findOne({ fileId }, WITHOUT_ID)
}

export async function searchFiles(pattern: RegExp, limit = 20): Promise<FileRecord[]> {
  return (await files())
    .find({ name: pattern }, WITHOUT_ID)
    .sort({ uploadedAt: -1 })
    .limit(limit)
    .toArray()
}

export async function listFilesForInstance(
  instanceId: WorkflowInstanceId,
): Promise<FileRecord[]> {
  return (await files()).find({ instanceId }, WITHOUT_ID).sort({ uploadedAt: 1 }).toArray()
}

/** Next version number for a slot within an instance: v1, v2, v3... */
export async function nextVersionForSlot(
  instanceId: WorkflowInstanceId,
  slotKey: string | undefined,
): Promise<number> {
  const latest = await (await files()).findOne(
    { instanceId, slotKey },
    { sort: { version: -1 }, ...WITHOUT_ID },
  )
  return (latest?.version ?? 0) + 1
}

export async function markFileFinalApproved(fileId: FileId): Promise<void> {
  await (await files()).updateOne({ fileId }, { $set: { isFinalApproved: true } })
}
