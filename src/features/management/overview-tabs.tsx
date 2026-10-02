'use client'

/**
 * The four oversight views, as one section.
 *
 * They were four separate entries in the top navigation, which made eight
 * items for an administrator and asked somebody to guess which of Dashboard,
 * Projects, Team and Reports answered their question. They are one place now,
 * with the question each answers written beside its name.
 *
 * Drawn once by the Overview layout rather than by each page, so it stays on
 * screen while the next view loads: switching tabs used to blank the whole
 * window, tabs included. The active tab therefore comes from the address,
 * which a layout cannot read on the server once it has rendered.
 */

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { OVERVIEW_SECTIONS, sectionContains } from './overview-sections'

export function OverviewTabs() {
  const pathname = usePathname()

  return (
    <nav aria-label="Overview" className="mb-6 border-b border-border">
      <ul className="flex flex-wrap items-end gap-1">
        {OVERVIEW_SECTIONS.map((tab) => {
          const active = sectionContains(tab, pathname)
          return (
            <li key={tab.href}>
              <Link
                href={tab.href}
                aria-current={active ? 'page' : undefined}
                title={tab.answers}
                className={`-mb-px block border-b-2 px-3 py-2 text-sm transition-ui ${
                  active
                    ? 'border-accent font-semibold text-accent'
                    : 'border-transparent text-muted hover:border-border-strong hover:text-foreground'
                }`}
              >
                {tab.label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
