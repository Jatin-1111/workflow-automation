/**
 * TASK DETAIL — everything needed to do one piece of work, in one place.
 *
 * The brief is explicit that a person should not have to navigate through
 * several unrelated pages to operate a task (spec §11), so instructions,
 * earlier stages' work, files, checklist, discussion and history all live here
 * alongside the actions that move the workflow on.
 */

import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireUser } from '@/lib/auth/dal'
import { AppShell } from '@/features/shell/app-shell'
import { getTaskDetail } from '@/features/tasks/queries'
import { TaskForm } from '@/features/tasks/task-form'
import { FilePanel } from '@/features/tasks/file-panel'
import { CommentPanel } from '@/features/tasks/comment-panel'
import { StageProgressBar } from '@/features/tasks/stage-progress'
import { TimelinePanel } from '@/features/tasks/timeline-panel'
import { StatusBadge } from '@/features/my-work/status-badge'
import { formatDeadline } from '@/features/my-work/format'
import { isEntityId } from '@/lib/ids/format'

export default async function TaskPage({ params }: PageProps<'/tasks/[taskId]'>) {
  const user = await requireUser()
  const { taskId } = await params

  if (!isEntityId(taskId, 'task')) notFound()

  const now = new Date()
  const detail = await getTaskDetail(taskId, user, now)
  // A task the viewer has no part in is not found, rather than forbidden: the
  // existence of other people's work is not theirs to learn.
  if (!detail) notFound()

  const { task, stage } = detail
  const deadline = formatDeadline(detail.dueAt, now)

  const uploadedSlots = new Set(
    task.files.map((file) => file.slotKey).filter(Boolean),
  )
  const missingFiles = stage.files
    .filter((slot) => slot.required && !uploadedSlots.has(slot.key))
    .map((slot) => slot.label)

  return (
    <AppShell user={user} current="/my-work">
      <main className="mx-auto w-full max-w-7xl px-6 py-8">
        <nav className="mb-4 flex flex-wrap items-center gap-x-2 text-xs text-subtle">
          <Link href="/my-work" className="transition hover:text-foreground">
            My Work
          </Link>
          <span aria-hidden>/</span>
          <span className="font-medium text-muted">{detail.projectName}</span>
          <span aria-hidden>/</span>
          <span>{detail.workflowName}</span>
          <span aria-hidden>/</span>
          <span>{detail.instanceTitle}</span>
        </nav>

        <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">{stage.name}</h1>
            <p className="mt-1 text-sm text-muted">
              {detail.canOperate
                ? 'Assigned to you'
                : `Assigned to ${detail.assigneeNames.join(', ')}`}
              {task.revisionRound > 1 ? ` · revision ${task.revisionRound}` : ''}
              {' · '}
              {detail.instanceId}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {detail.slaBreached ? (
              <span className="rounded border border-border px-2 py-1 text-[11px] font-medium text-status-overdue">
                SLA breached
              </span>
            ) : null}
            <span
              className={`text-sm ${
                deadline.overdue ? 'font-medium text-status-overdue' : 'text-muted'
              }`}
            >
              {deadline.label}
            </span>
            <StatusBadge status={task.status} priority={task.priority} />
          </div>
        </header>

        <div className="mb-6 rounded-lg border border-border bg-surface px-4 py-3">
          <StageProgressBar stages={detail.progress} />
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <div className="space-y-6">
            {stage.instructions ? (
              <section className="rounded-lg border border-border bg-surface p-4">
                <h2 className="text-sm font-semibold">What you need to do</h2>
                <p className="mt-1.5 text-sm text-muted">{stage.instructions}</p>
              </section>
            ) : null}

            <section className="rounded-lg border border-border bg-surface p-4">
              {detail.canOperate ? (
                <TaskForm
                  taskId={task.taskId}
                  stage={stage}
                  fieldValues={task.fieldValues}
                  checklist={task.checklist}
                  missingFiles={missingFiles}
                />
              ) : (
                <ReadOnlyNotice
                  completed={Boolean(task.completedAt)}
                  assignees={detail.assigneeNames}
                />
              )}
            </section>

            {detail.priorStages.length > 0 ? (
              <section className="rounded-lg border border-border bg-surface">
                <h2 className="border-b border-border px-4 py-3 text-sm font-semibold">
                  Work from earlier stages
                </h2>
                <div className="divide-y divide-border">
                  {detail.priorStages.map((prior) => (
                    <div key={prior.name} className="px-4 py-3">
                      <p className="text-xs text-subtle">
                        {prior.name}
                        {prior.completedBy.length > 0
                          ? ` · completed by ${prior.completedBy.join(', ')}`
                          : ''}
                      </p>
                      <dl className="mt-2 space-y-2">
                        {prior.values.map((entry) => (
                          <div key={entry.label}>
                            <dt className="text-xs font-medium text-muted">
                              {entry.label}
                            </dt>
                            <dd className="whitespace-pre-wrap text-sm">{entry.value}</dd>
                          </div>
                        ))}
                      </dl>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}
          </div>

          <aside className="space-y-6">
            <FilePanel
              taskId={task.taskId}
              slots={stage.files}
              files={detail.files}
              canUpload={detail.canOperate}
            />
            <CommentPanel
              taskId={task.taskId}
              comments={detail.comments}
              canComment={!task.completedAt}
            />
            <TimelinePanel events={detail.timeline} />
          </aside>
        </div>
      </main>
    </AppShell>
  )
}

function ReadOnlyNotice({
  completed,
  assignees,
}: {
  completed: boolean
  assignees: string[]
}) {
  return (
    <p className="text-sm text-muted">
      {completed
        ? 'This stage is complete. It is kept here as part of the workflow record.'
        : `This stage is assigned to ${assignees.join(', ')}. You can follow it and comment, but only an assignee can complete it.`}
    </p>
  )
}

export function generateMetadata() {
  return { title: 'Task · Business Orbit' }
}

export const dynamic = 'force-dynamic'
