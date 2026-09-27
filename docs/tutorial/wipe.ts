/** Wipe to an empty database, for capturing a fresh install. */
import { getDb, closeMongoClient } from '@/lib/db/client'
import { COLLECTIONS } from '@/lib/db/collections'

async function main() {
  const db = await getDb()
  const names = Object.values(COLLECTIONS)
  const before: Record<string, number> = {}
  for (const name of names) before[name] = await db.collection(name).countDocuments()
  await Promise.all(names.map((name) => db.collection(name).deleteMany({})))
  console.log('wiped:', Object.entries(before).filter(([, n]) => n > 0).map(([k, n]) => `${k}=${n}`).join(' '))
  await closeMongoClient()
}
main()
