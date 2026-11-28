'use client'

/**
 * Asking before something that cannot be undone.
 *
 * This replaces a confirmation that unfolded inside the row's own action
 * cell. That cell is a few icons wide, so the sentence wrapped to a tall
 * column, the buttons stacked under it, and two of them opened at once made
 * one row taller than the screen. A dialog takes the question out of the
 * layout: nothing in the page moves, only one can be open, Escape and a click
 * outside both mean "keep it", and focus starts on the safe answer.
 *
 * Built on the native <dialog>, which supplies the focus trap, the backdrop
 * and the top layer without a library. The caller owns `open`; the form inside
 * posts to `action`, and the confirm button shows its own pending state from
 * the form, so a double click cannot send it twice.
 *
 * It arrives and leaves rather than blinking in: the box fades and settles
 * from 97% over 200ms, and leaves in 150ms, on the product's own easing. The
 * dialog is mounted only while open so that Motion can play the exit before
 * the element goes; the dim behind it is a pseudo-element Motion cannot reach,
 * so that fade lives in globals.css and follows `data-closing`.
 */

import { AnimatePresence, motion, useIsPresent } from 'motion/react'
import { useEffect, useRef } from 'react'
import { useFormStatus } from 'react-dom'
import { DURATION, EASE } from './motion'
import { Button } from './primitives'

function ConfirmSubmit({ label, pendingLabel }: { label: string; pendingLabel: string }) {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" tone="danger" disabled={pending}>
      {pending ? pendingLabel : label}
    </Button>
  )
}

/** The <dialog> itself, present only while the question is open. */
function DialogShell({
  onClose,
  children,
}: {
  onClose: () => void
  children: React.ReactNode
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  const isPresent = useIsPresent()

  // A native dialog has to be told to open as a modal; mounting alone leaves
  // it in the page flow without a backdrop or a focus trap.
  useEffect(() => {
    dialog.current?.showModal()
  }, [])

  return (
    <motion.dialog
      ref={dialog}
      data-closing={isPresent ? undefined : ''}
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98, transition: { duration: DURATION.fast, ease: EASE } }}
      transition={{ duration: DURATION.base, ease: EASE }}
      // Escape would close the native dialog on the spot and skip the exit;
      // it asks the caller to close instead, and the caller's `open` does it.
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
      onClick={(event) => {
        // The backdrop is the dialog element itself; a click on its content
        // lands on a child.
        if (event.target === event.currentTarget) onClose()
      }}
      className="w-[calc(100%-2rem)] max-w-md rounded-2xl border border-border bg-surface p-0 text-left text-foreground shadow-float"
    >
      {children}
    </motion.dialog>
  )
}

export function ConfirmDialog({
  open,
  onClose,
  title,
  children,
  confirmLabel,
  pendingLabel = 'Working…',
  action,
  fields,
  error,
}: {
  open: boolean
  onClose: () => void
  title: string
  /** What happens, in a sentence: the consequence, not a restatement of the title. */
  children: React.ReactNode
  confirmLabel: string
  pendingLabel?: string
  action: (formData: FormData) => void | Promise<void>
  /** The hidden inputs that tell the action what it is acting on. */
  fields: React.ReactNode
  error?: string
}) {
  return (
    <AnimatePresence>
      {open ? (
        <DialogShell key="confirm" onClose={onClose}>
          <form action={action} className="space-y-4 p-6">
            {fields}

            <div className="space-y-1.5">
              <h2 className="text-base font-bold tracking-[-0.01em]">{title}</h2>
              <div className="text-sm leading-relaxed text-muted">{children}</div>
            </div>

            {error ? (
              <p role="alert" className="text-sm text-status-overdue">
                {error}
              </p>
            ) : null}

            <div className="flex flex-wrap justify-end gap-2">
              <Button type="button" tone="quiet" onClick={onClose} autoFocus>
                Cancel
              </Button>
              <ConfirmSubmit label={confirmLabel} pendingLabel={pendingLabel} />
            </div>
          </form>
        </DialogShell>
      ) : null}
    </AnimatePresence>
  )
}
