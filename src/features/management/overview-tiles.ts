/**
 * The headline numbers on the Overview, and what each one is a count of.
 *
 * Every tile used to be a plain box. "Overdue tasks 1" invited a click and
 * went nowhere, and the list that named the task started below the bottom
 * of the screen under a different heading. Each tile now opens its own list,
 * directly beneath the tiles.
 *
 * The rule for what a tile counts lives here once and is used for both the
 * number and the list, so the two cannot disagree: a tile saying 3 opens a
 * list of exactly 3.
 *
 * Pure, so every rule is tested without a database.
 */

import type { WorkBucket } from '@/lib/types/status'
import type { WorkflowInstance } from '@/lib/types/instance'
import type { Task } from '@/lib/types/task'
import type { OverviewFilters } from './filters'

export const OVERVIEW_TILES = [
  'active',
  'approvals',
  'overdue',
  'due_today',
  'blocked',
  'completed_week',
  'completed',
] as const
export type OverviewTile = (typeof OVERVIEW_TILES)[number]

export const TILE_LABELS: Record<OverviewTile, string> = {
  active: 'Active workflows',
  approvals: 'Pending approvals',
  overdue: 'Overdue tasks',
  due_today: 'Due today',
  blocked: 'Blocked',
  completed_week: 'Completed this week',
  completed: 'Completed overall',
}

/** Whether a tile counts open tasks or whole runs of a workflow. */
export const TILE_COUNTS: Record<OverviewTile, 'tasks' | 'runs'> = {
  active: 'runs',
  approvals: 'tasks',
  overdue: 'tasks',
  due_today: 'tasks',
  blocked: 'tasks',
  completed_week: 'runs',
  completed: 'runs',
}

/** What an open list says when there is nothing in it. */
export const TILE_EMPTY: Record<OverviewTile, string> = {
  active: 'Nothing is running.',
  approvals: 'No approval is waiting.',
  overdue: 'Nothing is overdue.',
  due_today: 'Nothing else falls due today.',
  blocked: 'Nothing is blocked.',
  completed_week: 'Nothing has finished in the last seven days.',
  completed: 'Nothing has finished yet.',
}

export function isOverviewTile(value: unknown): value is OverviewTile {
  return OVERVIEW_TILES.includes(value as OverviewTile)
}

/** The tile asked for in the address, if it names one. */
export function parseOverviewTile(
  params: Record<string, string | string[] | undefined>,
): OverviewTile | undefined {
  const raw = Array.isArray(params.show) ? params.show[0] : params.show
  return isOverviewTile(raw) ? raw : undefined
}

const WEEK_MS = 7 * 86_400_000

/** The moments the rules are measured against, worked out once per page. */
export interface TileClock {
  now: Date
  /** The end of today's business day, as a timestamp. */
  endToday: number
}

/** Whether an open task belongs in a task tile. */
export function taskInTile(
  tile: OverviewTile,
  entry: { task: Task; bucket: WorkBucket },
  clock: TileClock,
): boolean {
  switch (tile) {
    case 'approvals':
      return entry.task.status === 'pending_approval'
    case 'overdue':
      return entry.bucket === 'overdue'
    case 'due_today':
      // Overdue is its own tile; counting it here as well made the two
      // overlap, so the late task is not "due today" too.
      return (
        entry.bucket !== 'overdue' &&
        // Finished or called off: there is no deadline left to meet.
        entry.bucket !== 'completed' &&
        entry.task.dueAt !== undefined &&
        entry.task.dueAt.getTime() <= clock.endToday
      )
    case 'blocked':
      return entry.task.status === 'blocked'
    default:
      return false
  }
}

/** Whether a run of a workflow belongs in a run tile. */
export function instanceInTile(
  tile: OverviewTile,
  instance: WorkflowInstance,
  clock: TileClock,
): boolean {
  switch (tile) {
    case 'active':
      return instance.status === 'active' || instance.status === 'pending_approval'
    case 'completed_week':
      return (
        instance.status === 'completed' &&
        instance.completedAt !== undefined &&
        instance.completedAt.getTime() >= clock.now.getTime() - WEEK_MS
      )
    case 'completed':
      return instance.status === 'completed'
    default:
      return false
  }
}

/** Every tile's number, from the same rules its list uses. */
export function countTiles(
  entries: { task: Task; bucket: WorkBucket }[],
  instances: WorkflowInstance[],
  clock: TileClock,
): Record<OverviewTile, number> {
  const counts = {} as Record<OverviewTile, number>
  for (const tile of OVERVIEW_TILES) {
    counts[tile] =
      TILE_COUNTS[tile] === 'tasks'
        ? entries.filter((entry) => taskInTile(tile, entry, clock)).length
        : instances.filter((instance) => instanceInTile(tile, instance, clock)).length
  }
  return counts
}

/**
 * The address of the Overview with a tile's list open, keeping whatever
 * filters are already narrowing it. Passing the open tile again closes it.
 */
export function tileHref(
  filters: OverviewFilters,
  tile: OverviewTile,
  open: OverviewTile | undefined,
): string {
  const query = new URLSearchParams()
  for (const [name, value] of Object.entries(filters)) {
    if (value !== undefined) query.set(name, String(value))
  }
  if (tile !== open) query.set('show', tile)
  const search = query.toString()
  return `/dashboard${search ? `?${search}` : ''}${tile !== open ? '#tile-list' : ''}`
}
