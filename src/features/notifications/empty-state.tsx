/**
 * What the list says when it has nothing to show.
 *
 * One line in a bare box read as a page that had failed to load. This says
 * which kind of nothing it is: no notification has ever arrived, or all of
 * them have been read and the unread view is what is empty.
 */

import Link from 'next/link'
import { CheckCheck, Inbox } from 'lucide-react'
import { buttonClass, Panel } from '@/features/ui/primitives'

export function NotificationsEmpty({ onlyUnread }: { onlyUnread: boolean }) {
  const Glyph = onlyUnread ? CheckCheck : Inbox

  return (
    <Panel>
      <div className="flex flex-col items-center px-6 py-14 text-center">
        <span
          aria-hidden
          className="flex size-11 items-center justify-center rounded-full bg-accent-soft text-accent"
        >
          <Glyph size={20} strokeWidth={1.75} />
        </span>
        <h2 className="mt-4 text-[0.9375rem] font-bold tracking-[-0.01em] text-foreground">
          {onlyUnread ? 'Nothing unread' : 'Nothing yet'}
        </h2>
        <p className="mt-1 max-w-sm text-sm text-muted">
          {onlyUnread
            ? 'You have read everything the platform has told you.'
            : 'The platform will tell you here when work reaches you.'}
        </p>
        {onlyUnread ? (
          <Link href="/notifications" className={`${buttonClass('secondary', 'sm')} mt-5`}>
            See everything
          </Link>
        ) : null}
      </div>
    </Panel>
  )
}
