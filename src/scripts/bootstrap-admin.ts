/**
 * Create the first administrator on an empty database.
 *
 * Seeding is for demonstrations: it invents an organisation and gives every
 * account the same known password. A real deployment starts with one person
 * who can sign in, and builds the rest through Admin.
 *
 * Refuses if anybody already exists, so it cannot be used to mint a second
 * administrator on a live system — that is what the Admin screens are for.
 *
 *   ADMIN_NAME="Nitin" ADMIN_EMAIL="nitin@example.com" ADMIN_PASSWORD="…" \
 *     npm run bootstrap:admin
 */

import { closeMongoClient } from '@/lib/db/client'
import { hashPassword } from '@/lib/auth/password'
import { ensureIndexes } from '@/lib/db/indexes'
import { nextId } from '@/lib/ids/generate'
import { countUsers, insertUser } from '@/lib/db/repositories/users'

const MIN_PASSWORD = 8

async function main() {
  const name = process.env.ADMIN_NAME?.trim()
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase()
  const password = process.env.ADMIN_PASSWORD

  if (!name) throw new Error('ADMIN_NAME is required.')
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('ADMIN_EMAIL is required and must be an email address.')
  }
  if (!password || password.length < MIN_PASSWORD) {
    throw new Error(
      `ADMIN_PASSWORD is required and must be at least ${MIN_PASSWORD} characters. ` +
        'Choose it yourself: there is no way to change a password from inside the app yet.',
    )
  }

  const existing = await countUsers()
  if (existing > 0) {
    throw new Error(
      `This database already has ${existing} user(s). ` +
        'Add further people through Admin rather than this script.',
    )
  }

  // A fresh database has no indexes; the queries behind My Work assume them.
  await ensureIndexes()

  const now = new Date()
  const userId = await nextId('user')
  await insertUser({
    userId,
    name,
    email,
    roleIds: [],
    accessLevel: 'admin',
    status: 'active',
    passwordHash: await hashPassword(password),
    createdAt: now,
    updatedAt: now,
  })

  console.log(`Created ${name} <${email}> as ${userId} (administrator).`)
  console.log(
    'Sign in, then build the organisation in Admin: departments, teams, ' +
      'projects, workflow roles, people. Workflows come after the roles exist.',
  )
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error)
    process.exitCode = 1
  })
  .finally(closeMongoClient)
