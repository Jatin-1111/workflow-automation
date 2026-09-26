/**
 * BOARD — a workflow as columns of running work.
 *
 * The question this answers is "where is everything right now", which a list
 * of instances answers poorly and a board answers at a glance.
 */

import Link from 'next/link'
import { requireCapability } from '@/lib/auth/dal'
import { AppShell } from '@/features/shell/app-shell'
import { Empty, PageHeader, Panel, buttonClass } from '@/features/ui/primitives'
import { BoardView } from '@/features/board/board'
import { getBoard } from '@/features/board/queries'
import { listActiveTemplates } from '@/lib/db/repositories/workflow-templates'
import { listInstances } from '@/lib/db/repositories/workflow-instances'
import { listProjects } from '@/lib/db/repositories/projects'
import { StartWorkflow } from '@/features/instances/start-workflow'

export default async function BoardPage({ searchParams }: PageProps<'/board'>) {
  // A board shows every run of a workflow, including titles that name
  // clients. That is an oversight view, so it is gated like the dashboard
  // rather than left open because the nav entry happens to be hidden.
  const user = await requireCapability('management.view_dashboard')
  const params = await searchParams
  const [templates, projects] = await Promise.all([
    listActiveTemplates(),
    listProjects(),
  ])

  const wanted = typeof params.workflow === 'string' ? params.workflow : undefined

  // Counted once so the tabs can say how much is running on each, and so the
  // default lands on a board with work rather than the alphabetically first —
  // which opened on eleven empty columns.
  const instances = await listInstances()
  const liveCount = new Map<string, number>()
  for (const instance of instances) {
    if (instance.status === 'completed' || instance.status === 'cancelled') continue
    liveCount.set(instance.workflowId, (liveCount.get(instance.workflowId) ?? 0) + 1)
  }

  const busiest = [...templates].sort(
    (a, b) => (liveCount.get(b.workflowId) ?? 0) - (liveCount.get(a.workflowId) ?? 0),
  )[0]

  const template =
    templates.find((candidate) => candidate.workflowId === wanted) ?? busiest

  if (!template) {
    return (
      <AppShell user={user} current="/board">
        <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">
          <PageHeader title="Board" />
          <Panel>
            <Empty>
              No workflow has been published yet. Build one under Workflows and
              publish it, then its runs appear here.
            </Empty>
          </Panel>
        </main>
      </AppShell>
    )
  }

  const board = await getBoard(template, user.userId)

  return (
    <AppShell user={user} current="/board">
      <main className="mx-auto w-full px-4 py-8 sm:px-6">
        <PageHeader
          title={board.name}
          description={`Version ${board.version}. Drag a card you hold to the next stage to complete it; the workflow decides where it goes. Cards on somebody else's stage are marked and stay put.`}
          actions={
            <div className="flex flex-wrap items-center gap-3">
              <StartWorkflow
                workflows={[
                  {
                    workflowId: template.workflowId,
                    name: template.name,
                    projectId: template.projectId,
                    stageCount: template.stages.length,
                  },
                ]}
                projects={projects
                  .filter((project) => project.status === 'active')
                  .map((project) => ({
                    projectId: project.projectId,
                    name: project.name,
                  }))}
              />
              {templates.length > 1 ? (
              <nav className="flex flex-wrap items-center gap-1">
                {templates.map((candidate) => (
                  <Link
                    key={candidate.workflowId}
                    href={`/board?workflow=${candidate.workflowId}`}
                    aria-current={
                      candidate.workflowId === template.workflowId ? 'page' : undefined
                    }
                    className={buttonClass(
                      candidate.workflowId === template.workflowId
                        ? 'secondary'
                        : 'quiet',
                      'sm',
                    )}
                  >
                    {candidate.name}
                    <span className="ml-1.5 tabular-nums opacity-60">
                      {liveCount.get(candidate.workflowId) ?? 0}
                    </span>
                  </Link>
                ))}
              </nav>
              ) : null}
            </div>
          }
        />

        <BoardView board={board} />

        {board.elsewhere.length > 0 ? (
          <Panel
            title="On an older version"
            count={board.elsewhere.length}
            description="These runs started on a version whose stages differ, so they have no column here. They continue on the process they began with."
            className="mt-6"
          >
            <ul className="divide-y divide-border">
              {board.elsewhere.map((card) => (
                <li key={card.instanceId} className="px-5 py-3 text-sm">
                  {card.taskId ? (
                    <Link href={`/tasks/${card.taskId}`} className="hover:underline">
                      {card.title}
                    </Link>
                  ) : (
                    card.title
                  )}
                </li>
              ))}
            </ul>
          </Panel>
        ) : null}
      </main>
    </AppShell>
  )
}

export const dynamic = 'force-dynamic'
