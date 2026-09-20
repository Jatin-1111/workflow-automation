/**
 * The signed-in frame: primary navigation and identity (spec §47).
 *
 * Navigation entries are filtered by capability, so nobody is shown a door
 * they cannot open. The data layer still enforces access independently.
 */

import Link from 'next/link'
import { LogoutButton } from '@/features/auth/logout-button'
import { can, type Capability } from '@/lib/auth/permissions'
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
  { href: '/projects', label: 'Projects', requires: 'project.view_dashboard', pending: true },
  { href: '/workflows', label: 'Workflows', requires: 'admin.manage_workflows', pending: true },
  { href: '/approvals', label: 'Approvals', pending: true },
  { href: '/team', label: 'Team', requires: 'team.view_workload', pending: true },
]

export function AppShell({
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

  return (
    <>
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-6 py-3">
          <div className="flex items-center gap-7">
            <span className="text-sm font-semibold tracking-tight">Business Orbit</span>
            <nav className="flex items-center gap-5">
              {entries.map((entry) =>
                entry.pending ? (
                  <span
                    key={entry.href}
                    className="cursor-default text-sm text-subtle"
                    title="Coming in a later phase"
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
            <span className="text-sm text-muted">
              {user.name}
              <span className="text-subtle"> · {user.userId}</span>
            </span>
            <LogoutButton />
          </div>
        </div>
      </header>
      {children}
    </>
  )
}
