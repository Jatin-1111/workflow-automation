/** Data access for Major Projects. */

import { getCollection, WITHOUT_ID } from '../collection'
import { COLLECTIONS } from '../collections'
import type { ProjectId } from '@/lib/types/ids'
import type { Project } from '@/lib/types/project'

async function projects() {
  return getCollection<Project>(COLLECTIONS.projects)
}

export async function insertProjects(docs: Project[]): Promise<void> {
  if (docs.length === 0) return
  await (await projects()).insertMany(docs)
}

export async function findProjectById(projectId: ProjectId): Promise<Project | null> {
  return (await projects()).findOne({ projectId }, WITHOUT_ID)
}

export async function searchProjects(pattern: RegExp, limit = 10): Promise<Project[]> {
  return (await projects())
    .find({ $or: [{ name: pattern }, { description: pattern }] }, WITHOUT_ID)
    .limit(limit)
    .toArray()
}

export async function listProjects(): Promise<Project[]> {
  return (await projects()).find({}, WITHOUT_ID).sort({ name: 1 }).toArray()
}

export async function insertProject(doc: Project): Promise<void> {
  await (await projects()).insertOne(doc)
}

export async function updateProject(
  projectId: ProjectId,
  changes: Partial<Project>,
): Promise<void> {
  await (await projects()).updateOne(
    { projectId },
    { $set: { ...changes, updatedAt: new Date() } },
  )
}
