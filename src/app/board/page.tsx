/**
 * BOARD — a workflow as columns of running work.
 *
 * The question this answers is "where is everything right now", which a list
 * of instances answers poorly and a board answers at a glance.
 */

import Link from 'next/link'
import { requireUser } from '@/lib/auth/dal'
import { AppShell } from '@/features/shell/app-shell'
import { Empty, PageHeader, Panel, buttonClass } from '@/features/ui/primitives'
import { BoardView } from '@/features/board/board'
import { getBoard } from '@/features/board/queries'
import { listActiveTemplates } from '@/lib/db/repositories/workflow-templates'

export default async function BoardPage({ searchParams }: PageProps<'/board'>) {
  const user = await requireUser()
  const params = await searchParams
  const templates = await listActiveTemplates()

  const wanted = typeof params.workflow === 'string' ? params.workflow : undefined
  const template =
    templates.find((candidate) => candidate.workflowId === wanted) ?? templates[0]

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
          description={`Version ${board.version}. Drag a card to the next stage to complete it — the workflow decides where it goes next.`}
          actions={
            templates.length > 1 ? (
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
                  </Link>
                ))}
              </nav>
            ) : null
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
