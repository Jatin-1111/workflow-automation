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

export function NotificationBell({ initialUnread }: { initialUnread: number }) {
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
    return () => {
      cancelled = true
      window.removeEventListener('focus', refresh)
    }
  }, [pathname])

  return (
    <Link
      href="/notifications"
      aria-label={unread > 0 ? `Notifications, ${unread} unread` : 'Notifications'}
      aria-current={here ? 'page' : undefined}
      className={`relative ml-auto flex size-9 shrink-0 items-center justify-center rounded-md transition-ui hover:bg-surface-sunken md:ml-0 ${
        here ? 'text-accent' : 'text-muted hover:text-foreground'
      }`}
    >
      <Bell size={18} strokeWidth={1.75} aria-hidden />
      {unread > 0 ? (
        <span className="absolute -right-0.5 -top-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-xs font-medium tabular-nums text-white">
          {unread}
        </span>
      ) : null}
    </Link>
  )
}
