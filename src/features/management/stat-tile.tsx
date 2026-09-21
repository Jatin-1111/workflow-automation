/** A single headline number on the management dashboard (spec §16). */

import Link from 'next/link'

export function StatTile({
  label,
  value,
  tone = 'neutral',
  href,
}: {
  label: string
  value: number
  tone?: 'neutral' | 'alert' | 'action' | 'good'
  href?: string
}) {
  // A zero is not news. Only a number that matters takes on a colour, so the
  // ones that do stand out instead of competing with seven others.
  const emphasise = value > 0
  const valueTone =
    !emphasise || tone === 'neutral'
      ? 'text-foreground'
      : tone === 'alert'
        ? 'text-status-overdue'
        : tone === 'action'
          ? 'text-status-action'
          : 'text-status-complete'

  const body = (
    <>
      <span className="block text-xs font-medium text-muted">{label}</span>
      <span
        className={`mt-1.5 block text-3xl font-semibold tabular-nums tracking-tight ${valueTone}`}
      >
        {value}
      </span>
    </>
  )

  const shared = 'rounded-xl border border-border bg-surface px-5 py-4'
  return href ? (
    <Link href={href} className={`${shared} block transition hover:border-border-strong`}>
      {body}
    </Link>
  ) : (
    <div className={shared}>{body}</div>
  )
}
