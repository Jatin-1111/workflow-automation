/**
 * The four oversight views and which addresses belong to them.
 *
 * Pure, and apart from the tabs that draw them, so the top navigation can
 * ask "is this an Overview page?" without importing a client component.
 */

export interface OverviewSection {
  href: string
  label: string
  /** The question this view answers, so the choice is not a guess. */
  answers: string
}

export const OVERVIEW_SECTIONS: OverviewSection[] = [
  { href: '/dashboard', label: 'Now', answers: 'What is running and what is stuck' },
  { href: '/projects', label: 'Projects', answers: 'How each initiative is going' },
  { href: '/team', label: 'Team', answers: 'Who is carrying what' },
  { href: '/reports', label: 'Reports', answers: 'How long things take' },
]

/** Whether a path is one of the views, or a page inside one. */
export function sectionContains(section: OverviewSection, path: string): boolean {
  return path === section.href || path.startsWith(`${section.href}/`)
}

/** Whether a path belongs to the Overview, used by the top navigation too. */
export function isOverviewPath(path: string): boolean {
  return OVERVIEW_SECTIONS.some((section) => sectionContains(section, path))
}
