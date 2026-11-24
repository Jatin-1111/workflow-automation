/**
 * Work started and work finished over the period, as paired bars.
 *
 * Two bars per bucket: what began (the brand colour) and what finished (the
 * ink). The shape that matters is the gap between them: finishing less than
 * starting means work is piling up. Heights are relative to the busiest bucket
 * in view, so the chart always uses its full height, and the top gridline says
 * what that is.
 *
 * Drawn from plain boxes rather than a chart library: there is nothing to
 * hover for that the title does not already say, and a table of the same
 * figures follows for assistive technology, since a chart cannot be read aloud.
 */

import type { ThroughputPoint } from '@/lib/workflow/metrics'

const DAY = 86_400_000

function label(point: ThroughputPoint): string {
  const lastDay = new Date(point.end.getTime() - 1)
  const spanDays = Math.round((point.end.getTime() - point.start.getTime()) / DAY)
  const fmt = (d: Date) => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
  return spanDays <= 1
    ? fmt(lastDay)
    : `${fmt(new Date(point.start.getTime() + 1))} to ${fmt(lastDay)}`
}

export function TrendChart({ points }: { points: ThroughputPoint[] }) {
  const peak = Math.max(1, ...points.flatMap((point) => [point.started, point.completed]))
  const started = points.reduce((sum, point) => sum + point.started, 0)
  const completed = points.reduce((sum, point) => sum + point.completed, 0)

  if (started === 0 && completed === 0) {
    return (
      <p className="my-auto px-5 py-10 text-center text-sm leading-relaxed text-muted">
        Nothing was started or finished in this period.
      </p>
    )
  }

  const first = points[0]
  const middle = points[Math.floor(points.length / 2)]
  const last = points.at(-1)!

  return (
    <div className="px-5 pb-5 pt-4">
      <div className="mb-4 flex flex-wrap items-center gap-x-5 gap-y-1 text-xs font-semibold">
        <span className="flex items-center gap-2 text-foreground">
          <span aria-hidden className="size-2.5 rounded-sm bg-accent" />
          Started <span className="font-medium tabular-nums text-muted">{started}</span>
        </span>
        <span className="flex items-center gap-2 text-foreground">
          <span aria-hidden className="size-2.5 rounded-sm bg-foreground" />
          Finished <span className="font-medium tabular-nums text-muted">{completed}</span>
        </span>
      </div>

      <div className="grid grid-cols-[2rem_minmax(0,1fr)] gap-x-2">
        {/* The scale: the top line is the busiest bucket, the bottom is zero. */}
        <div
          aria-hidden
          className="flex flex-col justify-between text-right text-xs tabular-nums text-subtle"
        >
          <span>{peak}</span>
          <span>0</span>
        </div>

        <div
          role="img"
          aria-label={`Work started and finished, ${points.length} periods: ${started} started, ${completed} finished.`}
          className="relative h-44 border-b border-border-strong"
        >
          <span
            aria-hidden
            className="absolute inset-x-0 top-0 border-t border-dashed border-border"
          />
          <span
            aria-hidden
            className="absolute inset-x-0 top-1/2 border-t border-dashed border-border/70"
          />

          <ol className="absolute inset-0 flex items-end gap-[3px]">
            {points.map((point) => (
              <li
                key={point.start.toISOString()}
                title={`${label(point)}: ${point.started} started, ${point.completed} finished`}
                className="group flex h-full min-w-0 flex-1 items-end justify-center gap-px"
              >
                <span
                  className="w-full max-w-3 rounded-t-sm bg-accent transition-opacity group-hover:opacity-80"
                  style={{
                    height: `${(point.started / peak) * 100}%`,
                    minHeight: point.started ? 3 : 0,
                  }}
                />
                <span
                  className="w-full max-w-3 rounded-t-sm bg-foreground transition-opacity group-hover:opacity-80"
                  style={{
                    height: `${(point.completed / peak) * 100}%`,
                    minHeight: point.completed ? 3 : 0,
                  }}
                />
              </li>
            ))}
          </ol>
        </div>

        <span />
        <div aria-hidden className="mt-2 flex justify-between text-xs text-subtle">
          <span>{label(first)}</span>
          {points.length > 6 ? <span className="max-sm:hidden">{label(middle)}</span> : null}
          <span>{label(last)}</span>
        </div>
      </div>

      <table className="sr-only">
        <caption>Work started and finished by period</caption>
        <thead>
          <tr>
            <th scope="col">Period</th>
            <th scope="col">Started</th>
            <th scope="col">Finished</th>
          </tr>
        </thead>
        <tbody>
          {points.map((point) => (
            <tr key={point.start.toISOString()}>
              <th scope="row">{label(point)}</th>
              <td>{point.started}</td>
              <td>{point.completed}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
