/** A review wanted by the end of the working day, in round numbers. */
import { getDb, closeMongoClient } from '@/lib/db/client'
import { COLLECTIONS } from '@/lib/db/collections'

async function main() {
  const db = await getDb()
  await db.collection(COLLECTIONS.workflowTemplates).updateOne(
    { workflowId: 'BO-WFL-00001', 'stages.key': 'review' },
    { $set: { 'stages.$.dueInHours': 6 } },
  )
  // 17:00 IST today — comfortably inside the business day, and a whole
  // number of minutes, so nothing depends on a millisecond boundary.
  const dueAt = new Date('2026-09-28T11:30:00.000Z')
  const res = await db.collection(COLLECTIONS.tasks).updateMany(
    { stageKey: 'review', status: { $nin: ['completed', 'cancelled'] } },
    { $set: { dueAt } },
  )
  console.log('retimed:', res.modifiedCount, '->', dueAt.toISOString())
  await closeMongoClient()
}
main()
