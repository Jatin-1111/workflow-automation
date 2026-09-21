/** Status and priority indicators (spec §42, §50). */

import { Pill, type StatusTone } from '@/features/ui/primitives'
import { humanise } from './format'
import type { Priority, TaskStatus } from '@/lib/types/status'

const STATUS_TONE: Record<TaskStatus, StatusTone> = {
  not_started: 'neutral',
  in_progress: 'progress',
  waiting: 'waiting',
  pending_approval: 'action',
  completed: 'complete',
  overdue: 'overdue',
  blocked: 'overdue',
  cancelled: 'neutral',
}

/**
 * Priority is shown only when it is worth acting on.
 *
 * Marking everything means marking nothing, so medium and low carry no
 * indicator at all.
 */
function priorityTone(priority: Priority): StatusTone | null {
  if (priority === 'urgent') return 'overdue'
  if (priority === 'high') return 'action'
  return null
}

export function StatusBadge({
  status,
  priority,
}: {
  status: TaskStatus
  priority?: Priority
}) {
  const urgency = priority ? priorityTone(priority) : null

  return (
    <span className="flex items-center gap-2">
      {urgency && priority ? (
        <span
          title={`${humanise(priority)} priority`}
          aria-label={`${humanise(priority)} priority`}
          className={`size-1.5 shrink-0 rounded-full ${
            urgency === 'overdue' ? 'bg-status-overdue' : 'bg-status-action'
          }`}
        />
      ) : null}
      <Pill tone={STATUS_TONE[status]}>{humanise(status)}</Pill>
    </span>
  )
}
