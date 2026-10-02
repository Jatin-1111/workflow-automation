'use client'

/**
 * A sign on a link that its click is being answered.
 *
 * Links that only change the address's query — a My Work tab, a report's
 * date range, an Overview number — keep the current page on screen until
 * the new one is ready, which is right, but they gave no sign anything had
 * happened, so people clicked again. This draws a thin moving line along the
 * bottom of the link while it is pending.
 *
 * Always rendered and only faded in, so it never moves anything: the link
 * needs `relative` so the line sits inside it. Must be placed inside a
 * next/link `<Link>`, where `useLinkStatus` can see it.
 */

import { useLinkStatus } from 'next/link'

export function LinkPending() {
  const { pending } = useLinkStatus()
  return (
    <span
      aria-hidden
      className={`pointer-events-none absolute inset-x-1 bottom-0 h-0.5 rounded-full bg-accent transition-opacity duration-150 ${
        pending ? 'animate-pulse opacity-100' : 'opacity-0'
      }`}
    />
  )
}
