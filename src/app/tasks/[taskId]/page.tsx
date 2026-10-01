/**
 * TASK DETAIL — everything needed to do one piece of work, in one place.
 *
 * The brief is explicit that a person should not have to navigate through
 * several unrelated pages to operate a task (spec §11), so instructions,
 * earlier stages' work, files, checklist, discussion and history all live here
 * alongside the actions that move the workflow on.
 */

import { notFound } from 'next/navigation'
import { requireUser } from '@/lib/auth/dal'
import { AppShell } from '@/features/shell/app-shell'
import { getTaskDetail } from '@/features/tasks/queries'
import { TaskForm } from '@/features/tasks/task-form'
import { FilePanel } from '@/features/tasks/file-panel'
import { CommentPanel } from '@/features/tasks/comment-panel'
import { ReassignPanel } from '@/features/tasks/reassign-panel'
import { HoldPanel } from '@/features/tasks/hold-panel'
import { StageProgressBar } from '@/features/tasks/stage-progress'
import { TimelinePanel } from '@/features/tasks/timeline-panel'
import { StatusBadge } from '@/features/my-work/status-badge'
import { formatDeadline } from '@/features/my-work/format'
import { Breadcrumbs, Panel, Pill } from '@/features/ui/primitives'
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
  const deadline = formatDeadline(detail.dueAt, now, task.completedAt)

  const uploadedSlots = new Set(
    task.files.map((file) => file.slotKey).filter(Boolean),
  )
  const missingFiles = stage.files
    .filter((slot) => slot.required && !uploadedSlots.has(slot.key))
    .map((slot) => slot.label)

  return (
    <AppShell user={user} current="/my-work">
      <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">
        {/* Two levels, not four. The trail used to name the project, the
            workflow and the piece of work before the heading named the stage
            — four nouns to walk past to reach what you are doing. Project and
            workflow are context, so they sit with the title beneath. */}
        <Breadcrumbs
          items={[
            { label: 'My Work', href: '/my-work' },
            { label: detail.instanceTitle },
          ]}
        />

        <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{stage.name}</h1>
            <p className="mt-1 text-sm text-muted">
              {detail.instanceTitle}
              <span className="text-subtle">
                {' · '}
                {detail.projectName} · {detail.workflowName}
              </span>
            </p>
            <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted">
              <span>
                {detail.canOperate
                  ? 'Assigned to you'
                  : `Assigned to ${detail.assigneeNames.join(', ')}`}
              </span>
              {task.revisionRound > 1 ? (
                <Pill tone="action">Revision {task.revisionRound}</Pill>
              ) : null}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {detail.slaBreached ? <Pill tone="overdue">SLA breached</Pill> : null}
            {/* A cancelled run has no deadline left to meet or miss. */}
            {task.status !== 'cancelled' ? (
              <span
                className={`text-sm ${
                  deadline.overdue ? 'font-medium text-status-overdue' : 'text-muted'
                }`}
              >
                {deadline.label}
              </span>
            ) : null}
            <StatusBadge status={task.status} priority={task.priority} />
          </div>
        </header>

        <div className="mb-6 rounded-xl border border-border bg-surface px-5 py-4">
          <StageProgressBar
            stages={detail.progress}
            finished={Boolean(task.completedAt)}
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <div className="space-y-6">
            {stage.instructions ? (
              <section className="rounded-xl border border-accent-ring bg-accent-soft/60 px-5 py-4">
                <h2 className="text-sm font-semibold text-foreground">
                  What you need to do
                </h2>
                <p className="mt-1.5 text-sm leading-relaxed text-muted">
                  {stage.instructions}
                </p>
              </section>
            ) : null}

            {/* Above the form, so it is read before anything is decided. It
                sat under the buttons: told "Read it", a reviewer reached
                Approve first, and on a phone the draft began a screen and a
                half below the decision. */}
            {detail.priorStages.length > 0 ? (
              <Panel
                title={stage.requiresApproval ? 'The work to review' : 'Work from earlier stages'}
                description="Everything recorded before this point."
              >
                <div className="divide-y divide-border">
                  {detail.priorStages.map((prior) => (
                    <div key={prior.name} className="px-5 py-4">
                      <p className="text-xs font-medium text-foreground">
                        {prior.name}
                        {prior.completedBy.length > 0 ? (
                          <span className="font-normal text-subtle">
                            {' '}
                            &mdash; completed by {prior.completedBy.join(', ')}
                          </span>
                        ) : null}
                      </p>
                      <dl className="mt-2.5 grid gap-x-6 gap-y-3 sm:grid-cols-2">
                        {prior.values.map((entry) => (
                          <div key={entry.label}>
                            <dt className="text-xs text-subtle">{entry.label}</dt>
                            <dd className="mt-0.5 whitespace-pre-wrap text-sm leading-relaxed">
                              {entry.value}
                            </dd>
                          </div>
                        ))}
                      </dl>
                    </div>
                  ))}
                </div>
              </Panel>
            ) : null}

            <section className="rounded-xl border border-border bg-surface p-5">
              {detail.canOperate ? (
                <TaskForm
                  taskId={task.taskId}
                  stage={stage}
                  fieldValues={task.fieldValues}
                  checklist={task.checklist}
                  missingFiles={missingFiles}
                outcome={detail.outcome}
                sendBack={detail.sendBack}
                />
              ) : (
                <ReadOnlyNotice
                  completed={Boolean(task.completedAt)}
                  assignees={detail.assigneeNames}
                  nowWith={detail.nowWith}
                  runStatus={detail.instanceStatus}
                />
              )}
            </section>

          </div>

          <aside className="space-y-6">
            {detail.canReassign ? (
              <ReassignPanel
                taskId={task.taskId}
                people={detail.assignable}
                currentAssignees={detail.assigneeIds}
                stageSource={detail.assignmentSource}
              />
            ) : null}

            {!task.completedAt ? (
              <HoldPanel
                // Its open/confirm state only means anything for the status it
                // was opened against; remounting drops a form left ajar by the
                // previous hold or resume.
                key={task.status}
                taskId={task.taskId}
                instanceId={detail.instanceId}
                status={task.status}
                heldReason={detail.heldReason}
                canOperate={detail.canOperate}
                canCancel={detail.canCancel}
              />
            ) : null}

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
            <TimelinePanel events={detail.timeline} reference={detail.instanceId} />
          </aside>
        </div>
      </main>
    </AppShell>
  )
}

/**
 * What a task page says once it is no longer yours to act on.
 *
 * Finishing a stage used to end in silence: the form went, and with it the
 * one line saying who would get the work next. A finished stage now says
 * where the work is, which is also the answer to "did that work?".
 */
function ReadOnlyNotice({
  completed,
  assignees,
  nowWith,
  runStatus,
}: {
  completed: boolean
  assignees: string[]
  nowWith: { stageName: string; names: string[] }[]
  runStatus: string
}) {
  if (!completed) {
    return (
      <p className="text-sm text-muted">
        This stage is assigned to {assignees.join(', ')}. You can follow it and comment, but
        only an assignee can complete it.
      </p>
    )
  }

  return (
    <div
      role="status"
      className="rounded-lg border border-status-complete/30 bg-status-complete-soft px-4 py-3"
    >
      <p className="text-sm font-medium text-foreground">This stage is done.</p>
      <p className="mt-0.5 text-sm text-muted">
        {nowWith.length > 0 ? (
          <>
            The work is now with{' '}
            {nowWith.map((open, index) => (
              <span key={open.stageName}>
                {index > 0 ? ' and ' : ''}
                <span className="font-medium text-foreground">{open.names.join(', ')}</span>{' '}
                for {open.stageName}
              </span>
            ))}
            .
          </>
        ) : runStatus === 'completed' ? (
          'That finished the workflow. Nothing else is waiting on it.'
        ) : runStatus === 'cancelled' ? (
          'This run was called off, so nothing else will happen to it.'
        ) : (
          'It is kept here as part of the workflow record.'
        )}
      </p>
    </div>
  )
}

export function generateMetadata() {
  return { title: 'Task · Business Orbit' }
}

export const dynamic = 'force-dynamic'
