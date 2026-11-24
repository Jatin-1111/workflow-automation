/**
 * A workflow run, drawn as a line with a station for each stage.
 *
 * The product's own picture of itself: work travels from stage to stage. The
 * part of the line already travelled is the brand colour, the part ahead is
 * grey; a finished stage is a filled station, the current one a ringed one,
 * and one still to come is empty. Colour is the second channel — the state is
 * also in the shape of the station, and the current stage is announced to
 * assistive technology.
 *
 * Stages are equal-width columns so the line is evenly divided whatever the
 * names are; a long name wraps under its station rather than pushing the line.
 */

export interface RunStop {
  name: string
  state: 'done' | 'current' | 'upcoming' | 'skipped'
  /** A repeat pass, shown beneath the name. */
  revisionRound?: number
}

const PIP: Record<RunStop['state'], string> = {
  done: 'border-accent bg-accent',
  current: 'border-foreground bg-surface ring-4 ring-accent-ring',
  upcoming: 'border-border-strong bg-surface',
  skipped: 'border-dashed border-border-strong bg-surface',
}

const NAME: Record<RunStop['state'], string> = {
  done: 'text-muted',
  current: 'font-bold text-foreground',
  upcoming: 'text-subtle',
  skipped: 'text-subtle line-through',
}

export function RunLine({
  stops,
  className = '',
}: {
  stops: RunStop[]
  className?: string
}) {
  if (stops.length === 0) return null

  // The line is drawn through each station from its own edges: the left half
  // is travelled when the run has reached this stop, the right half when it
  // has passed it. Together they join into one line with no gaps.
  const reached = (state: RunStop['state']) => state === 'done' || state === 'current'

  return (
    <ol
      className={`grid auto-cols-[minmax(4.75rem,1fr)] grid-flow-col overflow-x-auto pb-1 ${className}`}
    >
      {stops.map((stop, index) => (
        <li
          key={`${stop.name}-${index}`}
          aria-current={stop.state === 'current' ? 'step' : undefined}
          className="relative flex min-w-0 flex-col items-center px-1 text-center"
        >
          <span aria-hidden className="relative flex h-5 w-full items-center justify-center">
            {index > 0 ? (
              <span
                className={`absolute left-0 right-1/2 top-1/2 h-[5px] -translate-y-1/2 ${
                  reached(stop.state) ? 'bg-accent' : 'bg-border-strong'
                }`}
              />
            ) : null}
            {index < stops.length - 1 ? (
              <span
                className={`absolute left-1/2 right-0 top-1/2 h-[5px] -translate-y-1/2 ${
                  stop.state === 'done' ? 'bg-accent' : 'bg-border-strong'
                }`}
              />
            ) : null}
            <span
              className={`relative z-10 box-border size-[1.1rem] rounded-full border-[4px] ${PIP[stop.state]}`}
            />
          </span>
          <span className={`mt-2 block max-w-full text-xs leading-snug ${NAME[stop.state]}`}>
            <span className="line-clamp-4 [overflow-wrap:anywhere]" title={stop.name}>
              {stop.name}
            </span>
            {stop.revisionRound ? (
              <span className="block font-normal text-subtle">pass {stop.revisionRound}</span>
            ) : null}
            {stop.state === 'current' ? <span className="sr-only"> (current stage)</span> : null}
            {stop.state === 'skipped' ? <span className="sr-only"> (not needed)</span> : null}
          </span>
        </li>
      ))}
    </ol>
  )
}
