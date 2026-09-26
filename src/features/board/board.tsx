'use client'

/**
 * The board.
 *
 * Native HTML5 drag rather than a library: a card onto a column is the whole
 * interaction, and it does not justify a dependency.
 *
 * The card moves optimistically so the gesture feels immediate, and is put
 * back if the engine refuses — which it often will, because most stages want
 * a field, a file or a ticked checklist before they can be completed. The
 * refusal says what is missing and offers the task, so a refused drag teaches
 * the rule rather than just failing.
 */

import { useOptimistic, useRef, useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { CircleAlert, Paperclip, SquareCheck, TriangleAlert } from 'lucide-react'
import { Button, buttonClass, fieldClass } from '@/features/ui/primitives'
import { moveCardAction } from './actions'
import type { Board, BoardCard } from './queries'

const PRIORITY_TINT: Record<string, string> = {
  urgent: 'bg-status-overdue',
  high: 'bg-status-waiting',
  medium: 'bg-status-progress',
  low: 'bg-status-neutral',
}

function Avatars({ people }: { people: BoardCard['assignees'] }) {
  if (people.length === 0) return null
  return (
    <span className="flex -space-x-1.5">
      {people.slice(0, 3).map((person) => (
        <span
          key={person.userId}
          title={person.name}
          className="flex size-6 items-center justify-center rounded-full border border-surface bg-accent-soft text-[0.625rem] font-semibold text-accent"
        >
          {person.initials}
        </span>
      ))}
      {people.length > 3 ? (
        <span className="flex size-6 items-center justify-center rounded-full border border-surface bg-surface-sunken text-[0.625rem] font-medium text-muted">
          +{people.length - 3}
        </span>
      ) : null}
    </span>
  )
}

function Card({
  card,
  dragging,
  onDragStart,
  onDragEnd,
}: {
  card: BoardCard
  dragging: boolean
  onDragStart: () => void
  onDragEnd: () => void
}) {
  const due = card.dueAt
    ? card.dueAt.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
    : null

  return (
    <li
      draggable={card.mine && Boolean(card.taskId)}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={`group rounded-lg border border-border bg-surface shadow-sm transition-ui ${
        card.mine ? 'cursor-grab active:cursor-grabbing hover:border-border-strong' : ''
      } ${dragging ? 'opacity-40' : ''}`}
    >
      <Link
        href={card.taskId ? `/tasks/${card.taskId}` : '#'}
        className="block rounded-lg p-3"
      >
        <span
          aria-hidden
          className={`mb-2 block h-1 w-10 rounded-full ${
            PRIORITY_TINT[card.priority] ?? PRIORITY_TINT.medium
          }`}
        />

        <span className="block text-sm font-medium leading-snug text-foreground">
          {card.title}
        </span>
        {card.projectName ? (
          <span className="mt-0.5 block text-xs text-subtle">{card.projectName}</span>
        ) : null}

        <span className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-muted">
          {due ? (
            <span
              className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 ${
                card.overdue
                  ? 'bg-status-overdue-soft font-medium text-status-overdue'
                  : 'bg-surface-sunken'
              }`}
            >
              {card.overdue ? (
                <TriangleAlert size={12} strokeWidth={2} aria-hidden />
              ) : null}
              {due}
            </span>
          ) : null}

          {card.checklistTotal > 0 ? (
            <span className="inline-flex items-center gap-1">
              <SquareCheck size={13} strokeWidth={1.75} aria-hidden />
              {card.checklistDone}/{card.checklistTotal}
            </span>
          ) : null}

          {card.fileCount > 0 ? (
            <span className="inline-flex items-center gap-1">
              <Paperclip size={13} strokeWidth={1.75} aria-hidden />
              {card.fileCount}
            </span>
          ) : null}

          {card.revisionRound > 1 ? (
            <span className="rounded bg-status-waiting-soft px-1.5 py-0.5 font-medium text-status-waiting">
              Pass {card.revisionRound}
            </span>
          ) : null}

          <span className="ml-auto">
            <Avatars people={card.assignees} />
          </span>
        </span>
      </Link>
    </li>
  )
}

export function BoardView({ board }: { board: Board }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [dragId, setDragId] = useState<string | null>(null)
  const [over, setOver] = useState<string | null>(null)
  const [problem, setProblem] = useState<{
    reason: string
    openTaskId?: string
    needsComment?: boolean
    taskId?: string
    toStageKey?: string
  } | null>(null)
  const commentRef = useRef<HTMLInputElement>(null)

  // The card sits in its new column while the server decides, and returns if
  // the answer is no.
  const [columns, moveOptimistically] = useOptimistic(
    board.columns,
    (state, move: { instanceId: string; toStageKey: string }) =>
      state.map((column) => ({
        ...column,
        cards:
          column.key === move.toStageKey
            ? [
                ...column.cards,
                ...state
                  .flatMap((c) => c.cards)
                  .filter((card) => card.instanceId === move.instanceId)
                  .map((card) => ({ ...card, stageKey: move.toStageKey })),
              ]
            : column.cards.filter((card) => card.instanceId !== move.instanceId),
      })),
  )

  function attempt(taskId: string, instanceId: string, toStageKey: string, comment?: string) {
    setProblem(null)
    startTransition(async () => {
      moveOptimistically({ instanceId, toStageKey })
      const outcome = await moveCardAction({ taskId, toStageKey, comment })
      if (outcome.ok) {
        router.refresh()
        return
      }
      setProblem({
        reason: outcome.reason,
        openTaskId: outcome.openTaskId,
        needsComment: outcome.needsComment,
        taskId,
        toStageKey,
      })
      router.refresh()
    })
  }

  function onDrop(toStageKey: string) {
    setOver(null)
    const card = columns.flatMap((column) => column.cards).find((c) => c.instanceId === dragId)
    setDragId(null)
    if (!card?.taskId || card.stageKey === toStageKey) return
    attempt(card.taskId, card.instanceId, toStageKey)
  }

  return (
    <div className="space-y-4">
      {problem ? (
        <div
          role="status"
          className="flex flex-wrap items-start gap-3 rounded-xl border border-status-overdue-soft bg-status-overdue-soft/50 px-4 py-3"
        >
          <CircleAlert
            size={16}
            strokeWidth={1.75}
            aria-hidden
            className="mt-0.5 shrink-0 text-status-overdue"
          />
          <div className="min-w-0 flex-1 space-y-2">
            <p className="text-sm text-foreground">{problem.reason}</p>

            {problem.needsComment ? (
              <form
                className="flex flex-wrap items-center gap-2"
                onSubmit={(event) => {
                  event.preventDefault()
                  const comment = commentRef.current?.value ?? ''
                  if (problem.taskId && problem.toStageKey) {
                    attempt(problem.taskId, '', problem.toStageKey, comment)
                  }
                }}
              >
                <input
                  ref={commentRef}
                  required
                  placeholder="What needs changing?"
                  className={`${fieldClass} max-w-sm`}
                />
                <Button type="submit" tone="secondary" size="sm">
                  Send it back
                </Button>
              </form>
            ) : null}
          </div>

          <span className="flex shrink-0 items-center gap-2">
            {problem.openTaskId ? (
              <Link
                href={`/tasks/${problem.openTaskId}`}
                className={buttonClass('secondary', 'sm')}
              >
                Open the task
              </Link>
            ) : null}
            <button
              type="button"
              onClick={() => setProblem(null)}
              className={buttonClass('quiet', 'sm')}
            >
              Dismiss
            </button>
          </span>
        </div>
      ) : null}

      <div
        className={`flex gap-4 overflow-x-auto pb-4 ${pending ? 'opacity-90' : ''}`}
      >
        {columns.map((column) => (
          <section
            key={column.key}
            onDragOver={(event) => {
              event.preventDefault()
              setOver(column.key)
            }}
            onDragLeave={() => setOver((k) => (k === column.key ? null : k))}
            onDrop={() => onDrop(column.key)}
            className={`flex w-72 shrink-0 flex-col rounded-xl border bg-surface-sunken transition-ui ${
              over === column.key
                ? 'border-accent bg-accent-soft/40'
                : 'border-border'
            }`}
          >
            <h2 className="flex items-center gap-2 px-3 py-2.5 text-sm font-semibold text-foreground">
              <span className="truncate">{column.name}</span>
              <span className="text-xs font-normal tabular-nums text-subtle">
                {column.cards.length}
              </span>
              {column.requiresApproval ? (
                <span className="ml-auto rounded bg-status-progress-soft px-1.5 py-0.5 text-xs font-medium text-status-progress">
                  Approval
                </span>
              ) : null}
            </h2>

            <ul className="flex min-h-24 flex-1 flex-col gap-2 px-2 pb-3">
              {column.cards.map((card) => (
                <Card
                  key={card.instanceId}
                  card={card}
                  dragging={dragId === card.instanceId}
                  onDragStart={() => setDragId(card.instanceId)}
                  onDragEnd={() => setDragId(null)}
                />
              ))}
              {column.cards.length === 0 ? (
                <li className="rounded-lg border border-dashed border-border px-3 py-4 text-center text-xs text-subtle">
                  Nothing here
                </li>
              ) : null}
            </ul>
          </section>
        ))}
      </div>
    </div>
  )
}
