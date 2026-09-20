/**
 * Sequence allocation for entity ids.
 *
 * Sequences live in a dedicated `counters` collection and are advanced with a
 * single atomic `$inc`, so concurrent writers can never receive the same id.
 */

import { getDb } from '@/lib/db/client'
import { COLLECTIONS } from '@/lib/db/collections'
import { formatId } from './format'
import type { EntityId, EntityKind } from '@/lib/types/ids'

interface CounterDocument {
  _id: EntityKind
  sequence: number
}

/** Reserve `count` consecutive sequence numbers, returning the first. */
async function reserveSequence(kind: EntityKind, count: number): Promise<number> {
  const db = await getDb()
  const counter = await db
    .collection<CounterDocument>(COLLECTIONS.counters)
    .findOneAndUpdate(
      { _id: kind },
      { $inc: { sequence: count } },
      { upsert: true, returnDocument: 'after' },
    )

  if (!counter) {
    throw new Error(`Failed to reserve an id sequence for "${kind}"`)
  }
  // `sequence` is the value *after* the increment, so the block starts here.
  return counter.sequence - count + 1
}

/** Allocate the next id for an entity kind. */
export async function nextId<K extends EntityKind>(kind: K): Promise<EntityId<K>> {
  return formatId(kind, await reserveSequence(kind, 1))
}

/** Allocate `count` consecutive ids in one round trip. Used by seeds and imports. */
export async function nextIds<K extends EntityKind>(
  kind: K,
  count: number,
): Promise<EntityId<K>[]> {
  if (count < 1) return []
  const start = await reserveSequence(kind, count)
  return Array.from({ length: count }, (_, offset) => formatId(kind, start + offset))
}
