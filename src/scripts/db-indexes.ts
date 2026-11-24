/** Entry point for `npm run db:indexes`. Applies index declarations. */

import { closeMongoClient } from '@/lib/db/client'
import { ensureIndexes } from '@/lib/db/indexes'

ensureIndexes()
  .then(() => console.log('Indexes applied.'))
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error)
    process.exitCode = 1
  })
  .finally(closeMongoClient)
