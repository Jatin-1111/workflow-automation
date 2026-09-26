/**
 * The signed-in frame: primary navigation and identity (spec §47).
 *
 * Navigation entries are filtered by capability, so nobody is shown a door
 * they cannot open. The data layer still enforces access independently.
 */

import Link from 'next/link'
import { Bell, CircleHelp, Search } from 'lucide-react'
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
            className="shrink-0 text-sm font-semibold tracking-tight text-foreground transition-ui hover:text-accent"
          >
            Business Orbit
          </Link>

          {/* The search grows into whatever the header is not using, rather
              than sitting at a fixed width with dead space either side. */}
          <form
            method="get"
            action="/search"
            className="relative mx-auto hidden w-full max-w-md md:block"
          >
            <Search
              size={16}
              strokeWidth={1.75}
              aria-hidden
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-subtle"
            />
            <input
              type="search"
              name="q"
              placeholder="Search or paste an ID"
              aria-label="Search Business Orbit"
              className="h-9 w-full rounded-md border border-border bg-surface-sunken pl-9 pr-3 text-sm text-foreground transition-ui placeholder:text-subtle hover:border-border-strong focus-visible:border-accent focus-visible:bg-surface"
            />
          </form>

          {/* Icon-first, so the two utilities read as controls rather than as
              more navigation competing with the tabs below. */}
          <Link
            href="/notifications"
            aria-label={
              unread > 0 ? `Notifications, ${unread} unread` : 'Notifications'
            }
            aria-current={current === '/notifications' ? 'page' : undefined}
            className={`relative ml-auto flex size-9 shrink-0 items-center justify-center rounded-md transition-ui hover:bg-surface-sunken md:ml-0 ${
              current === '/notifications' ? 'text-accent' : 'text-muted hover:text-foreground'
            }`}
          >
            <Bell size={18} strokeWidth={1.75} aria-hidden />
            {unread > 0 ? (
              <span className="absolute -right-0.5 -top-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-xs font-medium tabular-nums text-white">
                {unread}
              </span>
            ) : null}
          </Link>

          <Link
            href="/help"
            aria-label="How this works"
            aria-current={current === '/help' ? 'page' : undefined}
            className={`flex size-9 shrink-0 items-center justify-center rounded-md transition-ui hover:bg-surface-sunken ${
              current === '/help' ? 'text-accent' : 'text-muted hover:text-foreground'
            }`}
          >
            <CircleHelp size={18} strokeWidth={1.75} aria-hidden />
          </Link>

          <span aria-hidden className="hidden h-6 w-px bg-border sm:block" />

          <Link
            href="/profile"
            aria-current={current === '/profile' ? 'page' : undefined}
            className="flex shrink-0 items-center gap-2 rounded-md py-1 pl-1 pr-2 text-sm transition-ui hover:bg-surface-sunken"
          >
            <span
              aria-hidden
              className="flex size-7 items-center justify-center rounded-full bg-accent-soft text-xs font-semibold text-accent"
            >
              {user.name.slice(0, 1).toUpperCase()}
            </span>
            <span className="hidden text-muted sm:block">{user.name}</span>
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
                    className={`block whitespace-nowrap border-b-2 px-3 py-2.5 text-sm transition-ui ${
                      active
                        ? 'border-accent font-semibold text-foreground'
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
