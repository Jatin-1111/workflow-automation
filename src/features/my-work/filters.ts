/**
 * Search, filter, sort and grouping for the My Work dashboard (spec §10).
 *
 * Pure functions over already-loaded rows: the dashboard is one person's work,
 * so the set is small and keeping this out of the database query makes every
 * combination trivially testable.
 */

import {
  isDueWindow,
  matchesDueWindow,
  type DueWindow,
} from '@/lib/workflow/due-window'
import type { WaitingItem, WorkItem } from './queries'
import type { Priority, WorkBucket } from '@/lib/types/status'
import { WORK_BUCKETS } from '@/lib/types/status'

export const GROUPINGS = ['none', 'project', 'workflow', 'status', 'due'] as const
export type Grouping = (typeof GROUPINGS)[number]

export const SORTS = ['due', 'priority', 'project'] as const
export type Sort = (typeof SORTS)[number]

export interface MyWorkFilters {
  /** Which section is on screen; `all` shows every open item. */
  view: WorkBucket | 'all'
  project?: string
  workflow?: string
  priority?: Priority
  /** §10 asks for a deadline filter alongside the sections, not instead. */
  due?: DueWindow
  search?: string
  group: Grouping
  sort: Sort
}

const PRIORITY_ORDER: Record<Priority, number> = {
  urgent: 0,
  high: 1,
  medium: 2,
  low: 3,
}

function first(value: string | string[] | undefined): string | undefined {
  const raw = Array.isArray(value) ? value[0] : value
  const trimmed = raw?.trim()
  return trimmed ? trimmed : undefined
}

/** Read filter state from the URL, falling back to sensible defaults. */
export function parseFilters(
  params: Record<string, string | string[] | undefined>,
): MyWorkFilters {
  const view = first(params.view)
  const group = first(params.group)
  const sort = first(params.sort)
  const priority = first(params.priority)
  const due = first(params.due)

  return {
    view:
      view === 'all' || (view && WORK_BUCKETS.includes(view as WorkBucket))
        ? (view as WorkBucket | 'all')
        : 'needs_action',
    project: first(params.project),
    workflow: first(params.workflow),
    priority: ['low', 'medium', 'high', 'urgent'].includes(priority ?? '')
      ? (priority as Priority)
      : undefined,
    due: isDueWindow(due) ? due : undefined,
    search: first(params.q),
    group: GROUPINGS.includes(group as Grouping) ? (group as Grouping) : 'none',
    sort: SORTS.includes(sort as Sort) ? (sort as Sort) : 'due',
  }
}

/** Matches a row against free text across every name the user can see. */
function matchesSearch(item: WorkItem, search: string): boolean {
  const haystack = [
    item.projectName,
    item.workflowName,
    item.instanceTitle,
    item.stageName,
  ]
    .join(' ')
    .toLowerCase()
  return haystack.includes(search.toLowerCase())
}

export function applyFilters(
  items: WorkItem[],
  filters: MyWorkFilters,
  now = new Date(),
): WorkItem[] {
  const filtered = items.filter((item) => {
    // `all` means everything still open, not everything ever.
    if (filters.view === 'all' ? item.bucket === 'completed' : item.bucket !== filters.view) {
      return false
    }
    if (filters.project && item.projectId !== filters.project) return false
    if (filters.workflow && item.workflowId !== filters.workflow) return false
    if (filters.priority && item.priority !== filters.priority) return false
    if (
      filters.due &&
      !matchesDueWindow(
        { dueAt: item.dueAt, overdue: item.bucket === 'overdue' },
        filters.due,
        now,
      )
    ) {
      return false
    }
    if (filters.search && !matchesSearch(item, filters.search)) return false
    return true
  })

  return sortItems(filtered, filters.sort)
}

export function sortItems(items: WorkItem[], sort: Sort): WorkItem[] {
  const sorted = [...items]

  if (sort === 'priority') {
    return sorted.sort(
      (a, b) =>
        PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority] ||
        dueValue(a) - dueValue(b),
    )
  }
  if (sort === 'project') {
    return sorted.sort(
      (a, b) => a.projectName.localeCompare(b.projectName) || dueValue(a) - dueValue(b),
    )
  }
  // Soonest deadline first; undated work sits at the end rather than the top.
  return sorted.sort((a, b) => dueValue(a) - dueValue(b))
}

function dueValue(item: WorkItem): number {
  return item.dueAt ? item.dueAt.getTime() : Number.MAX_SAFE_INTEGER
}

/**
 * The same project, workflow and search filters applied to waiting rows.
 *
 * Filtering the task list but not this one would show results that contradict
 * each other on the same screen.
 */
export function applyWaitingFilters(
  items: WaitingItem[],
  filters: MyWorkFilters,
): WaitingItem[] {
  return items.filter((item) => {
    if (filters.project && item.projectId !== filters.project) return false
    if (filters.workflow && item.workflowId !== filters.workflow) return false
    if (filters.search) {
      const haystack = [
        item.projectName,
        item.workflowName,
        item.instanceTitle,
        item.stageName,
        ...item.waitingOn,
      ]
        .join(' ')
        .toLowerCase()
      if (!haystack.includes(filters.search.toLowerCase())) return false
    }
    return true
  })
}

export interface WorkGroup {
  key: string
  label: string
  items: WorkItem[]
}

function groupLabel(item: WorkItem, grouping: Grouping, now: Date): string {
  switch (grouping) {
    case 'project':
      return item.projectName
    case 'workflow':
      return item.workflowName
    case 'status':
      return item.status.replace(/_/g, ' ')
    case 'due':
      return dueLabel(item.dueAt, now)
    default:
      return ''
  }
}

function dueLabel(dueAt: Date | undefined, now: Date): string {
  if (!dueAt) return 'No deadline'
  const days = Math.floor((dueAt.getTime() - now.getTime()) / 86_400_000)
  if (dueAt.getTime() < now.getTime()) return 'Overdue'
  if (days < 1) return 'Today'
  if (days < 2) return 'Tomorrow'
  if (days < 7) return 'This week'
  return 'Later'
}

/** Group rows for display, preserving the sort within each group (spec §10). */
export function groupItems(
  items: WorkItem[],
  grouping: Grouping,
  now = new Date(),
): WorkGroup[] {
  if (grouping === 'none') {
    return [{ key: 'all', label: '', items }]
  }

  const groups = new Map<string, WorkItem[]>()
  for (const item of items) {
    const label = groupLabel(item, grouping, now)
    groups.set(label, [...(groups.get(label) ?? []), item])
  }

  return [...groups.entries()]
    .map(([label, groupedItems]) => ({ key: label, label, items: groupedItems }))
    .sort((a, b) => a.label.localeCompare(b.label))
}
