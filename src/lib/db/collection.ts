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

export async function getCollection<T extends Document>(
  name: CollectionName,
): Promise<Collection<T>> {
  const db = await getDb()
  return db.collection<T>(name)
}
