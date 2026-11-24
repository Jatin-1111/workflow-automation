/**
 * A column heading that sorts its table.
 *
 * A link, not a script: the sort is in the address, so it works before any
 * JavaScript has loaded and can be shared. The arrow shows which way the
 * column is sorted; `aria-sort` says the same to assistive technology.
 */

import Link from 'next/link'
import { ArrowDown, ArrowUp } from 'lucide-react'
import { nextSort, type SortDirection, type SortState } from './sort'

export function SortHeader<Key extends string>({
  label,
  field,
  current,
  path,
  firstDirection = 'asc',
  numeric = false,
  className = '',
}: {
  label: string
  field: Key
  current: SortState<Key>
  /** The page's own path, so the link keeps the reader where they are. */
  path: string
  /** Which way a first click goes: names ascend, counts descend. */
  firstDirection?: SortDirection
  numeric?: boolean
  className?: string
}) {
  const active = current.key === field
  const next = nextSort(current, field, firstDirection)

  return (
    <th
      scope="col"
      aria-sort={active ? (current.direction === 'asc' ? 'ascending' : 'descending') : undefined}
      className={`px-5 py-2.5 font-bold ${numeric ? 'text-right' : 'text-left'} ${className}`}
    >
      <Link
        href={`${path}?sort=${next.key}&dir=${next.direction}`}
        scroll={false}
        className={`transition-ui inline-flex items-center gap-1 rounded hover:text-foreground ${
          numeric ? 'flex-row-reverse' : ''
        } ${active ? 'text-foreground' : ''}`}
      >
        {label}
        {active ? (
          current.direction === 'asc' ? (
            <ArrowUp size={12} strokeWidth={2.25} aria-hidden />
          ) : (
            <ArrowDown size={12} strokeWidth={2.25} aria-hidden />
          )
        ) : (
          <span aria-hidden className="size-3" />
        )}
      </Link>
    </th>
  )
}
