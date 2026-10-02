/**
 * Which top navigation entry a page belongs to.
 *
 * Each page used to tell the header which entry to highlight. The header is
 * drawn once by the signed-in layout now, so that it stays put while the
 * next page loads, and a layout is not re-rendered on navigation — so the
 * entry is worked out from the address instead, here, where it can be tested.
 *
 * Pure.
 */

import { isOverviewPath } from '@/features/management/overview-sections'

/** The href of the entry to highlight, or null for a page under none. */
export function navSectionFor(pathname: string): string | null {
  // A task is work from My Work, wherever somebody arrived at it from.
  if (pathname === '/tasks' || pathname.startsWith('/tasks/')) return '/my-work'
  if (isOverviewPath(pathname)) return '/dashboard'

  const first = pathname.split('/')[1]
  return first ? `/${first}` : null
}
