'use client'

/**
 * The sections, as a line with a station for each.
 *
 * Down the side on a wide screen and along the top on a narrow one. The line
 * and its stations are the product's own picture of itself: work travels from
 * stage to stage, and so does the person using it. The station you are at is
 * filled; the rest are rings.
 *
 * Which entry is lit comes from the address, because the shell is drawn once
 * and is not told by each page.
 */

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { navSectionFor } from './nav-section'

export function PrimaryNav({ entries }: { entries: { href: string; label: string }[] }) {
  const section = navSectionFor(usePathname())

  return (
    <nav aria-label="Main">
      {/* Scrolls sideways on a phone with the bar hidden: the grey track was
          being read as an underline, and the cut-off last entry is itself the
          cue that there is more. */}
      <ul className="relative flex items-center gap-1 overflow-x-auto [scrollbar-width:none] lg:flex-col lg:items-stretch lg:gap-0.5 lg:overflow-visible [&::-webkit-scrollbar]:hidden">
        {/* The line the stations sit on. Only drawn when the list is a column. */}
        <span
          aria-hidden
          className="absolute bottom-4 left-[1.15rem] top-4 hidden w-0.5 rounded-full bg-border-strong lg:block"
        />
        {entries.map((entry) => {
          const active = section === entry.href
          return (
            <li key={entry.href} className="relative shrink-0">
              <Link
                href={entry.href}
                aria-current={active ? 'page' : undefined}
                className={`transition-ui flex items-center gap-3 whitespace-nowrap rounded-lg px-3 py-2.5 text-sm font-semibold active:scale-[0.98] max-lg:min-h-11 ${
                  active
                    ? 'bg-foreground text-white'
                    : 'text-foreground hover:bg-sidebar-hover'
                }`}
              >
                <span
                  aria-hidden
                  className={`relative z-10 hidden size-3 shrink-0 rounded-full border-[2.5px] lg:block ${
                    active
                      ? 'border-white bg-accent'
                      : 'border-foreground bg-sidebar'
                  }`}
                />
                {entry.label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
