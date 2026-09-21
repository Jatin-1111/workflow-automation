/**
 * Where this stage sits in the workflow (spec §11).
 *
 * A connected track rather than a row of pills joined by typed arrows: an
 * arrow that wraps to the next line leaves a stage stranded, and a bordered
 * pill reads as something to press. Each stage gets a bar that carries its
 * state, with the name beneath it.
 */

import type { StageProgress } from './queries'

const TRACK: Record<StageProgress['state'], string> = {
  done: 'bg-status-complete',
  current: 'bg-accent',
  upcoming: 'bg-border-strong',
  skipped: 'bg-border',
}

const LABEL: Record<StageProgress['state'], string> = {
  done: 'text-muted',
  current: 'font-medium text-foreground',
  upcoming: 'text-subtle',
  skipped: 'text-subtle line-through',
}

export function StageProgressBar({ stages }: { stages: StageProgress[] }) {
  const done = stages.filter((stage) => stage.state === 'done').length
  const position = stages.findIndex((stage) => stage.state === 'current')

  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between gap-4">
        <p className="text-xs font-medium text-muted">
          {position >= 0 ? `Stage ${position + 1} of ${stages.length}` : 'Workflow progress'}
        </p>
        <p className="text-xs tabular-nums text-subtle">
          {done} of {stages.length} complete
        </p>
      </div>

      <ol className="flex flex-wrap gap-x-2 gap-y-3">
        {stages.map((stage) => (
          <li
            key={stage.key}
            className="min-w-24 flex-1 basis-24"
            aria-current={stage.state === 'current' ? 'step' : undefined}
          >
            <span
              className={`block h-1 rounded-full ${TRACK[stage.state]}`}
              title={
                stage.state === 'skipped' ? 'Not needed for this one' : undefined
              }
            />
            <span className={`mt-1.5 block text-xs leading-snug ${LABEL[stage.state]}`}>
              {stage.name}
              {stage.revisionRound ? (
                <span className="block text-[11px] text-subtle">
                  pass {stage.revisionRound}
                </span>
              ) : null}
            </span>
          </li>
        ))}
      </ol>
    </div>
  )
}
