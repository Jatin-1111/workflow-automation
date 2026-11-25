/**
 * NOTIFICATIONS — what the platform has told this person (spec §41).
 *
 * In-app only in this version: the point is that the platform, not a colleague
 * on WhatsApp, is what tells you work has arrived.
 *
 * The list is read when the page opens, so it has a Refresh button, and the
 * sidebar bell recounts when it is pressed. Rows are grouped under the day they
 * arrived, with the time and the kind in fixed columns so they line up down the
 * list. Unread is a view of its own, not just a count.
 */

import Link from 'next/link'
import { requireUser } from '@/lib/auth/dal'
import { PageHeader, Panel } from '@/features/ui/primitives'
import { LinkPending } from '@/features/ui/link-pending'
import { listNotificationsForUser } from '@/lib/db/repositories/notifications'
import { groupByDay } from '@/features/notifications/grouping'
import { NotificationsEmpty } from '@/features/notifications/empty-state'
import { MarkAllRead } from '@/features/notifications/mark-all-read'
import { NotificationRow } from '@/features/notifications/notification-row'
import { RefreshButton } from '@/features/notifications/refresh-button'
import { humanise } from '@/features/my-work/format'

const LIMIT = 50

export default async function NotificationsPage({
  searchParams,
}: PageProps<'/notifications'>) {
  const user = await requireUser()
  const params = await searchParams
  const onlyUnread = params.show === 'unread'

  const now = new Date()
  const all = await listNotificationsForUser(user.userId, LIMIT)
  const unread = all.filter((notification) => !notification.readAt).length
  const shown = onlyUnread ? all.filter((notification) => !notification.readAt) : all
  const groups = groupByDay(shown, now)

  const tabs = [
    { href: '/notifications', label: 'All', count: all.length, active: !onlyUnread },
    { href: '/notifications?show=unread', label: 'Unread', count: unread, active: onlyUnread },
  ]

  return (
    <>
      <PageHeader
        title="Notifications"
        description={
          unread === 0
            ? 'You are all caught up.'
            : `${unread} unread. Opening one marks it read.`
        }
        actions={
          <>
            <RefreshButton loadedAt={now.toISOString()} />
            {unread > 0 ? <MarkAllRead /> : null}
          </>
        }
      />

      <nav aria-label="Show" className="mb-4 flex flex-wrap items-center gap-1.5">
        {tabs.map((tab) => (
          <Link
            key={tab.label}
            href={tab.href}
            aria-current={tab.active ? 'page' : undefined}
            className={`transition-ui relative flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-semibold active:scale-[0.97] max-sm:min-h-11 ${
              tab.active
                ? 'bg-foreground text-white'
                : 'text-muted hover:bg-sidebar hover:text-foreground'
            }`}
          >
            {tab.label}
            <span
              className={`rounded-full px-1.5 text-xs tabular-nums ${
                tab.active ? 'bg-white/20' : 'bg-sidebar'
              }`}
            >
              {tab.count}
            </span>
            <LinkPending />
          </Link>
        ))}
      </nav>

      {groups.length === 0 ? (
        <NotificationsEmpty onlyUnread={onlyUnread} />
      ) : (
        <div className="space-y-6">
          {groups.map((group) => (
            <Panel key={group.key} title={group.label} count={group.items.length}>
              <ul className="divide-y divide-border">
                {group.items.map((notification) => (
                  <li key={notification.notificationId}>
                    <NotificationRow
                      row={{
                        id: notification.notificationId,
                        kind: notification.kind,
                        kindLabel: humanise(notification.kind),
                        title: notification.title,
                        body: notification.body,
                        taskId: notification.taskId,
                        unread: !notification.readAt,
                        time: notification.createdAt.toLocaleTimeString('en-GB', {
                          hour: '2-digit',
                          minute: '2-digit',
                        }),
                      }}
                    />
                  </li>
                ))}
              </ul>
            </Panel>
          ))}

          {all.length === LIMIT ? (
            <p className="text-xs text-subtle">
              Showing the latest {LIMIT}. Older notifications are kept but not listed here.
            </p>
          ) : null}
        </div>
      )}
    </>
  )
}

export const dynamic = 'force-dynamic'

export const metadata = { title: 'Notifications' }
