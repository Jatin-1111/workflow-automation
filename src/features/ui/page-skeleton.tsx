/**
 * What a page shows while its data is still being fetched.
 *
 * Every page here is dynamic and queries MongoDB, so navigation used to sit
 * on the previous screen with no sign anything was happening — worst on a
 * cold serverless start, where that is measured in seconds. This is the shape
 * of the page arriving, not a spinner: it tells you which page you are on.
 *
 * It fills only the space beneath the header, which stays on screen. And it
 * is as wide as the page it stands in for: it was always 1280px, so a
 * narrower page — Notifications is 768px — jumped inwards as it arrived.
 */

import { Skeleton } from './primitives'

/**
 * The page's own width, or "framed" for a page drawn inside a layout that
 * already provides the frame (the Overview views).
 */
export type SkeletonWidth = 'full' | '7xl' | '6xl' | '5xl' | '4xl' | '3xl' | 'framed'

const WIDTHS: Record<Exclude<SkeletonWidth, 'framed'>, string> = {
  full: '',
  '7xl': 'max-w-7xl',
  '6xl': 'max-w-6xl',
  '5xl': 'max-w-5xl',
  '4xl': 'max-w-4xl',
  '3xl': 'max-w-3xl',
}

export function PageSkeleton({
  rows = 5,
  tiles = 0,
  width = '7xl',
}: {
  rows?: number
  tiles?: number
  width?: SkeletonWidth
}) {
  const body = (
    <>
      <span className="sr-only" role="status">
        Loading
      </span>

      <div className="mb-6 space-y-2">
        <Skeleton className="h-7 w-56" />
        <Skeleton className="h-4 w-80" />
      </div>

      {tiles > 0 ? (
        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: tiles }, (_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
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
    </>
  )

  if (width === 'framed') return body
  return <main className={`mx-auto w-full ${WIDTHS[width]} px-4 py-8 sm:px-6`}>{body}</main>
}
