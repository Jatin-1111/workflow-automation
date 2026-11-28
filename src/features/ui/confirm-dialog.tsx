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
 */

import { useEffect, useRef } from 'react'
import { useFormStatus } from 'react-dom'
import { Button } from './primitives'

function ConfirmSubmit({ label, pendingLabel }: { label: string; pendingLabel: string }) {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" tone="danger" disabled={pending}>
      {pending ? pendingLabel : label}
    </Button>
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
  const dialog = useRef<HTMLDialogElement>(null)

  // The dialog is an outside system with its own open state; this keeps it in
  // step with the caller's.
  useEffect(() => {
    const element = dialog.current
    if (!element) return
    if (open && !element.open) element.showModal()
    if (!open && element.open) element.close()
  }, [open])

  return (
    <dialog
      ref={dialog}
      onClose={onClose}
      onClick={(event) => {
        // The backdrop is the dialog element itself; a click on its content
        // lands on a child.
        if (event.target === event.currentTarget) onClose()
      }}
      className="w-[calc(100%-2rem)] max-w-md rounded-2xl border border-border bg-surface p-0 text-left text-foreground shadow-float backdrop:bg-foreground/40"
    >
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
    </dialog>
  )
}
