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
import {
  Columns3,
  LayoutDashboard,
  ListChecks,
  Settings,
  Workflow,
  type LucideIcon,
} from 'lucide-react'
import { navSectionFor } from './nav-section'
import { useSidebarCollapsed } from './shell-frame'

/** One glyph per section, drawn only when the sidebar is the icon rail. */
const ICONS: Record<string, LucideIcon> = {
  '/my-work': ListChecks,
  '/board': Columns3,
  '/dashboard': LayoutDashboard,
  '/workflows': Workflow,
  '/admin': Settings,
}

export function PrimaryNav({ entries }: { entries: { href: string; label: string }[] }) {
  const section = navSectionFor(usePathname())
  const collapsed = useSidebarCollapsed()

  return (
    <nav aria-label="Main">
      {/* Scrolls sideways on a phone with the bar hidden: the grey track was
          being read as an underline, and the cut-off last entry is itself the
          cue that there is more. */}
      <ul className="relative flex items-center gap-1 overflow-x-auto [scrollbar-width:none] lg:flex-col lg:items-stretch lg:gap-0.5 lg:overflow-visible [&::-webkit-scrollbar]:hidden">
        {/* The line the stations sit on. Only drawn when the list is a column. */}
        <span
          aria-hidden
          className="absolute bottom-4 left-[1.15rem] top-4 hidden w-0.5 rounded-full bg-border-strong lg:block lg:group-data-[sidebar=rail]/shell:hidden"
        />
        {entries.map((entry) => {
          const active = section === entry.href
          const Glyph = ICONS[entry.href]
          return (
            <li key={entry.href} className="relative shrink-0">
              <Link
                href={entry.href}
                aria-current={active ? 'page' : undefined}
                title={collapsed ? entry.label : undefined}
                className={`transition-ui flex items-center gap-3 whitespace-nowrap rounded-lg px-3 py-2.5 text-sm font-semibold active:scale-[0.98] max-lg:min-h-11 lg:group-data-[sidebar=rail]/shell:justify-center lg:group-data-[sidebar=rail]/shell:px-0 ${
                  active
                    ? 'bg-foreground text-white'
                    : 'text-foreground hover:bg-sidebar-hover'
                }`}
              >
                <span
                  aria-hidden
                  className={`relative z-10 hidden size-3 shrink-0 rounded-full border-[2.5px] lg:block lg:group-data-[sidebar=rail]/shell:hidden ${
                    active
                      ? 'border-white bg-accent'
                      : 'border-foreground bg-sidebar'
                  }`}
                />
                {Glyph ? (
                  <Glyph
                    aria-hidden
                    size={18}
                    strokeWidth={1.75}
                    className="hidden shrink-0 lg:group-data-[sidebar=rail]/shell:block"
                  />
                ) : null}
                {/* Kept in the page, only not drawn: the name of an icon-only
                    link is what a screen reader reads. */}
                <span className="lg:group-data-[sidebar=rail]/shell:sr-only">{entry.label}</span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
