/**
 * Entry point for `npm run reminders`. Sends deadline and overdue notices.
 *
 * Intended to be run on a timer — a cron entry, a Windows scheduled task or a
 * container sidecar, every fifteen minutes or so. Running it more often than
 * that is harmless; running it not at all is the only failure mode, because
 * nothing else in the platform notices a deadline passing.
 */

import { closeMongoClient } from '@/lib/db/client'
import { sendDueReminders } from '@/lib/workflow/send-reminders'

sendDueReminders()
  .then((run) => {
    console.log(
      `Examined ${run.examined} open task(s): ` +
        `${run.approaching} due soon, ${run.overdue} overdue.`,
    )
  })
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error)
    process.exitCode = 1
  })
  .finally(closeMongoClient)
