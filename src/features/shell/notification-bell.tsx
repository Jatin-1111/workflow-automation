'use client'

/**
 * The bell, with its unread count kept current.
 *
 * Starts from the count the server worked out when the header was drawn,
 * then asks again after every navigation and whenever the window comes back
 * into focus: the header no longer redraws on the server per page, and a
 * number that only changed on a full reload would be worse than none.
 */

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Bell } from 'lucide-react'
import { motion } from 'motion/react'
import { DURATION, EASE } from '@/features/ui/motion'
import { NOTIFICATIONS_CHANGED } from '@/features/notifications/events'

export function NotificationBell({
  initialUnread,
  labelled = false,
}: {
  initialUnread: number
  /** A row in the sidebar with its name, instead of an icon on its own. */
  labelled?: boolean
}) {
  const pathname = usePathname()
  const [unread, setUnread] = useState(initialUnread)
  const here = pathname === '/notifications'

  useEffect(() => {
    let cancelled = false
    const refresh = async () => {
      try {
        const response = await fetch('/api/notifications/unread', { cache: 'no-store' })
        if (!response.ok) return
        const body = (await response.json()) as { unread?: number }
        if (!cancelled && typeof body.unread === 'number') setUnread(body.unread)
      } catch {
        // Offline or mid-deploy: keep the last number rather than guess.
      }
    }
    void refresh()
    window.addEventListener('focus', refresh)
    // The notifications page says when it has refreshed or read something.
    window.addEventListener(NOTIFICATIONS_CHANGED, refresh)
    return () => {
      cancelled = true
      window.removeEventListener('focus', refresh)
      window.removeEventListener(NOTIFICATIONS_CHANGED, refresh)
    }
  }, [pathname])

  if (labelled) {
    return (
      <Link
        href="/notifications"
        aria-current={here ? 'page' : undefined}
        className={`transition-ui relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium active:scale-[0.98] lg:group-data-[sidebar=rail]/shell:justify-center lg:group-data-[sidebar=rail]/shell:px-0 ${
          here
            ? 'bg-sidebar-hover text-foreground'
            : 'text-muted hover:bg-sidebar-hover hover:text-foreground'
        }`}
      >
        <span aria-hidden className="flex w-3 shrink-0 justify-center lg:group-data-[sidebar=rail]/shell:w-auto [&>svg]:shrink-0">
          <Bell size={16} strokeWidth={1.75} />
        </span>
        <span className="lg:group-data-[sidebar=rail]/shell:sr-only">Notifications</span>
        {unread > 0 ? (
          <motion.span
            key={unread}
            initial={{ scale: 0.85, opacity: 0.6 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: DURATION.base, ease: EASE }}
            className="ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1.5 text-xs font-semibold tabular-nums text-white lg:group-data-[sidebar=rail]/shell:absolute lg:group-data-[sidebar=rail]/shell:right-1 lg:group-data-[sidebar=rail]/shell:top-0.5 lg:group-data-[sidebar=rail]/shell:ml-0 lg:group-data-[sidebar=rail]/shell:h-4 lg:group-data-[sidebar=rail]/shell:min-w-4 lg:group-data-[sidebar=rail]/shell:px-1"
          >
            <span className="sr-only">{unread} unread</span>
            <span aria-hidden>{unread}</span>
          </motion.span>
        ) : null}
      </Link>
    )
  }

  return (
    <Link
      href="/notifications"
      aria-label={unread > 0 ? `Notifications, ${unread} unread` : 'Notifications'}
      aria-current={here ? 'page' : undefined}
      className={`relative flex size-11 shrink-0 items-center justify-center rounded-md transition-ui hover:bg-sidebar-hover ${
        here ? 'text-accent' : 'text-muted hover:text-foreground'
      }`}
    >
      <Bell size={18} strokeWidth={1.75} aria-hidden />
      {unread > 0 ? (
        <motion.span
          key={unread}
          initial={{ scale: 0.85, opacity: 0.6 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: DURATION.base, ease: EASE }}
          className="absolute -right-0.5 -top-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-xs font-medium tabular-nums text-white"
        >
          {unread}
        </motion.span>
      ) : null}
    </Link>
  )
}
