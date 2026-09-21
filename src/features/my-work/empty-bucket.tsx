/**
 * What an empty section means.
 *
 * "Nothing in Needs action" tells somebody nothing about what this list is for
 * or why theirs is empty. An empty screen is the moment a new person is most
 * confused and most willing to read, so each section says what will appear
 * here and what puts it there.
 */

import Link from 'next/link'
import { startPracticeAction } from '@/features/onboarding/actions'
import { buttonClass } from '@/features/ui/primitives'
import type { WorkBucket } from '@/lib/types/status'

const EXPLANATIONS: Record<WorkBucket | 'all', { headline: string; detail: string }> = {
  needs_action: {
    headline: 'Nothing needs you right now',
    detail:
      'Stages assigned to you appear here the moment somebody finishes the step before yours. You will be told; you do not need to keep checking.',
  },
  in_progress: {
    headline: 'Nothing started',
    detail:
      'A task moves here once you save progress on it, so you can tell what you have picked up from what you have not touched.',
  },
  waiting: {
    headline: 'Nothing waiting on anybody else',
    detail:
      'Work you raised that has moved on to a colleague shows here, with who is holding it and how long it has been there. It is the answer to "where did that get to".',
  },
  upcoming: {
    headline: 'Nothing scheduled',
    detail:
      'Work assigned to you but not due until after today sits here, so today stays readable.',
  },
  overdue: {
    headline: 'Nothing is late',
    detail:
      'Anything past its deadline appears here and on your manager’s dashboard, so a delay is visible rather than quietly waiting.',
  },
  completed: {
    headline: 'Nothing finished yet',
    detail:
      'Stages you have completed stay here as a record. Nothing is deleted; every pass is kept.',
  },
  all: {
    headline: 'No open work',
    detail:
      'Everything assigned to you across every project and process would appear here. Work arrives on its own when somebody finishes the stage before yours.',
  },
}

export function EmptyBucket({
  view,
  filtered,
}: {
  view: WorkBucket | 'all'
  filtered: boolean
}) {
  // A filtered list that finds nothing is a different situation entirely, and
  // explaining the section would be beside the point.
  if (filtered) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-surface px-5 py-12 text-center">
        <p className="text-sm text-muted">Nothing matches what you searched for.</p>
        <p className="mt-1 text-xs text-subtle">
          Clear the filters to see everything in this section.
        </p>
      </div>
    )
  }

  const { headline, detail } = EXPLANATIONS[view]
  const offerPractice = view === 'needs_action' || view === 'all'

  return (
    <div className="rounded-xl border border-dashed border-border bg-surface px-5 py-12 text-center">
      <p className="text-sm font-medium text-foreground">{headline}</p>
      <p className="mx-auto mt-1.5 max-w-md text-sm leading-relaxed text-muted">
        {detail}
      </p>

      {offerPractice ? (
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          <form action={startPracticeAction}>
            <button type="submit" className={buttonClass('secondary', 'sm')}>
              Run a practice workflow
            </button>
          </form>
          <Link href="/help" className={buttonClass('quiet', 'sm')}>
            How this works
          </Link>
        </div>
      ) : null}
    </div>
  )
}
