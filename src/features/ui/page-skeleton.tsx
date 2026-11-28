/**
 * What a page shows while its data is still being fetched.
 *
 * Every page here is dynamic and queries MongoDB, so navigation used to sit
 * on the previous screen with no sign anything was happening — worst on a
 * cold serverless start, where that is measured in seconds. This is the shape
 * of the page arriving, not a spinner: it tells you which page you are on.
 *
 * It fills the container the layout provides, which is the frame the page
 * will have, and keeps the measure of the page it stands in for: a page that
 * is narrower than the frame says so with `width`, and one that fills it
 * (almost all of them) leaves it alone. A skeleton narrower than its page
 * makes the page jump outwards as it arrives, so the width is set to what the
 * page does, never to what looks tidy.
 *
 * A page that is a table passes `columns`, so what shows is a header and rows
 * laid out like the table, in the same panel shape, instead of a list that
 * turns into columns the moment it loads.
 */

import { Skeleton } from './primitives'

/**
 * The measure of the page being waited for. Everything starts at the same
 * left edge; a narrow page limits its own content and stays left-aligned.
 */
export type SkeletonWidth = 'full' | '4xl'

const WIDTHS: Record<SkeletonWidth, string> = {
  full: '',
  '4xl': 'max-w-4xl',
}

/** The same shape as a real panel: 2xl corners, a hairline, a heading band. */
const PANEL = 'overflow-hidden rounded-2xl border border-border bg-surface'

/** First column wide for the name, the rest sharing what is left. */
function columnTemplate(columns: number): React.CSSProperties {
  return { gridTemplateColumns: `minmax(10rem, 2fr) repeat(${columns - 1}, minmax(4rem, 1fr))` }
}

function TableSkeleton({ columns, rows }: { columns: number; rows: number }) {
  const template = columnTemplate(columns)

  return (
    <div className="min-w-[40rem]">
      <div
        style={template}
        className="grid items-center gap-4 border-b border-border bg-surface-sunken px-5 py-3"
      >
        {Array.from({ length: columns }, (_, column) => (
          <Skeleton key={column} className={`h-3 ${column === 0 ? 'w-16' : 'w-12'}`} />
        ))}
      </div>
      <div className="divide-y divide-border-soft">
        {Array.from({ length: rows }, (_, row) => (
          <div key={row} style={template} className="grid items-center gap-4 px-5 py-3.5">
            <span className="min-w-0 space-y-2">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-3 w-1/3" />
            </span>
            {Array.from({ length: columns - 1 }, (_, column) => (
              <Skeleton key={column} className="h-4 w-3/5" />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

function ListSkeleton({ rows }: { rows: number }) {
  return (
    <div className="divide-y divide-border-soft">
      {Array.from({ length: rows }, (_, row) => (
        <div key={row} className="flex items-center gap-4 px-5 py-4">
          <span className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-3 w-1/2" />
          </span>
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
      ))}
    </div>
  )
}

export function PageSkeleton({
  rows = 5,
  tiles = 0,
  columns = 0,
  width = 'full',
}: {
  rows?: number
  tiles?: number
  /** Lay the rows out as a table of this many columns. */
  columns?: number
  width?: SkeletonWidth
}) {
  return (
    <div className={WIDTHS[width]}>
      <span className="sr-only" role="status">
        Loading
      </span>

      <div className="mb-6 space-y-2">
        <Skeleton className="h-7 w-56" />
        <Skeleton className="h-4 w-80" />
      </div>

      {tiles > 0 ? (
        <div className={`mb-6 ${PANEL}`}>
          <div className="-mb-px -mr-px grid grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: Math.min(tiles, 8) }, (_, i) => (
              <div key={i} className="space-y-3 border-b border-r border-border px-5 py-4">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-7 w-12" />
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className={PANEL}>
        <div className="border-b border-border px-5 py-4">
          <Skeleton className="h-4 w-40" />
        </div>
        {columns > 1 ? <TableSkeleton columns={columns} rows={rows} /> : <ListSkeleton rows={rows} />}
      </div>
    </div>
  )
}
