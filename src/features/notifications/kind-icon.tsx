/**
 * The glyph for a kind of notification (spec §41).
 *
 * A list of a hundred notices reads as a wall of text without something to
 * scan by. The icon carries the same meaning as the label beside it and is
 * hidden from assistive technology rather than duplicated aloud, and the tint
 * reuses the status colours the rest of the platform already uses for the
 * same ideas — overdue is the overdue colour here too.
 */

import {
  BellRing,
  CircleCheckBig,
  CircleX,
  Clock,
  FileUp,
  Inbox,
  RotateCcw,
  Stamp,
  UserRoundCheck,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { NotificationKind } from '@/lib/types/notification'
import type { StatusTone } from '@/features/ui/primitives'

const GLYPHS: Record<NotificationKind, { icon: LucideIcon; tone: StatusTone }> = {
  task_assigned: { icon: Inbox, tone: 'action' },
  task_reassigned: { icon: UserRoundCheck, tone: 'action' },
  approval_required: { icon: Stamp, tone: 'progress' },
  changes_requested: { icon: RotateCcw, tone: 'waiting' },
  file_uploaded: { icon: FileUp, tone: 'neutral' },
  stage_completed: { icon: CircleCheckBig, tone: 'complete' },
  deadline_approaching: { icon: Clock, tone: 'waiting' },
  task_overdue: { icon: BellRing, tone: 'overdue' },
  workflow_completed: { icon: CircleCheckBig, tone: 'complete' },
  task_held: { icon: Clock, tone: 'waiting' },
  workflow_cancelled: { icon: CircleX, tone: 'overdue' },
}

const TINTS: Record<StatusTone, string> = {
  neutral: 'bg-status-neutral-soft text-status-neutral',
  progress: 'bg-status-progress-soft text-status-progress',
  action: 'bg-status-action-soft text-status-action',
  waiting: 'bg-status-waiting-soft text-status-waiting',
  overdue: 'bg-status-overdue-soft text-status-overdue',
  complete: 'bg-status-complete-soft text-status-complete',
}

export function KindIcon({ kind }: { kind: NotificationKind }) {
  const glyph = GLYPHS[kind] ?? { icon: Inbox, tone: 'neutral' as StatusTone }
  const Glyph = glyph.icon

  return (
    <span
      aria-hidden
      className={`flex size-8 shrink-0 items-center justify-center rounded-full ${TINTS[glyph.tone]}`}
    >
      <Glyph size={16} strokeWidth={1.75} />
    </span>
  )
}
