/**
 * The list a headline number opens, directly beneath the numbers.
 *
 * Directly beneath, because the other way in to the same work — the Stuck
 * work panel — started below the bottom of the screen under a heading that
 * did not match the tile, and the tile itself did nothing.
 */

import Link from 'next/link'
import { buttonClass, Empty, Panel } from '@/features/ui/primitives'
import { formatDeadline } from '@/features/my-work/format'
import { TILE_EMPTY, TILE_LABELS, tileHref } from './overview-tiles'
import type { OverviewFilters } from './filters'
import type { TileList } from './queries'

export function TileListPanel({
  list,
  filters,
  now,
}: {
  list: TileList
  filters: OverviewFilters
  now: Date
}) {
  const cut = list.total - list.rows.length

  return (
    // Clear of the sticky header, which is about 108px tall: jumping here
    // used to tuck the list's own heading underneath it.
    <div id="tile-list" className="mt-4 scroll-mt-32">
      <Panel
        title={TILE_LABELS[list.tile]}
        count={list.total}
        actions={
          <Link href={tileHref(filters, list.tile, list.tile)} className={buttonClass('quiet', 'sm')}>
            Close
          </Link>
        }
      >
        {list.rows.length === 0 ? (
          <Empty>{TILE_EMPTY[list.tile]}</Empty>
        ) : (
          <ul className="divide-y divide-border">
            {list.rows.map((row) => {
              const deadline = row.dueAt ? formatDeadline(row.dueAt, now) : undefined
              const body = (
                <>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs text-subtle">{row.context}</span>
                    <span className="mt-0.5 block text-sm font-medium">{row.title}</span>
                    {row.people.length > 0 ? (
                      <span className="block text-xs text-muted">
                        With {row.people.join(', ')}
                      </span>
                    ) : null}
                  </span>
                  <span className="shrink-0 text-right text-xs">
                    {deadline ? (
                      <span
                        className={`block ${
                          deadline.overdue ? 'font-medium text-status-overdue' : 'text-muted'
                        }`}
                      >
                        {deadline.label}
                      </span>
                    ) : null}
                    {row.note ? <span className="block text-subtle">{row.note}</span> : null}
                  </span>
                </>
              )
              return (
                <li key={row.key}>
                  {row.href ? (
                    <Link
                      href={row.href}
                      className="flex items-start gap-4 px-5 py-3 transition-ui hover:bg-surface-sunken"
                    >
                      {body}
                    </Link>
                  ) : (
                    <div className="flex items-start gap-4 px-5 py-3">{body}</div>
                  )}
                </li>
              )
            })}
          </ul>
        )}
        {cut > 0 ? (
          <p className="border-t border-border px-5 py-3 text-xs text-muted">
            Showing the first {list.rows.length} of {list.total}. Use the filters above to
            narrow it down.
          </p>
        ) : null}
      </Panel>
    </div>
  )
}
