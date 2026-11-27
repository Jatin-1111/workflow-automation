/**
 * The frame every signed-in page shares: the sidebar, its navigation, and the
 * one container the page sits in.
 *
 * It used to be drawn by each page, so a page's loading screen replaced it
 * along with everything else — every click between pages blanked the whole
 * window for as long as the next page took. As a layout it is drawn once and
 * stays put while the page beside it loads.
 *
 * The container is here too, and only here. Each page used to choose its own
 * width and centre itself, so left edges wandered from page to page. Now every
 * page starts at the same edge, right of the sidebar; a page that reads better
 * narrow (a list of notifications, a search) limits its own content and stays
 * left-aligned inside.
 *
 * Each page still checks who is signed in and what they may do for itself:
 * this decides what the sidebar shows, never what anybody may see.
 */

import { AppShell } from '@/features/shell/app-shell'
import { requireUser } from '@/lib/auth/dal'
import { readSession } from '@/lib/auth/session'
import { countUnreadNotifications } from '@/lib/db/repositories/notifications'

export default async function SignedInLayout({ children }: { children: React.ReactNode }) {
  // The session cookie already names the user, so the unread count does not
  // have to wait for the user lookup: both reads go out together instead of
  // costing two database round trips in a row on every navigation.
  const session = await readSession()
  const [user, unread] = await Promise.all([
    requireUser(),
    session ? countUnreadNotifications(session.userId) : Promise.resolve(0),
  ])

  return (
    <AppShell user={user} unread={unread}>
      <main id="main" className="w-full max-w-[84rem] px-4 py-6 sm:px-8 sm:py-9 lg:px-10">
        {children}
      </main>
    </AppShell>
  )
}
