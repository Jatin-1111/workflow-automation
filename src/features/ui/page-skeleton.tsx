/**
 * What a page shows while its data is still being fetched.
 *
 * Every page here is dynamic and queries MongoDB, so navigation used to sit
 * on the previous screen with no sign anything was happening — worst on a
 * cold serverless start, where that is measured in seconds. This is the shape
 * of the page arriving, not a spinner: it tells you which page you are on.
 */

import { Skeleton } from './primitives'

export function PageSkeleton({
  rows = 5,
  tiles = 0,
}: {
  rows?: number
  tiles?: number
}) {
  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">
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
    </main>
  )
}
