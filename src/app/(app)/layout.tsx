/**
 * The frame every signed-in page shares: the header, its navigation, and the
 * one container the page sits in.
 *
 * It used to be drawn by each page, so a page's loading screen replaced it
 * along with everything else — every click between pages blanked the whole
 * window for as long as the next page took. As a layout it is drawn once and
 * stays put while the page beneath it loads.
 *
 * The container is here too, and only here. Each page used to choose its own
 * width and centre itself — 768, 896, 1024, 1152 or 1280px — so left edges
 * wandered from page to page and nothing lined up with the logo above. Now
 * every page starts at the same edge; a page that reads better narrow (a
 * list of notifications, a search) limits its own content and stays
 * left-aligned inside.
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
      <main id="main" className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
        {children}
      </main>
    </AppShell>
  )
}
