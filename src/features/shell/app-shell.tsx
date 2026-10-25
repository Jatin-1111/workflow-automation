/**
 * The signed-in frame: primary navigation and identity (spec §47).
 *
 * Navigation entries are filtered by capability, so nobody is shown a door
 * they cannot open. The data layer still enforces access independently.
 *
 * Drawn once, by the signed-in layout, not by every page. While each page
 * drew its own, a page's loading screen replaced the header along with
 * everything else, so every click blanked the whole window. The parts that
 * depend on which page is showing read the address on the client.
 */

import Link from 'next/link'
import { CircleHelp, Orbit } from 'lucide-react'
import { LogoutButton } from '@/features/auth/logout-button'
import { can, type Capability } from '@/lib/auth/permissions'
import type { PublicUser } from '@/lib/types/user'
import { HeaderSearch } from './header-search'
import { NotificationBell } from './notification-bell'
import { PrimaryNav } from './primary-nav'
import { ShellLink } from './shell-link'

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

export function AppShell({
  user,
  unread,
  children,
}: {
  user: PublicUser
  /** The count when the header was drawn; the bell keeps it current. */
  unread: number
  children: React.ReactNode
}) {
  const entries = NAV.filter(
    (entry) => !entry.requires || can(user.accessLevel, entry.requires),
  ).map(({ href, label }) => ({ href, label }))

  return (
    <>
      {/*
        Two rows by design rather than by overflow: identity and search above,
        navigation below. Cramming both onto one line is what made the header
        wrap unpredictably as the navigation grew.
      */}
      <header className="sticky top-0 z-10 border-b border-border bg-surface/90 backdrop-blur supports-[backdrop-filter]:bg-surface/80">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 sm:gap-4 sm:px-6">
          <Link
            href="/my-work"
            className="group flex shrink-0 items-center gap-2 text-sm font-semibold tracking-tight text-foreground transition-ui hover:text-accent"
          >
            <span
              aria-hidden
              className="flex size-7 items-center justify-center rounded-lg bg-accent text-white shadow-sm transition-ui group-hover:bg-accent-hover"
            >
              <Orbit size={16} strokeWidth={2} />
            </span>
            <span className="hidden sm:block">Business Orbit</span>
          </Link>

          {/* Grows into whatever the header is not using, and is a single tap
              on a phone, where the box itself does not fit. */}
          <HeaderSearch />

          {/* Icon-first, so the two utilities read as controls rather than as
              more navigation competing with the tabs below. */}
          <NotificationBell initialUnread={unread} />

          <ShellLink
            href="/help"
            label="How this works"
            className="flex size-11 shrink-0 items-center justify-center rounded-md transition-ui hover:bg-black/[0.045] sm:size-9"
            activeClassName="text-accent"
            idleClassName="text-muted hover:text-foreground"
          >
            <CircleHelp size={18} strokeWidth={1.75} aria-hidden />
          </ShellLink>

          <span aria-hidden className="hidden h-6 w-px bg-border sm:block" />

          <ShellLink
            href="/profile"
            className="flex shrink-0 items-center gap-2 rounded-md py-1 pl-1 pr-2 text-sm transition-ui hover:bg-surface-sunken"
          >
            <span
              aria-hidden
              className="flex size-7 items-center justify-center rounded-full bg-accent-soft text-xs font-semibold text-accent"
            >
              {user.name.slice(0, 1).toUpperCase()}
            </span>
            <span className="hidden text-muted sm:block">{user.name}</span>
          </ShellLink>

          <LogoutButton />
        </div>

        <PrimaryNav entries={entries} />
      </header>
      {children}
    </>
  )
}
