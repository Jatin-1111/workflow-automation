'use client'

/**
 * One notification.
 *
 * Opening it marks it read: it was only ever cleared all at once, so the list
 * stayed full of "unread" things somebody had plainly already acted on. The
 * mark is sent as the link is followed, not awaited, so the page you asked for
 * is never held up by it.
 *
 * Unread is said three ways, not one: a tinted row, a bolder title, and the
 * word for assistive technology. A single dot is the kind of signal people
 * miss.
 */

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { KindIcon } from './kind-icon'
import { Pill } from '@/features/ui/primitives'
import { markReadAction } from './actions'
import { announceNotificationsChanged } from './events'
import type { NotificationKind } from '@/lib/types/notification'

export interface NotificationRowData {
  id: string
  kind: NotificationKind
  kindLabel: string
  title: string
  body?: string
  taskId?: string
  unread: boolean
  /** Already formatted by the server for the group it sits in, e.g. "11:29". */
  time: string
}

export function NotificationRow({ row }: { row: NotificationRowData }) {
  const router = useRouter()

  function markRead() {
    if (!row.unread) return
    void markReadAction(row.id).then(() => {
      announceNotificationsChanged()
      router.refresh()
    })
  }

  const content = (
    <span className="grid grid-cols-[2rem_minmax(0,1fr)] items-start gap-x-3 gap-y-1 sm:grid-cols-[2rem_minmax(0,1fr)_9rem] sm:gap-x-4">
      <KindIcon kind={row.kind} />

      <span className="min-w-0">
        <span
          className={`block text-sm [overflow-wrap:anywhere] ${
            row.unread ? 'font-bold text-foreground' : 'font-semibold text-foreground'
          }`}
        >
          {row.unread ? <span className="sr-only">Unread: </span> : null}
          {row.title}
        </span>
        {row.body ? (
          <span className="mt-0.5 block text-sm leading-relaxed text-muted [overflow-wrap:anywhere]">
            {row.body}
          </span>
        ) : null}
      </span>

      <span className="col-start-2 flex items-center gap-2 sm:col-start-3 sm:justify-end">
        <Pill tone="neutral">{row.kindLabel}</Pill>
        <span className="w-11 text-right text-xs tabular-nums text-muted">{row.time}</span>
        <span
          aria-hidden
          className={`size-2 shrink-0 rounded-full ${row.unread ? 'bg-accent' : 'bg-transparent'}`}
        />
      </span>
    </span>
  )

  const tint = row.unread ? 'bg-accent-soft/50' : ''

  return row.taskId ? (
    <Link
      href={`/tasks/${row.taskId}`}
      onClick={markRead}
      className={`transition-ui block px-5 py-3.5 hover:bg-surface-sunken ${tint}`}
    >
      {content}
    </Link>
  ) : (
    <div className={`px-5 py-3.5 ${tint}`}>
      {content}
      {row.unread ? (
        <button
          type="button"
          onClick={markRead}
          className="transition-ui mt-1 ml-11 rounded text-xs font-semibold sm:ml-12 text-accent underline-offset-4 hover:underline"
        >
          Mark as read
        </button>
      ) : null}
    </div>
  )
}
