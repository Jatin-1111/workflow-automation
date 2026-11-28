'use client'

/**
 * The introduction somebody sees once (spec §47).
 *
 * Four cards, not a walk through every screen: what almost nobody works out
 * alone is the shape of the thing and the habit it asks for. The buttons
 * explain themselves.
 *
 * It never blocks work — it can be dismissed at any point, and dismissing
 * counts as having seen it, because a tour that keeps reappearing is worse
 * than one nobody read.
 */

import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { DURATION, EASE } from '@/features/ui/motion'
import { completeTourAction } from './actions'
import { buttonClass } from '@/features/ui/primitives'
import type { AccessLevel } from '@/lib/types/status'

interface Step {
  title: string
  body: string
  aside?: string
}

/** The shared first three; the last depends on what the person can do. */
function stepsFor(accessLevel: AccessLevel, name: string): Step[] {
  const common: Step[] = [
    {
      title: `Welcome, ${name}`,
      body:
        'Business Orbit runs the processes this company repeats. Your work from every project arrives in one place, so you never have to go looking for it.',
      aside: 'Four screens. About a minute.',
    },
    {
      title: 'My Work is the only page you need to check',
      body:
        'Everything assigned to you, across every project and every process, in one list. Sections tell you what needs doing now, what is waiting on somebody else, and what is late.',
    },
    {
      title: 'Open a task and everything is on that page',
      body:
        'The instructions, what earlier stages produced, the files, the checklist, the discussion and the history. You should never have to open another page to do your part.',
    },
  ]

  if (accessLevel === 'admin') {
    return [
      ...common,
      {
        title: 'Roles decide who gets the work',
        body:
          'A process sends work to a role (Proposal Designer, QC Owner), and you decide who holds that role. When somebody leaves, you point the role at somebody else and every process follows. You can build a whole new process yourself in Workflows, without a developer.',
        aside: 'Admin and Workflows are in the menu above.',
      },
    ]
  }

  if (accessLevel === 'manager') {
    return [
      ...common,
      {
        title: 'You can see where everything has got to',
        body:
          'The Dashboard shows what is running, what is waiting for your approval, and what has been sitting too long. Team shows what each person is carrying, so you can move work when somebody is overloaded.',
        aside: 'Dashboard, Team and Reports are in the menu above.',
      },
    ]
  }

  return [
    ...common,
    {
      title: 'Finish your part and it moves itself',
      body:
        'When you complete a stage, the platform hands the work to whoever is next and tells them. There is nobody to message and nothing to chase. When somebody sends work back to you, it arrives here with their reasons attached.',
    },
  ]
}

export function WelcomeTour({
  accessLevel,
  name,
}: {
  accessLevel: AccessLevel
  name: string
}) {
  const steps = stepsFor(accessLevel, name)
  const [index, setIndex] = useState(0)
  const [closing, setClosing] = useState(false)

  const step = steps[index]
  const last = index === steps.length - 1

  const finish = () => {
    setClosing(true)
    // Recorded on the server so a second device does not show it again.
    void completeTourAction()
  }

  const [opened, setOpened] = useState(false)

  // Offered, not imposed. A modal over somebody's work on their first visit
  // asks them to read before they can see what they came for, and the thing
  // they came for teaches the product better than the tour does.
  if (!opened) {
    return (
      <AnimatePresence>
        {closing ? null : (
      <motion.div
        key="offer"
        exit={{ opacity: 0, height: 0, marginBottom: 0 }}
        transition={{ duration: DURATION.base, ease: EASE }}
        className="mb-4 flex overflow-hidden flex-wrap items-center gap-3 rounded-xl border border-accent-ring bg-accent-soft/50 px-4 py-2.5">
        <p className="min-w-0 flex-1 text-sm text-foreground">
          New here? How Business Orbit works, in about a minute.
        </p>
        <button
          type="button"
          onClick={() => setOpened(true)}
          className={buttonClass('secondary', 'sm')}
        >
          Show me
        </button>
        <button type="button" onClick={finish} className={buttonClass('quiet', 'sm')}>
          No thanks
        </button>
      </motion.div>
        )}
      </AnimatePresence>
    )
  }

  return (
    <AnimatePresence>
      {closing ? null : (
    <motion.div
      key="tour"
      role="dialog"
      aria-modal="true"
      aria-labelledby="tour-title"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: DURATION.base, ease: EASE }}
      className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/20 p-4 sm:items-center"
    >
      {/* Centred modals scale in from near full size, never from nothing. */}
      <motion.div
        initial={{ opacity: 0, scale: 0.97, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.98, y: 4 }}
        transition={{ duration: DURATION.slow, ease: EASE }}
        className="w-full max-w-lg rounded-xl border border-border bg-surface p-6 shadow-float"
      >
        <div className="mb-4 flex items-center justify-between">
          <span className="flex gap-1.5" aria-hidden>
            {steps.map((_, position) => (
              <span key={position} className="h-1 w-7 overflow-hidden rounded-full bg-border">
                <motion.span
                  className="block h-full origin-left rounded-full bg-accent"
                  initial={false}
                  animate={{ scaleX: position <= index ? 1 : 0 }}
                  transition={{ duration: DURATION.slow, ease: EASE }}
                />
              </span>
            ))}
          </span>
          <button
            type="button"
            onClick={finish}
            className="text-xs text-muted transition hover:text-foreground"
          >
            Skip
          </button>
        </div>

        {/* Each card fades up a few pixels, so Next reads as a new card
            rather than the text silently changing under the reader. */}
        <motion.div
          key={index}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: DURATION.base, ease: EASE }}
        >
          <h2 id="tour-title" className="text-lg font-semibold tracking-tight">
            {step.title}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted">{step.body}</p>
          {step.aside ? (
            <p className="mt-3 text-xs text-subtle">{step.aside}</p>
          ) : null}
        </motion.div>

        <div className="mt-6 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setIndex((current) => Math.max(0, current - 1))}
            disabled={index === 0}
            className={`${buttonClass('quiet', 'sm')} disabled:invisible`}
          >
            Back
          </button>

          <span className="text-xs tabular-nums text-subtle">
            {index + 1} of {steps.length}
          </span>

          <button
            type="button"
            onClick={() => (last ? finish() : setIndex((current) => current + 1))}
            className={buttonClass('primary', 'md')}
          >
            {last ? 'Start working' : 'Next'}
          </button>
        </div>
      </motion.div>
    </motion.div>
      )}
    </AnimatePresence>
  )
}
