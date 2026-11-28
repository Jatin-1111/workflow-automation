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
    <nav aria-label="Overview" className="mb-7">
      <ul className="flex flex-wrap items-center gap-1.5">
        {OVERVIEW_SECTIONS.map((tab) => {
          const active = sectionContains(tab, pathname)
          return (
            <li key={tab.href}>
              <Link
                href={tab.href}
                aria-current={active ? 'page' : undefined}
                title={tab.answers}
                className={`transition-ui block rounded-lg px-4 py-1.5 text-sm font-semibold active:scale-[0.97] max-sm:min-h-11 max-sm:py-2.5 ${
                  active
                    ? 'bg-foreground text-white'
                    : 'text-muted hover:bg-sidebar hover:text-foreground'
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
