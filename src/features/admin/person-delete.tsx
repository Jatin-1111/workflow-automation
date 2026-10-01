'use client'

/**
 * Removing somebody who should never have been added.
 *
 * Offered on every person and refused for most of them, which is the same
 * arrangement as departments, teams, projects and roles. The refusal is the
 * useful part: it tells an administrator that somebody with history is
 * deactivated, not deleted, at the moment they are trying to do the wrong
 * thing — rather than the button simply being absent and the question
 * going unanswered.
 *
 * Split in two because the pieces belong in different places. The button
 * sits with Set password and Deactivate; the explanation is three
 * sentences, and inside that cluster it widened the row until the buttons
 * wrapped under the name. So the button and the notice share state through
 * a scope wrapped round the card, and each renders where it reads well.
 *
 * Quieter than Deactivate on purpose. For anybody who has actually worked
 * here, Deactivate is the way out, and the layout should say so.
 */

import { createContext, useActionState, useContext, useState } from 'react'
import { buttonClass } from '@/features/ui/primitives'
import { deleteUserAction } from './org-actions'
import type { AdminActionState } from './actions'

const IDLE: AdminActionState = { ok: null }

interface Scope {
  userId: string
  userName: string
  isSelf: boolean
  state: AdminActionState
  remove: (formData: FormData) => void
  removing: boolean
  confirming: boolean
  setConfirming: (value: boolean) => void
}

const PersonDeleteContext = createContext<Scope | null>(null)

function useScope(): Scope {
  const scope = useContext(PersonDeleteContext)
  if (!scope) throw new Error('PersonDelete parts must sit inside PersonDeleteScope.')
  return scope
}

export function PersonDeleteScope({
  userId,
  userName,
  isSelf,
  children,
}: {
  userId: string
  userName: string
  isSelf: boolean
  children: React.ReactNode
}) {
  const [confirming, setConfirming] = useState(false)

  const [state, remove, removing] = useActionState(
    async (previous: AdminActionState, formData: FormData) => {
      const result = await deleteUserAction(previous, formData)
      // A refusal is final for this person: nothing about them changes by
      // asking again. Leaving "Yes, delete" on screen invited a second click
      // that could only fail the same way.
      if (result.ok === false) setConfirming(false)
      return result
    },
    IDLE,
  )

  return (
    <PersonDeleteContext.Provider
      value={{ userId, userName, isSelf, state, remove, removing, confirming, setConfirming }}
    >
      {children}
    </PersonDeleteContext.Provider>
  )
}

/** Delete, and its confirmation, beside the other account controls. */
export function PersonDeleteButton() {
  const { userId, userName, isSelf, remove, removing, confirming, setConfirming } = useScope()

  // The same rule as Deactivate: removing yourself leaves nobody to undo it.
  if (isSelf) return null

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className={buttonClass('quiet', 'sm')}
      >
        Delete
      </button>
    )
  }

  return (
    <form action={remove} className="flex items-center gap-2">
      <input type="hidden" name="userId" value={userId} />
      <span className="text-xs text-muted">Delete {userName}?</span>
      <button type="submit" disabled={removing} className={buttonClass('danger', 'sm')}>
        {removing ? 'Checking…' : 'Yes, delete'}
      </button>
      <button
        type="button"
        onClick={() => setConfirming(false)}
        className={buttonClass('quiet', 'sm')}
      >
        Keep
      </button>
    </form>
  )
}

/** Why it could not be done, across the width of the card. */
export function PersonDeleteNotice() {
  const { state } = useScope()
  if (state.ok !== false) return null

  return (
    <p
      role="status"
      className="mb-3 rounded-md border border-status-overdue-soft bg-status-overdue-soft/50 px-3 py-2 text-xs text-status-overdue"
    >
      {state.message}
    </p>
  )
}
