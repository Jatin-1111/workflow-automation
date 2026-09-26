/**
 * What is still to do before the platform is carrying real work.
 *
 * Each line reads the actual state of the organisation, so it cannot be
 * completed by ticking it. A checklist that can be satisfied without the work
 * being done teaches people to ignore checklists.
 */

import Link from 'next/link'
import { Check, ChevronRight } from 'lucide-react'
import { dismissSetupAction, startPracticeAction } from './actions'
import { buttonClass } from '@/features/ui/primitives'
import type { SetupStep } from './queries'

export function SetupCard({
  steps,
  remaining,
}: {
  steps: SetupStep[]
  remaining: number
}) {
  const done = steps.length - remaining

  return (
    <details
      // Closed by default, and collapsible, because this is scaffolding for a
      // new organisation while the work below it is the reason people open the
      // page. Open it by default only while nothing has been set up at all.
      open={done === 0}
      className="group mb-6 rounded-xl border border-accent-ring bg-accent-soft/50"
    >
      <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3 px-5 py-3 transition-ui hover:bg-accent-soft">
        <span className="flex min-w-0 items-center gap-2">
          <ChevronRight
            size={16}
            strokeWidth={1.75}
            aria-hidden
            className="shrink-0 text-muted transition-transform duration-200 group-open:rotate-90"
          />
          <span className="min-w-0">
            <span className="block text-sm font-semibold text-foreground">
              Getting started
            </span>
            <span className="mt-0.5 block text-xs text-muted">
              {done} of {steps.length} done. This disappears once everything is set up.
            </span>
          </span>
        </span>

        <span className="flex shrink-0 items-center gap-2">
          <span
            aria-hidden
            className="h-1.5 w-24 overflow-hidden rounded-full bg-surface"
          >
            <span
              className="block h-full rounded-full bg-status-complete transition-all duration-300"
              style={{ width: `${(done / steps.length) * 100}%` }}
            />
          </span>
        </span>
      </summary>

      <div className="flex justify-end border-t border-accent-ring px-5 py-2">
        <form action={dismissSetupAction}>
          <button type="submit" className={buttonClass('quiet', 'sm')}>
            Hide for good
          </button>
        </form>
      </div>

      <ol className="divide-y divide-accent-ring/60 border-t border-accent-ring">
        {steps.map((step, index) => {
          // The first thing not yet done is the one to do. Everything after a
          // step that is blocked is dimmed rather than hidden, so the shape of
          // the whole setup stays visible while only one thing is asked for.
          const isNext = step.key === steps.find((candidate) => !candidate.done)?.key
          return (
          <li
            key={step.key}
            className={`flex items-start gap-3 px-5 py-3 ${
              isNext ? 'bg-surface' : ''
            } ${step.blocked && !step.done ? 'opacity-55' : ''}`}
          >
            <span
              aria-hidden
              className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                step.done
                  ? 'bg-status-complete text-white'
                  : isNext
                    ? 'bg-accent text-white'
                    : 'border border-border-strong bg-surface text-subtle'
              }`}
            >
              {step.done ? <Check size={11} strokeWidth={3} /> : index + 1}
            </span>

            <span className="min-w-0 flex-1">
              <span
                className={`block text-sm ${
                  step.done ? 'text-muted' : 'font-medium text-foreground'
                }`}
              >
                {step.title}
                {isNext ? (
                  <span className="ml-2 rounded bg-accent-soft px-1.5 py-0.5 text-xs font-medium text-accent">
                    Do this next
                  </span>
                ) : null}
              </span>
              <span className="mt-0.5 block text-xs text-muted">{step.detail}</span>
              {!step.done && step.because ? (
                <span className="mt-0.5 block text-xs text-subtle">{step.because}</span>
              ) : null}
            </span>

            {!step.done && !step.blocked ? (
              <span className="shrink-0">
                {step.key === 'practice' ? (
                  <form action={startPracticeAction}>
                    <button type="submit" className={buttonClass('secondary', 'sm')}>
                      Start practice
                    </button>
                  </form>
                ) : step.href ? (
                  <Link href={step.href} className={buttonClass('secondary', 'sm')}>
                    Open
                  </Link>
                ) : null}
              </span>
            ) : step.blocked && !step.done ? (
              <span className="shrink-0 text-xs text-subtle">After the step above</span>
            ) : null}
          </li>
          )
        })}
      </ol>
    </details>
  )
}
