/**
 * The scheduler's way in, for hosts that call a URL on a timer rather than run
 * a command. `npm run reminders` does the same work from a shell.
 *
 * This is the one endpoint with no logged-in user behind it, so it authorises
 * against a shared secret instead. With no secret configured it refuses rather
 * than falls open: an unprotected endpoint that writes to everybody's inbox is
 * worse than a scheduler that is visibly not running.
 */

import { timingSafeEqual } from 'node:crypto'
import { NextResponse, type NextRequest } from 'next/server'
import { sendDueReminders } from '@/lib/workflow/send-reminders'

function presented(request: NextRequest): string | null {
  const header = request.headers.get('authorization')
  if (header?.startsWith('Bearer ')) return header.slice('Bearer '.length)
  // Some schedulers cannot set a header; a query parameter is the fallback.
  return request.nextUrl.searchParams.get('key')
}

function matches(supplied: string, expected: string): boolean {
  const a = Buffer.from(supplied)
  const b = Buffer.from(expected)
  // Compare lengths first: timingSafeEqual throws on a mismatch.
  return a.length === b.length && timingSafeEqual(a, b)
}

export async function GET(request: NextRequest) {
  const expected = process.env.CRON_SECRET
  if (!expected) {
    return NextResponse.json(
      { error: 'CRON_SECRET is not configured' },
      { status: 503 },
    )
  }

  const supplied = presented(request)
  if (!supplied || !matches(supplied, expected)) {
    return NextResponse.json({ error: 'Not authorised' }, { status: 401 })
  }

  const run = await sendDueReminders()
  return NextResponse.json(run)
}

export const dynamic = 'force-dynamic'
