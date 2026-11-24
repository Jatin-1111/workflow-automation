/**
 * Where this stage sits in the workflow (spec §11).
 *
 * Drawn as the run's line with a station per stage, the same picture the
 * Overview uses for stuck work. A conditional stage this run will not reach is
 * a dashed station rather than an empty one, so the line matches what will
 * actually happen (spec §36).
 */

import { RunLine } from '@/features/ui/run-line'
import type { StageProgress } from './progress'

export function StageProgressBar({
  stages,
  finished = false,
}: {
  stages: StageProgress[]
  /** The task on screen is done, so the marked stage is where the run went next. */
  finished?: boolean
}) {
  const done = stages.filter((stage) => stage.state === 'done').length
  const position = stages.findIndex((stage) => stage.state === 'current')

  return (
    <div>
      <div className="mb-4 flex items-baseline justify-between gap-4">
        <p className="text-sm font-bold text-foreground">
          {position >= 0
            ? `${finished ? 'Now at stage' : 'Stage'} ${position + 1} of ${stages.length}`
            : 'Workflow progress'}
        </p>
        <p className="text-xs tabular-nums text-muted">
          {done} of {stages.length} complete
        </p>
      </div>

      <RunLine stops={stages} />
    </div>
  )
}
