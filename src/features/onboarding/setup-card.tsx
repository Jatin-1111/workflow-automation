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

      <ul className="divide-y divide-accent-ring/60 border-t border-accent-ring">
        {steps.map((step) => (
          <li key={step.key} className="flex items-start gap-3 px-5 py-3">
            <span
              aria-hidden
              className={`mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full ${
                step.done
                  ? 'bg-status-complete text-white'
                  : 'border border-border-strong bg-surface'
              }`}
            >
              {step.done ? <Check size={11} strokeWidth={3} /> : null}
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
    </details>
  )
}
