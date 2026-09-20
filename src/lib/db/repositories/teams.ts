/** Data access for teams. */

import { getCollection } from '../collection'
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
  return (await teams()).findOne({ teamId })
}

export async function listTeams(): Promise<Team[]> {
  return (await teams()).find().sort({ name: 1 }).toArray()
}
