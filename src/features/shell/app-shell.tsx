/**
 * The signed-in frame: a sidebar on the left, the work on the right (spec §47).
 *
 * Navigation entries are filtered by capability, so nobody is shown a door
 * they cannot open. The data layer still enforces access independently.
 *
 * Drawn once, by the signed-in layout, not by every page. While each page
 * drew its own, a page's loading screen replaced the frame along with
 * everything else, so every click blanked the whole window. The parts that
 * depend on which page is showing read the address on the client.
 *
 * On a wide screen the sidebar is a fixed-height column that never scrolls
 * with the page. Below `lg` it folds into a bar across the top: identity and
 * utilities on one row, the sections on the next.
 */

import { cookies } from 'next/headers'
import Link from 'next/link'
import { CircleHelp, Orbit } from 'lucide-react'
import { LogoutButton } from '@/features/auth/logout-button'
import { can, type Capability } from '@/lib/auth/permissions'
import type { PublicUser } from '@/lib/types/user'
import { HeaderSearch } from './header-search'
import { NotificationBell } from './notification-bell'
import { PrimaryNav } from './primary-nav'
import { ShellLink } from './shell-link'
import { ShellFrame, SidebarToggle } from './shell-frame'
import { SIDEBAR_COOKIE } from './sidebar-cookie'

interface NavEntry {
  href: string
  label: string
  requires?: Capability
}

const NAV: NavEntry[] = [
  { href: '/my-work', label: 'My Work' },
  { href: '/board', label: 'Board', requires: 'management.view_dashboard' },
  // Dashboard, Projects, Team and Reports are one section with its own tabs,
  // rather than four top-level entries somebody has to choose between.
  { href: '/dashboard', label: 'Overview', requires: 'management.view_dashboard' },
  { href: '/workflows', label: 'Workflows', requires: 'admin.manage_workflows' },
  { href: '/admin', label: 'Admin', requires: 'admin.manage_users' },
]

export async function AppShell({
  user,
  unread,
  children,
}: {
  user: PublicUser
  /** The count when the shell was drawn; the bell keeps it current. */
  unread: number
  children: React.ReactNode
}) {
  const initialCollapsed = (await cookies()).get(SIDEBAR_COOKIE)?.value === 'rail'
  const entries = NAV.filter(
    (entry) => !entry.requires || can(user.accessLevel, entry.requires),
  ).map(({ href, label }) => ({ href, label }))

  return (
    <ShellFrame
      initialCollapsed={initialCollapsed}
      sidebar={
      <aside
        id="app-sidebar"
        className="z-10 flex flex-col gap-3 border-b border-border bg-sidebar px-3 py-3 lg:sticky lg:top-0 lg:h-dvh lg:gap-6 lg:overflow-y-auto lg:overflow-x-hidden lg:border-b-0 lg:border-r lg:px-3 lg:py-5"
      >
        <div className="flex items-center gap-2 lg:flex-col lg:items-stretch lg:gap-5">
          <Link
            href="/my-work"
            className="transition-ui flex shrink-0 items-center gap-2.5 rounded-lg px-2 text-[1.0625rem] font-bold tracking-[-0.02em] text-foreground lg:group-data-[sidebar=rail]/shell:justify-center lg:group-data-[sidebar=rail]/shell:px-0"
          >
            <span
              aria-hidden
              className="flex size-7 items-center justify-center rounded-full bg-accent text-white"
            >
              <Orbit size={16} strokeWidth={2} />
            </span>
            {/* The mark alone on a phone: the name, search, bell, profile and
                sign-out do not all fit on one row. */}
            <span className="max-sm:sr-only lg:group-data-[sidebar=rail]/shell:sr-only">Business Orbit</span>
          </Link>

          {/* A field in the column, one tap on a phone where it does not fit. */}
          <HeaderSearch />

          {/* Below `lg` the column's footer is not drawn, so the three things
              it holds come up here: notifications, profile, sign out. */}
          <div className="ml-auto flex items-center gap-0.5 lg:hidden">
            <NotificationBell initialUnread={unread} />
            <Link
              href="/profile"
              aria-label="Your profile"
              className="transition-ui flex size-11 items-center justify-center rounded-md hover:bg-sidebar-hover"
            >
              <span
                aria-hidden
                className="flex size-7 items-center justify-center rounded-full bg-accent text-xs font-bold text-white"
              >
                {user.name.slice(0, 1).toUpperCase()}
              </span>
            </Link>
            <LogoutButton />
          </div>
        </div>

        <PrimaryNav entries={entries} />

        <div className="mt-auto hidden flex-col gap-0.5 lg:flex">
          <NotificationBell initialUnread={unread} labelled />
          <ShellLink
            href="/help"
            className="transition-ui flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium active:scale-[0.98] lg:group-data-[sidebar=rail]/shell:justify-center lg:group-data-[sidebar=rail]/shell:px-0"
            activeClassName="bg-sidebar-hover text-foreground"
            idleClassName="text-muted hover:bg-sidebar-hover hover:text-foreground"
          >
            {/* A 12px slot, the width of a station on the line above, so the
                icon sits under the dots and every label starts on one edge. */}
            <span aria-hidden className="flex w-3 shrink-0 justify-center lg:group-data-[sidebar=rail]/shell:w-auto [&>svg]:shrink-0">
              <CircleHelp size={16} strokeWidth={1.75} />
            </span>
            <span className="lg:group-data-[sidebar=rail]/shell:sr-only">How this works</span>
          </ShellLink>

          <SidebarToggle />

          <div className="mt-2 flex items-center gap-1 border-t border-border-strong/60 pt-3 lg:group-data-[sidebar=rail]/shell:flex-col">
            <ShellLink
              href="/profile"
              className="transition-ui flex min-w-0 flex-1 items-center gap-2.5 rounded-lg px-2 py-1.5 text-left text-sm lg:group-data-[sidebar=rail]/shell:flex-none lg:group-data-[sidebar=rail]/shell:px-1"
              activeClassName="bg-sidebar-hover"
              idleClassName="hover:bg-sidebar-hover"
            >
              <span
                aria-hidden
                className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-bold text-white"
              >
                {user.name.slice(0, 1).toUpperCase()}
              </span>
              <span className="min-w-0 lg:group-data-[sidebar=rail]/shell:sr-only">
                <span className="block truncate font-semibold text-foreground">{user.name}</span>
                <span className="block truncate text-xs capitalize text-muted">
                  {user.accessLevel}
                </span>
              </span>
            </ShellLink>
            <LogoutButton />
          </div>
        </div>
      </aside>
      }
    >
      {children}
    </ShellFrame>
  )
}
