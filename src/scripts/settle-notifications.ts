/**
 * Entry point for `npm run notifications:settle`. A one-off: marks read the
 * notifications about work that has since finished or moved to somebody
 * else. Running it again changes nothing.
 */

import { closeMongoClient } from '@/lib/db/client'
import { settleStaleNotifications } from '@/lib/workflow/settle-stale-notifications'

settleStaleNotifications()
  .then((run) => {
    console.log(`Checked ${run.tasks} task(s): marked ${run.settled} notification(s) read.`)
  })
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error)
    process.exitCode = 1
  })
  .finally(closeMongoClient)
