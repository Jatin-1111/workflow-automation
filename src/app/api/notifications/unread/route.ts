/**
 * How many unread notifications the signed-in person has, for the bell.
 *
 * The header is drawn once by the signed-in layout so it survives
 * navigation, which means it is not redrawn on the server when somebody
 * moves between pages. The bell asks here instead, after each move, so its
 * number keeps up the way it did when every page drew its own header.
 */

import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/dal'
import { countUnreadNotifications } from '@/lib/db/repositories/notifications'

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })

  const unread = await countUnreadNotifications(user.userId)
  return NextResponse.json(
    { unread },
    // A count belongs to one person at one moment; nothing may keep it.
    { headers: { 'Cache-Control': 'private, no-store' } },
  )
}
