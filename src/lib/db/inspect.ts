/**
 * What `npm run db:inspect` says about a database.
 *
 * Pure: the script gathers the numbers, this decides how they are named and
 * shown. Kept apart so the part that matters most - never printing the
 * credentials in a connection string - can be tested without a database.
 *
 * Deliberately metadata only. Counts and dates tell you whether a database is
 * empty, seeded with demo data, or carrying real activity; they do not put any
 * person's name, email, comment or file into a terminal or a transcript.
 */

/** Fields that record when something happened, across every collection. */
export const TIMESTAMP_FIELDS = [
  'createdAt',
  'updatedAt',
  'at',
  'uploadedAt',
  'startedAt',
  'completedAt',
] as const

export interface CollectionSummary {
  name: string
  documents: number
  /** The latest timestamp any document carries, or null when there is none. */
  newest: Date | null
}

/**
 * `host / database`, with nothing that could open the database.
 *
 * Only the host list is kept. The username, password and options are dropped,
 * and an address that cannot be read cleanly is not echoed back at all: a
 * half-parsed string is exactly how a password ends up in a log.
 */
export function redactedTarget(uri: string, databaseName: string): string {
  const match = /^mongodb(?:\+srv)?:\/\/(?:[^/?]*@)?([^/?@]+)/.exec(uri)
  const hosts = match?.[1]
  const readable =
    hosts !== undefined &&
    hosts.split(',').every((host) => /^[\w.-]+(:\d{1,5})?$/.test(host))
  return readable ? `${hosts} / ${databaseName}` : `(unreadable address) / ${databaseName}`
}

/** The latest of the timestamp fields present, ignoring anything not a date. */
export function newestTimestamp(
  latest: Record<string, unknown> | null | undefined,
): Date | null {
  if (!latest) return null
  let newest: Date | null = null
  for (const field of TIMESTAMP_FIELDS) {
    const value = latest[field]
    if (!(value instanceof Date) || Number.isNaN(value.getTime())) continue
    if (!newest || value.getTime() > newest.getTime()) newest = value
  }
  return newest
}

const DAY_MS = 24 * 60 * 60 * 1000

function age(then: Date, now: Date): string {
  const days = Math.floor((now.getTime() - then.getTime()) / DAY_MS)
  if (days <= 0) return 'today'
  return `${days} day${days === 1 ? '' : 's'} ago`
}

export function renderReport(
  target: string,
  rows: readonly CollectionSummary[],
  now: Date,
): string {
  const lines = [`Database: ${target}`, '']

  if (rows.length === 0) {
    lines.push('No collections found in this database.')
  } else {
    const nameWidth = Math.max('Collection'.length, ...rows.map((row) => row.name.length))
    const countWidth = Math.max(
      'Documents'.length,
      ...rows.map((row) => String(row.documents).length),
    )
    lines.push(
      `${'Collection'.padEnd(nameWidth)}  ${'Documents'.padStart(countWidth)}  Newest activity`,
    )
    for (const row of rows) {
      const newest = row.newest
        ? `${row.newest.toISOString().slice(0, 10)} (${age(row.newest, now)})`
        : 'none'
      lines.push(
        `${row.name.padEnd(nameWidth)}  ${String(row.documents).padStart(countWidth)}  ${newest}`,
      )
    }
    const total = rows.reduce((sum, row) => sum + row.documents, 0)
    lines.push('', `Total documents: ${total}`)
  }

  lines.push('', 'Counts and dates only; no document contents are read or shown.')
  return lines.join('\n')
}
