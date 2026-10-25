/**
 * What a page shows while its data is still being fetched.
 *
 * Every page here is dynamic and queries MongoDB, so navigation used to sit
 * on the previous screen with no sign anything was happening — worst on a
 * cold serverless start, where that is measured in seconds. This is the shape
 * of the page arriving, not a spinner: it tells you which page you are on.
 *
 * It fills the container the layout provides, which is the frame the page
 * will have, and keeps the measure of the page it stands in for: it was
 * always 1280px wide, so a narrower page jumped inwards as it arrived.
 */

import { Skeleton } from './primitives'

/**
 * The measure of the page being waited for. Everything starts at the same
 * left edge; a narrow page limits its own content and stays left-aligned.
 */
export type SkeletonWidth = 'full' | '5xl' | '4xl' | '3xl'

const WIDTHS: Record<SkeletonWidth, string> = {
  full: '',
  '5xl': 'max-w-5xl',
  '4xl': 'max-w-4xl',
  '3xl': 'max-w-3xl',
}

export function PageSkeleton({
  rows = 5,
  tiles = 0,
  width = 'full',
}: {
  rows?: number
  tiles?: number
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
        <div className="mb-6 overflow-hidden rounded-xl border border-border bg-surface">
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

      <div className="overflow-hidden rounded-xl border border-border bg-surface">
        <div className="border-b border-border px-5 py-3.5">
          <Skeleton className="h-4 w-40" />
        </div>
        <div className="divide-y divide-border">
          {Array.from({ length: rows }, (_, i) => (
            <div key={i} className="flex items-center gap-4 px-5 py-4">
              <span className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-3 w-1/2" />
              </span>
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
