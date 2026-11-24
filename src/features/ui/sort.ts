/**
 * Sorting a table from its address.
 *
 * The column and direction live in the query string (`?sort=overdue&dir=desc`)
 * so a sorted view can be bookmarked, shared and reloaded, and so the page
 * stays a server component. Anything not in the allowed list falls back to the
 * default, which is also what stops a stray value from reaching a sort.
 *
 * Pure.
 */

export type SortDirection = 'asc' | 'desc'

export interface SortState<Key extends string> {
  key: Key
  direction: SortDirection
}

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value
}

export function parseSort<Key extends string>(
  params: { sort?: string | string[]; dir?: string | string[] },
  allowed: readonly Key[],
  fallback: SortState<Key>,
): SortState<Key> {
  const key = first(params.sort)
  const direction = first(params.dir)
  if (!key || !(allowed as readonly string[]).includes(key)) return fallback
  return { key: key as Key, direction: direction === 'desc' ? 'desc' : 'asc' }
}

/** What clicking a column does: the same column again flips it. */
export function nextSort<Key extends string>(
  current: SortState<Key>,
  key: Key,
  firstDirection: SortDirection,
): SortState<Key> {
  if (current.key !== key) return { key, direction: firstDirection }
  return { key, direction: current.direction === 'asc' ? 'desc' : 'asc' }
}

/**
 * A stable sort on one value, ties broken by the second so equal rows never
 * shuffle between page loads. Text compares in the reader's alphabet, numbers
 * as numbers; a missing value always sorts last whichever way it faces.
 */
export function sortRows<Row>(
  rows: readonly Row[],
  pick: (row: Row) => string | number | null | undefined,
  direction: SortDirection,
  tiebreak: (row: Row) => string,
): Row[] {
  const sign = direction === 'asc' ? 1 : -1
  return [...rows].sort((a, b) => {
    const left = pick(a)
    const right = pick(b)
    const leftMissing = left === null || left === undefined
    const rightMissing = right === null || right === undefined
    if (leftMissing || rightMissing) {
      if (leftMissing && rightMissing) return tiebreak(a).localeCompare(tiebreak(b))
      return leftMissing ? 1 : -1
    }
    const order =
      typeof left === 'number' && typeof right === 'number'
        ? left - right
        : String(left).localeCompare(String(right))
    return order !== 0 ? order * sign : tiebreak(a).localeCompare(tiebreak(b))
  })
}
