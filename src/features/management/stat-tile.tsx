/**
 * The headline numbers on a management page (spec §16).
 *
 * They were eight separate white boxes, each with a coloured icon chip: a
 * grid of cards of equal weight with decoration doing the job the number
 * should. They are now cells in one strip, divided by hairlines, so a row of
 * figures reads as a row of figures. The dividers are borders on each cell
 * rather than a coloured gap between them, so a last row that does not fill
 * leaves white space, not a grey hole.
 */

import Link from 'next/link'
import type { LucideIcon } from 'lucide-react'
import { LinkPending } from '@/features/ui/link-pending'

export type StatTone = 'neutral' | 'alert' | 'action' | 'good' | 'progress'

/**
 * Tone colours the number, and only when there is something to say. A zero is
 * not news — colouring `0 overdue` red would spend the loudest thing on the
 * page on the best possible outcome.
 */
const TONES: Record<StatTone, string> = {
  neutral: 'text-foreground',
  progress: 'text-foreground',
  action: 'text-status-action',
  alert: 'text-status-overdue',
  good: 'text-status-complete',
}

const CELL = 'relative block border-b border-r border-border px-5 py-4'

const COLUMNS = {
  2: 'grid-cols-1 sm:grid-cols-2',
  3: 'grid-cols-1 sm:grid-cols-3',
  4: 'grid-cols-2 lg:grid-cols-4',
} as const

export function StatStrip({
  columns = 4,
  className = '',
  children,
}: {
  /** How many figures sit side by side on a wide screen. */
  columns?: keyof typeof COLUMNS
  className?: string
  children: React.ReactNode
}) {
  return (
    <div
      className={`rise overflow-hidden rounded-xl border border-border bg-surface ${className}`}
    >
      {/* The negative margin hides the last column's and row's dividers
          behind the frame, so the strip needs no special-casing at its end. */}
      <div className={`-mb-px -mr-px grid ${COLUMNS[columns]}`}>{children}</div>
    </div>
  )
}

export function StatTile({
  label,
  value,
  tone = 'neutral',
  icon: Glyph,
  href,
  selected = false,
  note,
}: {
  label: string
  value: number | string
  tone?: StatTone
  icon?: LucideIcon
  href?: string
  /** Its list is the one open beneath the strip. */
  selected?: boolean
  /** A line of context under the number, for a figure that needs one. */
  note?: string
}) {
  const hasValue = typeof value === 'number' ? value > 0 : true
  const valueTone = hasValue ? TONES[tone] : 'text-foreground'

  const body = (
    <>
      <span className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-muted">{label}</span>
        {Glyph ? <Glyph aria-hidden size={14} strokeWidth={1.75} className="text-subtle" /> : null}
      </span>
      <span
        className={`mt-2.5 block text-[1.75rem] font-semibold leading-none tracking-[-0.025em] tabular-nums ${valueTone}`}
      >
        {value}
      </span>
      {note ? <span className="mt-2 block text-xs text-muted">{note}</span> : null}
    </>
  )

  return href ? (
    <Link
      href={href}
      aria-current={selected ? 'true' : undefined}
      className={`${CELL} transition-ui ${
        selected ? 'bg-accent-soft' : 'hover:bg-surface-sunken'
      }`}
    >
      {body}
      <LinkPending />
    </Link>
  ) : (
    <div className={CELL}>{body}</div>
  )
}
