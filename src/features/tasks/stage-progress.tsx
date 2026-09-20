/** Where this stage sits in the workflow (spec §11). */

import type { StageProgress } from './queries'

export function StageProgressBar({ stages }: { stages: StageProgress[] }) {
  return (
    <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-2 text-xs">
      {stages.map((stage, index) => (
        <li key={stage.key} className="flex items-center gap-1.5">
          {index > 0 ? (
            <span aria-hidden className="text-subtle">
              →
            </span>
          ) : null}
          <span
            className={
              stage.state === 'current'
                ? 'rounded border border-accent bg-accent-soft px-2 py-1 font-medium text-accent'
                : stage.state === 'done'
                  ? 'rounded border border-border px-2 py-1 text-status-complete'
                  : 'rounded border border-border px-2 py-1 text-subtle'
            }
          >
            {stage.name}
            {stage.revisionRound ? ` · pass ${stage.revisionRound}` : ''}
          </span>
        </li>
      ))}
    </ol>
  )
}
