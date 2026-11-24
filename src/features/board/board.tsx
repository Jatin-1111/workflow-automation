'use client'

/**
 * The board.
 *
 * Native HTML5 drag rather than a library: a card onto a column is the whole
 * interaction, and it does not justify a dependency. But drag is not the only
 * way in. Native drag does not work on most touch screens and cannot be done
 * from a keyboard, so a card you hold also carries a button for the next stage
 * and a menu for any other, which go through exactly the same engine call.
 *
 * The card moves optimistically so the gesture feels immediate, and is put
 * back if the engine refuses, which it often will, because most stages want
 * a field, a file or a ticked checklist before they can be completed. The
 * refusal says what is missing and offers the task, so a refused move teaches
 * the rule rather than just failing.
 */

import { useOptimistic, useRef, useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  CircleAlert,
  LoaderCircle,
  Paperclip,
  SquareCheck,
  Lock,
  Stamp,
  TriangleAlert,
} from 'lucide-react'
import {
  Button,
  Pill,
  ProjectBar,
  ProjectTag,
  buttonClass,
  controlClass,
  fieldClass,
} from '@/features/ui/primitives'
import { formatDeadline } from '@/features/my-work/format'
import { moveCardAction } from './actions'
import { stageCap } from './stage-color'
import type { Board, BoardCard } from './queries'

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

/**
 * What a screen reader hears for the card.
 *
 * The link used to be named by its own contents, which read as "2 Oct, 0/2,
 * Pass 2, MN": a date with no word for what it was, a fraction with no
 * subject, a pair of initials. Said in full, it is a sentence.
 */
function describe(card: BoardCard, deadline: string | null): string {
  const parts = [card.title]
  if (card.projectName) parts.push(card.projectName)
  if (card.priority === 'urgent' || card.priority === 'high') parts.push(`${card.priority} priority`)
  if (deadline) parts.push(card.overdue ? deadline : `due ${deadline}`)
  if (card.checklistTotal > 0) {
    parts.push(`${card.checklistDone} of ${card.checklistTotal} checklist items done`)
  }
  if (card.fileCount > 0) parts.push(`${card.fileCount} ${card.fileCount === 1 ? 'file' : 'files'}`)
  if (card.revisionRound > 1) parts.push(`pass ${card.revisionRound}`)
  const names = card.assignees.map((person) => person.name).join(', ')
  if (names) parts.push(card.mine ? 'assigned to you' : `held by ${names}`)
  return parts.join(', ')
}

interface StageChoice {
  key: string
  name: string
}

function Card({
  card,
  stages,
  position,
  dragging,
  moving,
  onDragStart,
  onDragEnd,
  onMove,
}: {
  card: BoardCard
  stages: StageChoice[]
  position: number
  dragging: boolean
  moving: boolean
  onDragStart: () => void
  onDragEnd: () => void
  onMove: (toStageKey: string) => void
}) {
  const deadline = card.dueAt ? formatDeadline(card.dueAt, new Date()).label : null
  const names = card.assignees.map((person) => person.name).join(', ')
  // A run nobody holds yet is not "held by somebody else".
  const heldText = names ? `Held by ${names}` : 'Not assigned yet'
  const next = stages[position + 1]
  const others = stages.filter((stage, index) => index !== position && index !== position + 1)

  const body = (
    <>
      {/* The project's colour down the edge, so a board mixing several can
          be read without stopping to read. */}
      <ProjectBar
        color={card.projectColor}
        seed={card.instanceId}
        className="w-1 shrink-0 rounded-full"
      />

      <span className="min-w-0 flex-1">
        <span className="mb-1.5 flex flex-wrap items-center gap-1.5">
          {card.projectName ? (
            <ProjectTag name={card.projectName} color={card.projectColor} seed={card.instanceId} />
          ) : null}
          {/* Said in words, and only when it is not the ordinary case: a dot
              of one of four near-identical colours told nobody anything. */}
          {card.priority === 'urgent' ? <Pill tone="overdue">Urgent</Pill> : null}
          {card.priority === 'high' ? <Pill tone="action">High</Pill> : null}
        </span>

        <span className="block break-words text-sm font-bold leading-snug text-foreground">
          {card.title}
        </span>

        <span className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-muted">
          {deadline ? (
            <span
              className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 ${
                card.overdue
                  ? 'bg-status-overdue-soft font-semibold text-status-overdue'
                  : 'bg-surface-sunken'
              }`}
            >
              {card.overdue ? <TriangleAlert size={12} strokeWidth={2} aria-hidden /> : null}
              {deadline}
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

        {/* Who holds it, in words. This was only a padlock and a tooltip, and a
            tooltip does not exist on a phone or from a keyboard. */}
        {!card.mine ? (
          <span className="mt-2 flex items-center gap-1.5 text-xs text-muted">
            <Lock size={12} strokeWidth={1.75} aria-hidden className="shrink-0 text-subtle" />
            <span className="min-w-0 truncate" title={heldText}>
              {heldText}
            </span>
          </span>
        ) : null}
      </span>
    </>
  )

  return (
    <li
      draggable={card.mine && Boolean(card.taskId)}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      title={
        card.mine
          ? 'Drag to the next stage, or use the buttons below'
          : names
            ? `${names} holds this stage, so only they can move it`
            : 'Nobody is assigned to this stage yet'
      }
      className={`group rounded-lg border bg-surface transition-ui hover:shadow-lift ${
        card.mine
          ? 'cursor-grab border-border hover:border-border-strong active:cursor-grabbing'
          : 'border-dashed border-border'
      } ${dragging ? 'opacity-40' : ''} ${moving ? 'opacity-60' : ''}`}
    >
      {/* A card with no open task has nowhere to go, so it is not a link: it
          used to point at "#", which jumped to the top of the page. */}
      {card.taskId ? (
        <Link
          href={`/tasks/${card.taskId}`}
          aria-label={describe(card, deadline)}
          className="flex gap-2.5 rounded-lg p-3"
        >
          {body}
        </Link>
      ) : (
        <div className="flex gap-2.5 rounded-lg p-3">{body}</div>
      )}

      {card.mine && card.taskId ? (
        <div className="flex flex-wrap items-center gap-2 border-t border-border px-3 py-2">
          {next ? (
            <Button
              type="button"
              tone="secondary"
              size="sm"
              disabled={moving}
              onClick={() => onMove(next.key)}
              aria-label={`Move ${card.title} to ${next.name}`}
              title={`Move to ${next.name}`}
              className="min-w-0 max-w-full"
            >
              {/* A stage name can run to 120 characters; the button must not. */}
              <span className="truncate">Move to {next.name}</span>
            </Button>
          ) : (
            <span className="text-xs text-subtle">Last stage</span>
          )}

          {others.length > 0 ? (
            <select
              aria-label={`Move ${card.title} to another stage`}
              value=""
              disabled={moving}
              onChange={(event) => {
                if (event.target.value) onMove(event.target.value)
              }}
              className={`${controlClass} h-8 max-w-full text-xs`}
            >
              <option value="">Another stage…</option>
              {others.map((stage) => (
                <option key={stage.key} value={stage.key}>
                  {stage.name}
                </option>
              ))}
            </select>
          ) : null}
        </div>
      ) : null}
    </li>
  )
}

export function BoardView({ board }: { board: Board }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [dragId, setDragId] = useState<string | null>(null)
  const [movingId, setMovingId] = useState<string | null>(null)
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

  const stages: StageChoice[] = board.columns.map((column) => ({
    key: column.key,
    name: column.name,
  }))
  const total = columns.reduce((sum, column) => sum + column.cards.length, 0)

  function attempt(taskId: string, instanceId: string, toStageKey: string, comment?: string) {
    setProblem(null)
    setMovingId(instanceId || null)
    startTransition(async () => {
      moveOptimistically({ instanceId, toStageKey })
      const outcome = await moveCardAction({ taskId, toStageKey, comment })
      setMovingId(null)
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
    <div>
      {/* Said to everyone, and out of the way. A refusal used to be a banner
          above the board: it pushed everything down, and on a tall board it
          sat off screen while the card snapped back. Fixed to the bottom it
          is always seen, never moves the page, and is announced as an alert. */}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-4 bottom-4 z-30 flex justify-center lg:left-[16.5rem]"
      >
        {pending && !problem ? (
          <p
            role="status"
            className="pointer-events-auto flex items-center gap-2 rounded-full bg-foreground px-4 py-2 text-sm font-semibold text-white shadow-float"
          >
            <LoaderCircle size={14} strokeWidth={2} aria-hidden className="animate-spin" />
            Moving…
          </p>
        ) : null}

        {problem ? (
          <div
            role="alert"
            className="pointer-events-auto flex w-full max-w-2xl flex-wrap items-start gap-3 rounded-xl border border-status-overdue/30 bg-surface px-4 py-3 shadow-float"
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
                  <label className="sr-only" htmlFor="board-send-back-reason">
                    Reason for sending it back
                  </label>
                  <input
                    id="board-send-back-reason"
                    ref={commentRef}
                    required
                    autoFocus
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
      </div>

      <div className="rounded-xl border border-border bg-surface-sunken p-3">
        {/* A quiet workflow used to be a large empty box with one thin spine
            and no word about it. */}
        {total === 0 ? (
          <p className="px-3 py-6 text-center text-sm leading-relaxed text-muted">
            Nothing is running on {board.name}. Use <strong className="font-bold text-foreground">Start a workflow</strong>{' '}
            above and it will appear in its first stage.
          </p>
        ) : null}

        {/* Columns stretch to the tallest, so every one ends on the same line
            and the whole column, not just the card area, takes a drop. Past a
            handful of stages the board scrolls sideways rather than squeezing
            every card into a sliver. */}
        <div className={`flex items-stretch gap-2 overflow-x-auto ${total > 0 ? 'min-h-64' : ''}`}>
          {columns.map((column, index) => {
            const collapsed = column.cards.length === 0 && over !== column.key
            return (
              <section
                key={column.key}
                aria-label={`${column.name}, ${column.cards.length} card${column.cards.length === 1 ? '' : 's'}`}
                onDragOver={(event) => {
                  event.preventDefault()
                  setOver(column.key)
                }}
                onDragLeave={(event) => {
                  // Leaving for one of the column's own children is not leaving
                  // the column: without this the column closed and reopened
                  // every time the pointer crossed a card, and flickered.
                  if (event.currentTarget.contains(event.relatedTarget as Node | null)) return
                  setOver((k) => (k === column.key ? null : k))
                }}
                onDrop={() => onDrop(column.key)}
                /* An empty stage collapses to a spine, so a seven-stage workflow
                   does not need 1876px for five cards. It stays a drop target,
                   and opens while a card is held over it. A stage holding work
                   takes an equal share of what is left, with a floor. */
                className={`flex flex-col overflow-hidden rounded-xl border bg-surface transition-[flex-grow,border-color] duration-200 ease-out ${
                  collapsed
                    ? 'w-11 shrink-0 border-dashed border-border'
                    : 'min-w-56 flex-1 basis-0 border-border'
                } ${over === column.key ? 'border-accent ring-2 ring-accent-ring' : ''}`}
              >
                {collapsed ? (
                  <h2 className="flex flex-1 flex-col items-center gap-2 py-3">
                    <span
                      aria-hidden
                      className={`size-1.5 rounded-full ${stageCap(index)} opacity-40`}
                    />
                    <span className="text-xs font-medium tabular-nums text-subtle">0</span>
                    <span
                      className="whitespace-nowrap text-xs font-medium text-muted"
                      style={{
                        writingMode: 'vertical-rl',
                        // A 100-character stage name made the whole board that
                        // tall; the full name is in the tooltip and the label.
                        maxHeight: '11rem',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                      title={index === 0 ? `${column.name}: new work starts here` : column.name}
                    >
                      {column.name}
                    </span>
                  </h2>
                ) : (
                  <>
                    <span aria-hidden className={`h-1 rounded-t-xl ${stageCap(index)}`} />
                    <h2 className="flex items-center gap-2 border-b border-border px-3 py-2">
                      <span className="truncate text-sm font-bold text-foreground" title={column.name}>
                        {column.name}
                      </span>
                      <span className="rounded-full bg-surface-sunken px-1.5 text-xs font-medium tabular-nums text-muted">
                        {column.cards.length}
                      </span>
                      {column.requiresApproval ? (
                        <Stamp
                          size={14}
                          strokeWidth={1.75}
                          aria-label="Approval stage"
                          className="ml-auto shrink-0 text-status-progress"
                        />
                      ) : null}
                    </h2>

                    {column.cards.length === 0 ? (
                      <p className="px-3 py-2 text-xs text-subtle">
                        {index === 0 ? 'New work starts here' : 'Drop here'}
                      </p>
                    ) : (
                      <ul className="flex flex-1 flex-col gap-2 p-2">
                        {column.cards.map((card) => (
                          <Card
                            key={card.instanceId}
                            card={card}
                            stages={stages}
                            position={index}
                            dragging={dragId === card.instanceId}
                            moving={movingId === card.instanceId}
                            onDragStart={() => setDragId(card.instanceId)}
                            onDragEnd={() => setDragId(null)}
                            onMove={(toStageKey) => {
                              if (card.taskId) {
                                attempt(card.taskId, card.instanceId, toStageKey)
                              }
                            }}
                          />
                        ))}
                      </ul>
                    )}
                  </>
                )}
              </section>
            )
          })}
        </div>
      </div>
    </div>
  )
}
