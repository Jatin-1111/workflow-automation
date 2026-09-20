/**
 * MY WORK — the primary landing page for every user (spec §7).
 *
 * Answers one question: what do I need to do? Every task assigned to the
 * signed-in person, across every Major Project and workflow, on one screen.
 */

import { requireUser } from '@/lib/auth/dal'
import { AppShell } from '@/features/shell/app-shell'
import { getMyWork } from '@/features/my-work/queries'
import {
  applyFilters,
  applyWaitingFilters,
  groupItems,
  parseFilters,
} from '@/features/my-work/filters'
import { WorkFilters } from '@/features/my-work/work-filters'
import { WorkRow } from '@/features/my-work/work-row'
import { WaitingList } from '@/features/my-work/waiting-list'
import { BUCKET_LABELS } from '@/lib/workflow/buckets'

export default async function MyWorkPage({ searchParams }: PageProps<'/my-work'>) {
  const user = await requireUser()
  const now = new Date()

  const work = await getMyWork(user.userId, now)
  const filters = parseFilters(await searchParams)
  const groups = groupItems(applyFilters(work.items, filters), filters.group, now)

  // Waiting-on-others rows count towards the section, so the empty state does
  // not contradict a list sitting right beneath it.
  const showsWaitingList = filters.view === 'waiting' || filters.view === 'all'
  const waiting = showsWaitingList
    ? applyWaitingFilters(work.waitingOnOthers, filters)
    : []
  const total =
    groups.reduce((count, group) => count + group.items.length, 0) + waiting.length
  const openCount =
    work.items.filter((item) => item.bucket !== 'completed').length +
    work.waitingOnOthers.length

  return (
    <AppShell user={user} current="/my-work">
      <main className="mx-auto w-full max-w-7xl px-6 py-8">
        <div className="mb-6">
          <h1 className="text-xl font-semibold tracking-tight">My Work</h1>
          <p className="mt-1 text-sm text-muted">
            {openCount === 0
              ? 'Nothing is waiting on you right now.'
              : `${openCount} open ${openCount === 1 ? 'item' : 'items'} across your projects.`}
          </p>
        </div>

        <WorkFilters filters={filters} work={work} />

        <section className="mt-6 space-y-6">
          {total === 0 ? (
            <p className="rounded-lg border border-dashed border-border bg-surface px-4 py-10 text-center text-sm text-muted">
              Nothing in {filters.view === 'all' ? 'open work' : BUCKET_LABELS[filters.view]}.
            </p>
          ) : (
            groups.map((group) => (
              <div key={group.key}>
                {group.label ? (
                  <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-subtle">
                    {group.label}
                    <span className="ml-2 font-normal text-subtle">
                      {group.items.length}
                    </span>
                  </h2>
                ) : null}
                <ul className="overflow-hidden rounded-lg border border-border bg-surface">
                  {group.items.map((item) => (
                    <WorkRow key={item.taskId} item={item} now={now} />
                  ))}
                </ul>
              </div>
            ))
          )}

          {/* Work this person raised that now sits with someone else. */}
          {showsWaitingList ? <WaitingList items={waiting} /> : null}
        </section>
      </main>
    </AppShell>
  )
}
