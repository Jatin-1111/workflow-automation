/**
 * The signed-in frame: primary navigation and identity (spec §47).
 *
 * Navigation entries are filtered by capability, so nobody is shown a door
 * they cannot open. The data layer still enforces access independently.
 */

import Link from 'next/link'
import { LogoutButton } from '@/features/auth/logout-button'
import { can, type Capability } from '@/lib/auth/permissions'
import { countUnreadNotifications } from '@/lib/db/repositories/notifications'
import type { PublicUser } from '@/lib/types/user'

interface NavEntry {
  href: string
  label: string
  requires?: Capability
  /** Not yet built; shown as a signpost rather than a broken link. */
  pending?: boolean
}

const NAV: NavEntry[] = [
  { href: '/my-work', label: 'My Work' },
  { href: '/dashboard', label: 'Dashboard', requires: 'management.view_dashboard' },
  { href: '/projects', label: 'Projects', requires: 'project.view_dashboard' },
  { href: '/team', label: 'Team', requires: 'team.view_workload' },
  { href: '/admin', label: 'Admin', requires: 'admin.manage_users' },
  // The Workflow Builder is the one navigation promise this release does not
  // keep; shown so its absence is explicit rather than silent.
  { href: '/workflows', label: 'Workflows', requires: 'admin.manage_workflows', pending: true },
]

export async function AppShell({
  user,
  current,
  children,
}: {
  user: PublicUser
  current: string
  children: React.ReactNode
}) {
  const entries = NAV.filter(
    (entry) => !entry.requires || can(user.accessLevel, entry.requires),
  )
  const unread = await countUnreadNotifications(user.userId)

  return (
    <>
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-3 sm:px-6">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <span className="text-sm font-semibold tracking-tight">Business Orbit</span>
            <nav className="flex flex-wrap items-center gap-x-5 gap-y-1">
              {entries.map((entry) =>
                entry.pending ? (
                  <span
                    key={entry.href}
                    className="cursor-default text-sm text-subtle"
                    title="Not in this release"
                  >
                    {entry.label}
                  </span>
                ) : (
                  <Link
                    key={entry.href}
                    href={entry.href}
                    aria-current={current === entry.href ? 'page' : undefined}
                    className={
                      current === entry.href
                        ? 'text-sm font-medium text-foreground'
                        : 'text-sm text-muted transition hover:text-foreground'
                    }
                  >
                    {entry.label}
                  </Link>
                ),
              )}
            </nav>
          </div>

          <div className="flex items-center gap-4">
            <Link
              href="/notifications"
              aria-current={current === '/notifications' ? 'page' : undefined}
              className="flex items-center gap-1.5 text-sm text-muted transition hover:text-foreground"
            >
              Notifications
              {unread > 0 ? (
                <span className="rounded-full bg-accent px-1.5 py-0.5 text-[11px] font-medium tabular-nums text-white">
                  {unread}
                </span>
              ) : null}
            </Link>

            <Link
              href="/profile"
              aria-current={current === '/profile' ? 'page' : undefined}
              className="text-sm text-muted transition hover:text-foreground"
            >
              {user.name}
              {/* The id is useful at a desk and only noise on a phone. */}
              <span className="hidden text-subtle sm:inline"> · {user.userId}</span>
            </Link>

            <LogoutButton />
          </div>
        </div>
      </header>
      {children}
    </>
  )
}
