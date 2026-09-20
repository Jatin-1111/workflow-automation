/** Entry point for `npm run seed`. Orchestration only — logic lives in src/lib/seed. */

import { closeMongoClient } from '@/lib/db/client'
import { seed } from '@/lib/seed/run'

async function main() {
  const reset = process.argv.includes('--reset')
  const password = process.env.SEED_PASSWORD ?? 'orbit1234'

  const summary = await seed({ reset, password })

  console.log(reset ? 'Reseeded Business Orbit.' : 'Seeded Business Orbit.')
  console.table(summary)
  console.log(`\nAll demo users share the password: ${password}`)
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error)
    process.exitCode = 1
  })
  .finally(closeMongoClient)
