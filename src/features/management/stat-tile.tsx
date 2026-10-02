/** A single headline number on the management dashboard (spec §16). */

import Link from 'next/link'
import { LinkPending } from '@/features/ui/link-pending'
import type { LucideIcon } from 'lucide-react'

export type StatTone = 'neutral' | 'alert' | 'action' | 'good' | 'progress'

/**
 * Tone decides two different things, and they are deliberately not the same.
 *
 * The chip is coloured always: it says what kind of number this is, which is
 * true whatever the number happens to be, and it is what stops eight tiles
 * from reading as eight identical white boxes.
 *
 * The number is coloured only when there is something to say. A zero is not
 * news — colouring `0 overdue` red would spend the loudest thing on the page
 * on the best possible outcome.
 */
const TONES: Record<StatTone, { chip: string; value: string }> = {
  neutral: { chip: 'bg-surface-sunken text-muted', value: 'text-foreground' },
  progress: {
    chip: 'bg-status-progress-soft text-status-progress',
    value: 'text-foreground',
  },
  action: {
    chip: 'bg-status-action-soft text-status-action',
    value: 'text-status-action',
  },
  alert: {
    chip: 'bg-status-overdue-soft text-status-overdue',
    value: 'text-status-overdue',
  },
  good: {
    chip: 'bg-status-complete-soft text-status-complete',
    value: 'text-status-complete',
  },
}

export function StatTile({
  label,
  value,
  tone = 'neutral',
  icon: Glyph,
  href,
  selected = false,
}: {
  label: string
  value: number
  tone?: StatTone
  icon?: LucideIcon
  href?: string
  /** Its list is the one open beneath the tiles. */
  selected?: boolean
}) {
  const palette = TONES[tone]
  const valueTone = value > 0 ? palette.value : 'text-foreground'

  const body = (
    <>
      {Glyph ? (
        <span
          aria-hidden
          className={`mb-3 flex size-8 items-center justify-center rounded-lg ${palette.chip}`}
        >
          <Glyph size={16} strokeWidth={2} />
        </span>
      ) : null}
      <span className="block text-xs font-medium text-muted">{label}</span>
      <span
        className={`mt-1 block text-3xl font-semibold tabular-nums tracking-tight ${valueTone}`}
      >
        {value}
      </span>
    </>
  )

  // The border colour is chosen once per state: with two colour utilities on
  // one element, the stylesheet's order decides, and the selected border lost.
  const shared = 'rounded-xl border bg-surface px-5 py-4'
  return href ? (
    <Link
      href={href}
      aria-current={selected ? 'true' : undefined}
      className={`${shared} relative block transition-ui hover:shadow-sm ${
        selected ? 'border-accent ring-2 ring-accent-soft' : 'border-border hover:border-accent-ring'
      }`}
    >
      {body}
      <LinkPending />
    </Link>
  ) : (
    <div className={`${shared} border-border`}>{body}</div>
  )
}
