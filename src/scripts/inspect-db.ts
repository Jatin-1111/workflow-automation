/**
 * Entry point for `npm run db:inspect`.
 *
 * Says what is in whichever database MONGODB_URI points at: which collections
 * exist, how many documents each holds, and when each was last touched. Meant
 * for answering "is this the demo data or the real thing" against a deployed
 * database, so it is read-only by construction: it lists collections, counts
 * them from metadata, and takes the latest timestamp. It never reads a
 * document's contents and never writes.
 *
 * Point it at another database for one run, in your own shell, so the
 * credentials never go anywhere but your terminal:
 *
 *   $env:MONGODB_URI = '<connection string>'; npm run db:inspect
 */

import { closeMongoClient, getDb } from '@/lib/db/client'
import {
  newestTimestamp,
  redactedTarget,
  renderReport,
  TIMESTAMP_FIELDS,
  type CollectionSummary,
} from '@/lib/db/inspect'

/** One `$max` per timestamp field: dates come back, nothing else does. */
const NEWEST = Object.fromEntries(
  TIMESTAMP_FIELDS.map((field) => [field, { $max: `$${field}` }]),
)

async function inspect(): Promise<string> {
  const db = await getDb()
  const collections = await db.listCollections({}, { nameOnly: true }).toArray()

  const rows: CollectionSummary[] = []
  for (const { name } of collections.sort((a, b) => a.name.localeCompare(b.name))) {
    if (name.startsWith('system.')) continue
    const collection = db.collection(name)
    const documents = await collection.estimatedDocumentCount()
    const [latest] = await collection
      .aggregate([{ $group: { _id: null, ...NEWEST } }], { maxTimeMS: 15_000 })
      .toArray()
    rows.push({ name, documents, newest: newestTimestamp(latest) })
  }

  return renderReport(
    redactedTarget(process.env.MONGODB_URI ?? '', db.databaseName),
    rows,
    new Date(),
  )
}

inspect()
  .then((report) => console.log(report))
  .catch((error: unknown) => {
    // The driver's messages can quote the address it tried; print only the
    // reason, never the string it was given.
    console.error(error instanceof Error ? error.name : 'Could not inspect the database.')
    process.exitCode = 1
  })
  .finally(closeMongoClient)
