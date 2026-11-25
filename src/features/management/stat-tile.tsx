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

/* A column, with the figure pushed to the bottom: a label that wraps to two
   lines ("Active workflows") otherwise drops its number below its
   neighbours', and a row of figures stops reading as a row. */
const CELL = 'relative flex flex-col border-b border-r border-border px-5 py-4'

const COLUMNS = {
  2: 'grid-cols-1 sm:grid-cols-2',
  3: 'grid-cols-1 sm:grid-cols-3',
  4: 'grid-cols-2 lg:grid-cols-4',
  /** One row of eight, the first two wider: the Overview's ribbon. */
  ribbon: 'grid-cols-2 sm:grid-cols-4 lg:grid-cols-[repeat(2,minmax(0,1.6fr))_repeat(6,minmax(0,1fr))]',
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

/**
 * How loud a figure is. Only the Overview's ribbon uses anything but `base`:
 * the two numbers a manager acts on are `lead`, the ones that are history or
 * a count of things are `quiet`.
 */
export type StatSize = 'lead' | 'base' | 'quiet'

const SIZES: Record<StatSize, string> = {
  lead: 'text-[2.25rem]',
  base: 'text-[1.75rem]',
  quiet: 'text-[1.375rem]',
}

export function StatTile({
  label,
  value,
  tone = 'neutral',
  icon: Glyph,
  href,
  selected = false,
  note,
  size = 'base',
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
  size?: StatSize
}) {
  const hasValue = typeof value === 'number' ? value > 0 : true
  // 1284, not 1,284, is arithmetic for the reader; and a figure past five
  // characters would crowd a narrow cell, so it steps down one size.
  const shown = typeof value === 'number' ? value.toLocaleString('en-GB') : value
  const stepDown = String(shown).length > 5
  const figureSize = stepDown ? (size === 'lead' ? SIZES.base : SIZES.quiet) : SIZES[size]
  const valueTone = hasValue
    ? size === 'quiet' && tone !== 'alert'
      ? 'text-muted'
      : TONES[tone]
    : size === 'quiet'
      ? 'text-muted'
      : 'text-foreground'

  const body = (
    <>
      {/* The icon sits on the label's first line: centred, it floated between
          the two lines of a wrapped label ("Active workflows"). */}
      <span className="flex items-start justify-between gap-2">
        <span className="text-xs font-medium leading-4 text-muted">{label}</span>
        {Glyph ? (
          <Glyph aria-hidden size={14} strokeWidth={1.75} className="mt-px shrink-0 text-subtle" />
        ) : null}
      </span>
      <span
        // text-box trims the line box to the digits' cap height and baseline.
        // Without it the space under a figure scales with its font size, so
        // the 36px, 28px and 22px figures all ended on different lines even
        // though their boxes were pinned to the same bottom edge.
        className={`mt-auto block pt-2.5 ${figureSize} font-semibold leading-none tracking-[-0.025em] tabular-nums [text-box:trim-both_cap_alphabetic] ${valueTone}`}
      >
        {shown}
      </span>
      {note ? <span className="mt-2 block text-xs text-muted">{note}</span> : null}
    </>
  )

  return href ? (
    <Link
      href={href}
      aria-current={selected ? 'true' : undefined}
      className={`${CELL} transition-ui ${
        selected
          ? 'bg-accent-soft'
          : 'hover:bg-surface-sunken active:bg-accent-soft'
      }`}
    >
      {body}
      <LinkPending />
    </Link>
  ) : (
    <div className={CELL}>{body}</div>
  )
}
