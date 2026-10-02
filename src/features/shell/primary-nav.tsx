'use client'

/**
 * The row of section links under the header.
 *
 * Which entry is lit comes from the address, because the header is drawn
 * once and is not told by each page any more.
 */

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { navSectionFor } from './nav-section'

export function PrimaryNav({ entries }: { entries: { href: string; label: string }[] }) {
  const section = navSectionFor(usePathname())

  return (
    <nav className="mx-auto max-w-7xl px-4 sm:px-6">
      <ul className="-mb-px flex items-center gap-1 overflow-x-auto">
        {entries.map((entry) => {
          const active = section === entry.href
          return (
            <li key={entry.href}>
              <Link
                href={entry.href}
                aria-current={active ? 'page' : undefined}
                className={`block whitespace-nowrap border-b-2 px-3 py-2.5 text-sm transition-ui ${
                  active
                    ? 'border-accent font-semibold text-accent'
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
  )
}
