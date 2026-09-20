'use client'

/** Internal discussion, kept with the workflow rather than the stage (spec §40). */

import { useActionState } from 'react'
import { addCommentAction, type TaskActionState } from './actions'

const IDLE: TaskActionState = { ok: null }

export interface CommentRow {
  authorName: string
  body: string
  createdAt: Date
}

export function CommentPanel({
  taskId,
  comments,
  canComment,
}: {
  taskId: string
  comments: CommentRow[]
  canComment: boolean
}) {
  const [state, post, posting] = useActionState(addCommentAction, IDLE)

  return (
    <section className="rounded-lg border border-border bg-surface">
      <h2 className="border-b border-border px-4 py-3 text-sm font-semibold">
        Comments
      </h2>

      {comments.length === 0 ? (
        <p className="px-4 py-6 text-sm text-muted">No comments yet.</p>
      ) : (
        <ul className="divide-y divide-border">
          {comments.map((comment, index) => (
            <li key={`${comment.createdAt.toISOString()}-${index}`} className="px-4 py-3">
              <p className="text-xs text-subtle">
                {comment.authorName} ·{' '}
                {comment.createdAt.toLocaleDateString('en-GB', {
                  day: 'numeric',
                  month: 'short',
                })}
              </p>
              <p className="mt-1 whitespace-pre-wrap text-sm">{comment.body}</p>
            </li>
          ))}
        </ul>
      )}

      {canComment ? (
        <form action={post} className="space-y-2 border-t border-border px-4 py-3">
          <input type="hidden" name="taskId" value={taskId} />
          <textarea
            name="body"
            rows={2}
            placeholder="Add a comment…"
            className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent-soft"
          />
          {state.ok === false ? (
            <p role="alert" className="text-sm text-status-overdue">
              {state.errors[0]?.message}
            </p>
          ) : null}
          <button
            type="submit"
            disabled={posting}
            className="rounded-md border border-border-strong bg-surface px-3 py-1.5 text-sm font-medium transition hover:bg-accent-soft disabled:opacity-60"
          >
            {posting ? 'Posting…' : 'Post comment'}
          </button>
        </form>
      ) : null}
    </section>
  )
}
