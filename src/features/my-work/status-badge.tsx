/** Status and priority indicators (spec §42, §50). */

import { humanise } from './format'
import type { Priority, TaskStatus } from '@/lib/types/status'

const STATUS_TONE: Record<TaskStatus, string> = {
  not_started: 'border-border text-muted',
  in_progress: 'border-border text-status-progress',
  waiting: 'border-border text-status-waiting',
  pending_approval: 'border-border text-status-action',
  completed: 'border-border text-status-complete',
  overdue: 'border-border text-status-overdue',
  blocked: 'border-border text-status-overdue',
  cancelled: 'border-border text-subtle',
}

export function StatusBadge({
  status,
  priority,
}: {
  status: TaskStatus
  priority?: Priority
}) {
  return (
    <span className="flex items-center gap-2">
      {priority === 'urgent' || priority === 'high' ? (
        <span
          title={`${humanise(priority)} priority`}
          aria-label={`${humanise(priority)} priority`}
          className={
            priority === 'urgent'
              ? 'size-1.5 rounded-full bg-status-overdue'
              : 'size-1.5 rounded-full bg-status-action'
          }
        />
      ) : null}
      <span
        className={`w-32 shrink-0 rounded border px-2 py-1 text-center text-[11px] font-medium ${STATUS_TONE[status]}`}
      >
        {humanise(status)}
      </span>
    </span>
  )
}
