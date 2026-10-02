/**
 * The frame every signed-in page shares: the header and its navigation.
 *
 * It used to be drawn by each page, so a page's loading screen replaced it
 * along with everything else — every click between pages blanked the whole
 * window for as long as the next page took. As a layout it is drawn once and
 * stays put while the page beneath it loads.
 *
 * Each page still checks who is signed in and what they may do for itself:
 * this decides what the header shows, never what anybody may see.
 */

import { AppShell } from '@/features/shell/app-shell'
import { requireUser } from '@/lib/auth/dal'
import { countUnreadNotifications } from '@/lib/db/repositories/notifications'

export default async function SignedInLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser()
  const unread = await countUnreadNotifications(user.userId)

  return (
    <AppShell user={user} unread={unread}>
      {children}
    </AppShell>
  )
}
