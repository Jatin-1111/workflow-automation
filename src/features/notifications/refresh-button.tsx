'use client'

/**
 * Refresh the list on demand.
 *
 * Notifications are fetched when the page is opened, so something that arrives
 * while it is open is not here until you ask. This is the asking: it reloads
 * the list in place, tells the sidebar bell to recount, and says when it last
 * did, so the reader can tell "nothing new" from "I have not looked".
 */

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { RefreshCw } from 'lucide-react'
import { buttonClass } from '@/features/ui/primitives'
import { announceNotificationsChanged } from './events'

function clock(date: Date): string {
  return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}

export function RefreshButton({ loadedAt }: { loadedAt: string }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  // Until the first press, "updated" is when the page was drawn.
  const [pressedAt, setPressedAt] = useState<Date | null>(null)
  const updated = clock(pressedAt ?? new Date(loadedAt))

  return (
    <span className="flex items-center gap-3">
      {/* The server and the browser may not share a time zone, so the clock is
          allowed to differ between the two renders instead of warning. */}
      <span
        role="status"
        aria-live="polite"
        suppressHydrationWarning
        className="text-xs text-muted"
      >
        {pending ? 'Refreshing…' : `Updated ${updated}`}
      </span>
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(() => {
            router.refresh()
            setPressedAt(new Date())
            announceNotificationsChanged()
          })
        }
        className={buttonClass('secondary', 'md')}
      >
        <RefreshCw
          size={16}
          strokeWidth={1.75}
          aria-hidden
          className={pending ? 'animate-spin' : ''}
        />
        Refresh
      </button>
    </span>
  )
}
