/**
 * NOTIFICATIONS — what the platform has told this person (spec §41).
 *
 * In-app only in this version: the point is that the platform, not a colleague
 * on WhatsApp, is what tells you work has arrived.
 */

import Link from 'next/link'
import { requireUser } from '@/lib/auth/dal'
import { AppShell } from '@/features/shell/app-shell'
import { EmptyRow, Section } from '@/features/management/section'
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
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Notifications</h1>
            <p className="mt-1 text-sm text-muted">
              {unread === 0 ? 'Nothing unread.' : `${unread} unread.`}
            </p>
          </div>

          {unread > 0 ? (
            <form action={markAllReadAction}>
              <button
                type="submit"
                className="rounded-md border border-border-strong bg-surface px-3 py-1.5 text-sm font-medium transition hover:bg-accent-soft"
              >
                Mark all as read
              </button>
            </form>
          ) : null}
        </div>

        <Section title="Recent" count={notifications.length}>
          {notifications.length === 0 ? (
            <EmptyRow>
              Nothing yet. The platform will tell you here when work reaches you.
            </EmptyRow>
          ) : (
            <ul className="divide-y divide-border">
              {notifications.map((notification) => {
                const row = (
                  <>
                    <span className="flex items-center gap-2">
                      {!notification.readAt ? (
                        <span
                          aria-label="Unread"
                          className="size-1.5 shrink-0 rounded-full bg-accent"
                        />
                      ) : (
                        <span className="size-1.5 shrink-0" />
                      )}
                      <span className="text-sm font-medium">{notification.title}</span>
                    </span>
                    {notification.body ? (
                      <span className="mt-0.5 block pl-3.5 text-sm text-muted">
                        {notification.body}
                      </span>
                    ) : null}
                    <span className="mt-0.5 block pl-3.5 text-xs text-subtle">
                      {humanise(notification.kind)} ·{' '}
                      {notification.createdAt.toLocaleString('en-GB', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </>
                )

                return (
                  <li key={notification.notificationId}>
                    {notification.taskId ? (
                      <Link
                        href={`/tasks/${notification.taskId}`}
                        className="block px-4 py-3 transition hover:bg-accent-soft/60"
                      >
                        {row}
                      </Link>
                    ) : (
                      <div className="px-4 py-3">{row}</div>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </Section>
      </main>
    </AppShell>
  )
}

export const dynamic = 'force-dynamic'
