/** Data access for teams. */

import { getCollection, WITHOUT_ID } from '../collection'
import { COLLECTIONS } from '../collections'
import type { TeamId } from '@/lib/types/ids'
import type { Team } from '@/lib/types/organization'

async function teams() {
  return getCollection<Team>(COLLECTIONS.teams)
}

export async function insertTeams(docs: Team[]): Promise<void> {
  if (docs.length === 0) return
  await (await teams()).insertMany(docs)
}

export async function findTeamById(teamId: TeamId): Promise<Team | null> {
  return (await teams()).findOne({ teamId }, WITHOUT_ID)
}

export async function listTeams(): Promise<Team[]> {
  return (await teams()).find({}, WITHOUT_ID).sort({ name: 1 }).toArray()
}

export async function insertTeam(doc: Team): Promise<void> {
  await (await teams()).insertOne(doc)
}

export async function updateTeam(
  teamId: TeamId,
  changes: Partial<Team>,
): Promise<void> {
  await (await teams()).updateOne(
    { teamId },
    { $set: { ...changes, updatedAt: new Date() } },
  )
}

/** Remove a team outright. Callers check for references first. */
export async function deleteTeam(teamId: TeamId): Promise<void> {
  await (await teams()).deleteOne({ teamId })
}
