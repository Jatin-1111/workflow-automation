/** Data access for Major Projects. */

import { getCollection } from '../collection'
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
  return (await projects()).findOne({ projectId })
}

export async function listProjects(): Promise<Project[]> {
  return (await projects()).find().sort({ name: 1 }).toArray()
}
