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
import { Count, PageHeader } from '@/features/ui/primitives'
import { getOnboarding } from '@/features/onboarding/queries'
import { SetupCard } from '@/features/onboarding/setup-card'
import { WelcomeTour } from '@/features/onboarding/welcome-tour'
import { EmptyBucket } from '@/features/my-work/empty-bucket'

export default async function MyWorkPage({ searchParams }: PageProps<'/my-work'>) {
  const user = await requireUser()
  const now = new Date()

  const [work, onboarding] = await Promise.all([
    getMyWork(user.userId, now),
    getOnboarding(user),
  ])
  const filters = parseFilters(await searchParams)
  const groups = groupItems(applyFilters(work.items, filters, now), filters.group, now)

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
      <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">
        {onboarding.showTour ? (
          <WelcomeTour accessLevel={user.accessLevel} name={user.name} />
        ) : null}

        {onboarding.showSetup ? (
          <SetupCard steps={onboarding.steps} remaining={onboarding.remaining} />
        ) : null}

        <PageHeader
          title="My Work"
          description={
            openCount === 0
              ? 'Nothing is waiting on you right now.'
              : `${openCount} open ${openCount === 1 ? 'item' : 'items'} across your projects.`
          }
        />

        <WorkFilters filters={filters} work={work} />

        <section className="mt-6 space-y-6">
          {total === 0 ? (
            <EmptyBucket view={filters.view} filtered={Boolean(filters.search)} />
          ) : (
            groups.map((group) => (
              <div key={group.key}>
                {group.label ? (
                  <h2 className="mb-2 px-1 text-sm font-semibold text-foreground">
                    {group.label}
                    <Count value={group.items.length} />
                  </h2>
                ) : null}
                <ul className="overflow-hidden rounded-xl border border-border bg-surface">
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
