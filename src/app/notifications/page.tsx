/**
 * NOTIFICATIONS — what the platform has told this person (spec §41).
 *
 * In-app only in this version: the point is that the platform, not a colleague
 * on WhatsApp, is what tells you work has arrived.
 */

import Link from 'next/link'
import { requireUser } from '@/lib/auth/dal'
import { AppShell } from '@/features/shell/app-shell'
import { CheckCheck } from 'lucide-react'
import {
  Empty,
  PageHeader,
  Panel,
  buttonClass,
} from '@/features/ui/primitives'
import { KindIcon } from '@/features/notifications/kind-icon'
import { listNotificationsForUser } from '@/lib/db/repositories/notifications'
import { markAllReadAction } from '@/features/notifications/actions'
import { humanise } from '@/features/my-work/format'

export default async function NotificationsPage() {
  const user = await requireUser()
  const notifications = await listNotificationsForUser(user.userId, 50)
  const unread = notifications.filter((notification) => !notification.readAt).length

  return (
    <AppShell user={user} current="/notifications">
      <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
        <PageHeader
          title="Notifications"
          description={unread === 0 ? 'Nothing unread.' : `${unread} unread.`}
          actions={
            unread > 0 ? (
              <form action={markAllReadAction}>
                <button type="submit" className={buttonClass('secondary', 'md')}>
                  <CheckCheck size={16} strokeWidth={1.75} aria-hidden />
                  Mark all as read
                </button>
              </form>
            ) : null
          }
        />

        <Panel title="Recent" count={notifications.length}>
          {notifications.length === 0 ? (
            <Empty>
              Nothing yet. The platform will tell you here when work reaches you.
            </Empty>
          ) : (
            <ul className="divide-y divide-border">
              {notifications.map((notification) => {
                const row = (
                  <span className="flex items-start gap-3">
                    <KindIcon kind={notification.kind} />

                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="text-sm font-medium">{notification.title}</span>
                        {!notification.readAt ? (
                          <span
                            aria-label="Unread"
                            className="size-1.5 shrink-0 rounded-full bg-accent"
                          />
                        ) : null}
                      </span>
                      {notification.body ? (
                        <span className="mt-0.5 block text-sm text-muted">
                          {notification.body}
                        </span>
                      ) : null}
                      <span className="mt-0.5 block text-xs text-subtle">
                        {humanise(notification.kind)} ·{' '}
                        {notification.createdAt.toLocaleString('en-GB', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </span>
                  </span>
                )

                return (
                  <li key={notification.notificationId}>
                    {notification.taskId ? (
                      <Link
                        href={`/tasks/${notification.taskId}`}
                        className="block px-5 py-3.5 transition-ui hover:bg-surface-sunken"
                      >
                        {row}
                      </Link>
                    ) : (
                      <div className="px-5 py-3.5">{row}</div>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </Panel>
      </main>
    </AppShell>
  )
}

export const dynamic = 'force-dynamic'
