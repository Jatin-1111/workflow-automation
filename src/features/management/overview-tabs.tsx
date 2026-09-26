/**
 * The four oversight views, as one section.
 *
 * They were four separate entries in the top navigation, which made eight
 * items for an administrator and asked somebody to guess which of Dashboard,
 * Projects, Team and Reports answered their question. They are one place now,
 * with the question each answers written beside its name.
 *
 * The routes are unchanged: this is a second row of navigation over the pages
 * that already exist, so links people have kept still work.
 */

import Link from 'next/link'

interface Tab {
  href: string
  label: string
  /** The question this view answers, so the choice is not a guess. */
  answers: string
}

const TABS: Tab[] = [
  { href: '/dashboard', label: 'Now', answers: 'What is running and what is stuck' },
  { href: '/projects', label: 'Projects', answers: 'How each initiative is going' },
  { href: '/team', label: 'Team', answers: 'Who is carrying what' },
  { href: '/reports', label: 'Reports', answers: 'How long things take' },
]

/** Whether a path belongs to this section, used by the top navigation too. */
export function isOverviewPath(path: string): boolean {
  return TABS.some((tab) => path === tab.href || path.startsWith(`${tab.href}/`))
}

export function OverviewTabs({ current }: { current: string }) {
  return (
    <nav aria-label="Overview" className="mb-6 border-b border-border">
      <ul className="flex flex-wrap items-end gap-1">
        {TABS.map((tab) => {
          const active = current === tab.href || current.startsWith(`${tab.href}/`)
          return (
            <li key={tab.href}>
              <Link
                href={tab.href}
                aria-current={active ? 'page' : undefined}
                title={tab.answers}
                className={`-mb-px block border-b-2 px-3 py-2 text-sm transition-ui ${
                  active
                    ? 'border-accent font-semibold text-foreground'
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
