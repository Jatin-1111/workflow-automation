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
}

const NAV: NavEntry[] = [
  { href: '/my-work', label: 'My Work' },
  { href: '/dashboard', label: 'Dashboard', requires: 'management.view_dashboard' },
  { href: '/projects', label: 'Projects', requires: 'project.view_dashboard' },
  { href: '/team', label: 'Team', requires: 'team.view_workload' },
  { href: '/reports', label: 'Reports', requires: 'management.view_dashboard' },
  { href: '/workflows', label: 'Workflows', requires: 'admin.manage_workflows' },
  { href: '/admin', label: 'Admin', requires: 'admin.manage_users' },
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
      {/*
        Two rows by design rather than by overflow: identity and search above,
        navigation below. Cramming both onto one line is what made the header
        wrap unpredictably as the navigation grew.
      */}
      <header className="sticky top-0 z-10 border-b border-border bg-surface">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-5 py-3 sm:gap-4 sm:px-6">
          <Link
            href="/my-work"
            className="shrink-0 text-sm font-semibold tracking-tight text-foreground"
          >
            Business Orbit
          </Link>

          <form method="get" action="/search" className="mx-auto hidden md:block">
            <input
              type="search"
              name="q"
              placeholder="Search or paste an ID"
              aria-label="Search Business Orbit"
              className="h-8 w-72 rounded-md border border-border bg-surface-sunken px-3 text-sm text-foreground transition placeholder:text-subtle hover:border-border-strong focus:border-accent focus:bg-surface focus:outline-none focus:ring-2 focus:ring-accent-ring"
            />
          </form>

          <Link
            href="/notifications"
            aria-current={current === '/notifications' ? 'page' : undefined}
            className="ml-auto flex shrink-0 items-center gap-1.5 text-sm text-muted transition hover:text-foreground md:ml-0"
          >
            Notifications
            {unread > 0 ? (
              <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1.5 text-xs font-medium tabular-nums text-white">
                {unread}
              </span>
            ) : null}
          </Link>

          <Link
            href="/help"
            aria-current={current === '/help' ? 'page' : undefined}
            className="shrink-0 text-sm text-muted transition hover:text-foreground"
          >
            Help
          </Link>

          <span aria-hidden className="hidden h-5 w-px bg-border sm:block" />

          <Link
            href="/profile"
            aria-current={current === '/profile' ? 'page' : undefined}
            className="hidden shrink-0 text-sm text-muted transition hover:text-foreground sm:block"
          >
            {user.name}
          </Link>

          <LogoutButton />
        </div>

        <nav className="mx-auto max-w-7xl px-4 sm:px-6">
          <ul className="-mb-px flex items-center gap-1 overflow-x-auto">
            {entries.map((entry) => {
              const active = current === entry.href
              return (
                <li key={entry.href}>
                  <Link
                    href={entry.href}
                    aria-current={active ? 'page' : undefined}
                    className={`block whitespace-nowrap border-b-2 px-3 py-2 text-sm transition ${
                      active
                        ? 'border-accent font-medium text-foreground'
                        : 'border-transparent text-muted hover:border-border-strong hover:text-foreground'
                    }`}
                  >
                    {entry.label}
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>
      </header>
      {children}
    </>
  )
}
