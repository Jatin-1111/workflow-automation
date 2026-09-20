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
  const valueTone =
    tone === 'alert'
      ? 'text-status-overdue'
      : tone === 'action'
        ? 'text-status-action'
        : tone === 'good'
          ? 'text-status-complete'
          : 'text-foreground'

  const body = (
    <>
      <span className="block text-[11px] font-medium uppercase tracking-wide text-subtle">
        {label}
      </span>
      <span className={`mt-1 block text-2xl font-semibold tabular-nums ${valueTone}`}>
        {value}
      </span>
    </>
  )

  const shared = 'rounded-lg border border-border bg-surface p-4'
  return href ? (
    <Link href={href} className={`${shared} block transition hover:border-border-strong`}>
      {body}
    </Link>
  ) : (
    <div className={shared}>{body}</div>
  )
}
