/**
 * Typed collection accessor.
 *
 * Domain types stay storage-agnostic: documents carry their own `BO-XXX-00000`
 * id as an indexed field and let MongoDB own `_id`, so nothing outside this
 * directory ever handles an ObjectId.
 */

import type { Collection, Document } from 'mongodb'
import { getDb } from './client'
import type { CollectionName } from './collections'

/**
 * Projection that leaves Mongo's `_id` behind.
 *
 * Domain types do not declare `_id`, so a document carrying one type-checks
 * fine and then fails at runtime - spreading it into an insert collides, and
 * passing it to a client component is rejected by React. Excluding it on read
 * is what makes "nothing outside this directory handles an ObjectId" true
 * rather than merely intended.
 */
export const WITHOUT_ID = { projection: { _id: 0 } } as const

export async function getCollection<T extends Document>(
  name: CollectionName,
): Promise<Collection<T>> {
  const db = await getDb()
  return db.collection<T>(name)
}
