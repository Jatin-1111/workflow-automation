/**
 * What the records add up to (spec §16, §47).
 *
 * The management dashboard answers "what is happening now". This answers "how
 * are we doing" — how long work takes, which stage holds it up, and how often
 * it comes back. Those are the questions a workflow system can answer and a
 * spreadsheet cannot, because every stage entry and exit has been recorded.
 *
 * Pure: it takes records and returns numbers, so the arithmetic is testable
 * without a database and the same figures back both the page and its export.
 */

import type { WorkflowInstance } from '@/lib/types/instance'
import type { Task } from '@/lib/types/task'
import type { TimelineEvent } from '@/lib/types/timeline'

const HOUR = 3_600_000

export interface MetricsInput {
  instances: WorkflowInstance[]
  tasks: Task[]
  /** Rejections, which is how often work was sent back (spec §29). */
  events: TimelineEvent[]
  /** Only work touched inside this window is counted. */
  from: Date
  to: Date
}

export interface Totals {
  /** Times work was sent back for changes in this window. */
  rejections: number
  started: number
  completed: number
  inFlight: number
  /** Completed instances whose every stage met its deadline. */
  onTime: number
  onTimeRate: number | null
  medianCycleHours: number | null
}

export interface WorkflowMetric {
  workflowId: string
  started: number
  completed: number
  inFlight: number
  medianCycleHours: number | null
  onTimeRate: number | null
}

export interface StageMetric {
  workflowId: string
  stageKey: string
  stageName: string
  /** Times this stage was completed, counting each revision separately. */
  runs: number
  medianHours: number | null
  longestHours: number | null
  slaBreaches: number
  /** Times work was sent back into this stage (spec §29). */
  rework: number
  lateCompletions: number
}

export interface PersonMetric {
  userId: string
  completed: number
  late: number
  medianHours: number | null
}

export interface Metrics {
  totals: Totals
  workflows: WorkflowMetric[]
  stages: StageMetric[]
  people: PersonMetric[]
}

/** Middle value, or the mean of the middle two. Null for nothing to measure. */
export function median(values: number[]): number | null {
  if (values.length === 0) return null
  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle]
}

function hoursBetween(from: Date, to: Date): number {
  return Math.max(0, (to.getTime() - from.getTime()) / HOUR)
}

function within(at: Date | undefined, from: Date, to: Date): boolean {
  if (!at) return false
  return at.getTime() >= from.getTime() && at.getTime() <= to.getTime()
}

/** A finished task that missed the deadline it was given. */
function wasLate(task: Task): boolean {
  return Boolean(task.completedAt && task.dueAt && task.completedAt > task.dueAt)
}

function rate(part: number, whole: number): number | null {
  return whole === 0 ? null : Math.round((part / whole) * 100)
}

export function computeMetrics(input: MetricsInput): Metrics {
  const { instances, tasks, events, from, to } = input

  const startedInRange = instances.filter((instance) =>
    within(instance.startedAt, from, to),
  )
  const completedInRange = instances.filter(
    (instance) => instance.status === 'completed' && within(instance.completedAt, from, to),
  )
  const inFlight = instances.filter(
    (instance) => instance.status === 'active' || instance.status === 'pending_approval',
  )

  const tasksByInstance = new Map<string, Task[]>()
  for (const task of tasks) {
    tasksByInstance.set(task.instanceId, [
      ...(tasksByInstance.get(task.instanceId) ?? []),
      task,
    ])
  }

  /** An instance is on time when no stage of it ever missed its deadline. */
  const ranOnTime = (instance: WorkflowInstance) =>
    (tasksByInstance.get(instance.instanceId) ?? []).every((task) => !wasLate(task))

  const cycleHours = completedInRange.map((instance) =>
    hoursBetween(instance.startedAt, instance.completedAt!),
  )
  const onTime = completedInRange.filter(ranOnTime).length

  const rejections = events.filter(
    (event) => event.action === 'changes_requested' && within(event.at, from, to),
  ).length

  const totals: Totals = {
    rejections,
    started: startedInRange.length,
    completed: completedInRange.length,
    inFlight: inFlight.length,
    onTime,
    onTimeRate: rate(onTime, completedInRange.length),
    medianCycleHours: median(cycleHours),
  }

  // --- Per workflow --------------------------------------------------------

  const workflowIds = [...new Set(instances.map((instance) => instance.workflowId))]

  const workflows: WorkflowMetric[] = workflowIds.map((workflowId) => {
    const mine = completedInRange.filter((instance) => instance.workflowId === workflowId)
    return {
      workflowId,
      started: startedInRange.filter((instance) => instance.workflowId === workflowId).length,
      completed: mine.length,
      inFlight: inFlight.filter((instance) => instance.workflowId === workflowId).length,
      medianCycleHours: median(
        mine.map((instance) => hoursBetween(instance.startedAt, instance.completedAt!)),
      ),
      onTimeRate: rate(mine.filter(ranOnTime).length, mine.length),
    }
  })

  // --- Per stage -----------------------------------------------------------

  const finishedInRange = tasks.filter((task) => within(task.completedAt, from, to))

  const stageKeys = new Map<string, { workflowId: string; stageName: string }>()
  for (const task of finishedInRange) {
    stageKeys.set(`${task.workflowId}:${task.stageKey}`, {
      workflowId: task.workflowId,
      stageName: task.stageName,
    })
  }

  const stages: StageMetric[] = [...stageKeys.entries()]
    .map(([composite, meta]) => {
      const [, stageKey] = composite.split(':')
      const runs = finishedInRange.filter(
        (task) => task.workflowId === meta.workflowId && task.stageKey === stageKey,
      )
      const durations = runs.map((task) => hoursBetween(task.activatedAt, task.completedAt!))

      return {
        workflowId: meta.workflowId,
        stageKey,
        stageName: meta.stageName,
        runs: runs.length,
        medianHours: median(durations),
        longestHours: durations.length > 0 ? Math.max(...durations) : null,
        slaBreaches: runs.filter(
          (task) => task.slaBreachAt && task.completedAt! > task.slaBreachAt,
        ).length,
        // Extra passes: a stage run more than once for the same instance.
        rework: runs.filter((task) => task.revisionRound > 1).length,
        lateCompletions: runs.filter(wasLate).length,
      }
    })
    .sort((a, b) => (b.medianHours ?? 0) - (a.medianHours ?? 0))

  // --- Per person ----------------------------------------------------------

  const peopleIds = [...new Set(finishedInRange.flatMap((task) => task.completedBy))]

  const people: PersonMetric[] = peopleIds
    .map((userId) => {
      const mine = finishedInRange.filter((task) => task.completedBy.includes(userId))
      return {
        userId,
        completed: mine.length,
        late: mine.filter(wasLate).length,
        medianHours: median(
          mine.map((task) => hoursBetween(task.activatedAt, task.completedAt!)),
        ),
      }
    })
    .sort((a, b) => b.completed - a.completed)

  return { totals, workflows, stages, people }
}

/** Hours rendered the way someone would say them. */
export function formatHours(hours: number | null): string {
  if (hours === null) return '—'
  if (hours < 1) return `${Math.round(hours * 60)}m`
  if (hours < 48) return `${hours.toFixed(1)}h`
  return `${(hours / 24).toFixed(1)}d`
}

export const REPORT_RANGES = {
  '7': 'Last 7 days',
  '30': 'Last 30 days',
  '90': 'Last 90 days',
  all: 'All time',
} as const

export type ReportRange = keyof typeof REPORT_RANGES

/** Turn a range choice into the window it means. */
export function rangeWindow(range: ReportRange, now: Date): { from: Date; to: Date } {
  if (range === 'all') return { from: new Date(0), to: now }
  return {
    from: new Date(now.getTime() - Number(range) * 24 * HOUR),
    to: now,
  }
}
