/**
 * What is still to do before the platform is carrying real work.
 *
 * Each line reads the actual state of the organisation, so it cannot be
 * completed by ticking it. A checklist that can be satisfied without the work
 * being done teaches people to ignore checklists.
 */

import Link from 'next/link'
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
    <section className="mb-6 rounded-xl border border-accent-ring bg-accent-soft/50">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-accent-ring px-5 py-3.5">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Getting started</h2>
          <p className="mt-0.5 text-xs text-muted">
            {done} of {steps.length} done. This disappears once everything is set up.
          </p>
        </div>

        <form action={dismissSetupAction}>
          <button type="submit" className={buttonClass('quiet', 'sm')}>
            Hide
          </button>
        </form>
      </div>

      <ul className="divide-y divide-accent-ring/60">
        {steps.map((step) => (
          <li key={step.key} className="flex items-start gap-3 px-5 py-3">
            <span
              aria-hidden
              className={`mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold ${
                step.done
                  ? 'bg-status-complete text-white'
                  : 'border border-border-strong bg-surface text-transparent'
              }`}
            >
              {step.done ? '✓' : '·'}
            </span>

            <span className="min-w-0 flex-1">
              <span
                className={`block text-sm ${
                  step.done ? 'text-muted' : 'font-medium text-foreground'
                }`}
              >
                {step.title}
              </span>
              <span className="mt-0.5 block text-xs text-muted">{step.detail}</span>
              {!step.done && step.because ? (
                <span className="mt-0.5 block text-xs text-subtle">{step.because}</span>
              ) : null}
            </span>

            {!step.done ? (
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
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  )
}
