/**
 * MY PROFILE — who I am and what I am carrying (spec §44).
 *
 * Reads only the signed-in person's own record; seeing anyone else's work
 * goes through the team views, which require the workload capability.
 *
 * Laid out so each row ends on one line: identity, then the four figures, then
 * my work beside my roles and password, then my activity, then what I can do
 * as three short columns instead of one long list.
 */

import { requireUser } from '@/lib/auth/dal'
import { EmptyRow, Section } from '@/features/management/section'
import { Activity, Check, CircleCheckBig, Stamp, TriangleAlert } from 'lucide-react'
import { StatStrip, StatTile } from '@/features/management/stat-tile'
import { Pill } from '@/features/ui/primitives'
import { PasswordPanel } from '@/features/profile/password-panel'
import {
  WorkPanel,
  parseWorkTab,
  type ProfileWorkItem,
} from '@/features/profile/work-panel'
import { getMyWork } from '@/features/my-work/queries'
import { humanise } from '@/features/my-work/format'
import { listDepartments } from '@/lib/db/repositories/departments'
import { listRoles } from '@/lib/db/repositories/roles'
import { listTeams } from '@/lib/db/repositories/teams'
import { getMyActivity } from '@/features/profile/activity'
import { SentenceText } from '@/features/tasks/timeline-sentence'
import { CAPABILITIES_BY_ACCESS_LEVEL } from '@/lib/auth/permissions'
import { groupedCapabilities } from '@/lib/auth/capability-labels'

export default async function ProfilePage({ searchParams }: PageProps<'/profile'>) {
  const user = await requireUser()
  const params = await searchParams
  const tab = parseWorkTab(params.tab)
  const now = new Date()

  const [work, roles, departments, teams, activity] = await Promise.all([
    getMyWork(user.userId, now),
    listRoles(),
    listDepartments(),
    listTeams(),
    getMyActivity(user.userId, 20),
  ])

  const roleNames = user.roleIds.map(
    (roleId) => roles.find((role) => role.roleId === roleId)?.name ?? roleId,
  )
  const department = departments.find((candidate) => candidate.departmentId === user.departmentId)
  const team = teams.find((candidate) => candidate.teamId === user.teamId)

  const asRow = (item: (typeof work.items)[number]): ProfileWorkItem => ({
    taskId: item.taskId,
    stageName: item.stageName,
    projectName: item.projectName,
    instanceTitle: item.instanceTitle,
    dueAt: item.dueAt,
    overdue: item.bucket === 'overdue',
    completed: item.bucket === 'completed',
  })
  const groups = {
    active: work.items.filter((item) => item.bucket !== 'completed').map(asRow),
    overdue: work.items.filter((item) => item.bucket === 'overdue').map(asRow),
    approvals: work.items.filter((item) => item.status === 'pending_approval').map(asRow),
    completed: work.items.filter((item) => item.bucket === 'completed').map(asRow),
  }

  const joined = user.joiningDate
    ? user.joiningDate.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })
    : null

  return (
    <>
      <header className="mb-6 flex flex-wrap items-center gap-x-5 gap-y-3">
        <span
          aria-hidden
          className="flex size-16 shrink-0 items-center justify-center rounded-full bg-accent text-2xl font-extrabold text-white"
        >
          {user.name.slice(0, 1).toUpperCase()}
        </span>
        <div className="min-w-0">
          <h1 className="text-[2rem] font-extrabold leading-9 tracking-[-0.03em] [overflow-wrap:anywhere]">
            {user.name}
          </h1>
          <p className="mt-1 text-sm text-muted [overflow-wrap:anywhere]">
            <span className="font-mono text-xs">{user.userId}</span> · {user.email}
            {user.phone ? ` · ${user.phone}` : ''}
          </p>
          <ul className="mt-2 flex flex-wrap items-center gap-1.5">
            <li>
              <Pill tone="progress">{humanise(user.accessLevel)}</Pill>
            </li>
            <li>
              <Pill tone={user.status === 'active' ? 'complete' : 'neutral'}>
                {humanise(user.status)}
              </Pill>
            </li>
            {department ? (
              <li>
                <Pill>{department.name}</Pill>
              </li>
            ) : null}
            {team ? (
              <li>
                <Pill>{team.name}</Pill>
              </li>
            ) : null}
            {joined ? (
              <li>
                <Pill>Joined {joined}</Pill>
              </li>
            ) : null}
          </ul>
        </div>
      </header>

      <StatStrip className="mb-6">
        <StatTile
          label="Active work"
          value={groups.active.length}
          tone="progress"
          icon={Activity}
          href="/my-work?view=all"
        />
        <StatTile
          label="Overdue"
          value={groups.overdue.length}
          tone="alert"
          icon={TriangleAlert}
          href="/my-work?view=overdue"
        />
        <StatTile
          label="Awaiting my approval"
          value={groups.approvals.length}
          tone="action"
          icon={Stamp}
          href="/profile?tab=approvals"
        />
        <StatTile
          label="Completed"
          value={groups.completed.length}
          tone="good"
          icon={CircleCheckBig}
          href="/my-work?view=completed"
        />
      </StatStrip>

      {/* One column below `lg`, with an explicit track so a wide row cannot
          stretch the page past a phone's edge. From `lg` the work panel and the
          account panels share a row and stretch to the taller. */}
      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <WorkPanel tab={tab} groups={groups} now={now} />
        </div>

        <div className="flex flex-col gap-6 lg:col-span-5">
          <Section
            title="My workflow roles"
            count={roleNames.length}
            description="What stages the platform routes to me. An administrator can change these."
          >
            {roleNames.length === 0 ? (
              <EmptyRow>No workflow roles assigned yet.</EmptyRow>
            ) : (
              <ul className="flex flex-wrap gap-2 px-5 py-4">
                {roleNames.map((role) => (
                  <li
                    key={role}
                    className="rounded-full bg-accent-soft px-3 py-1 text-xs font-semibold text-accent [overflow-wrap:anywhere]"
                  >
                    {role}
                  </li>
                ))}
              </ul>
            )}
          </Section>

          <PasswordPanel />
        </div>

        <Section
          className="lg:col-span-12"
          title="My activity"
          count={activity.length}
          description="Everything I have done, newest first. The record is append-only."
        >
          {activity.length === 0 ? (
            <EmptyRow>Nothing recorded yet.</EmptyRow>
          ) : (
            <ul className="divide-y divide-border">
              {activity.map((event) => (
                <li key={event.eventId} className="px-5 py-3.5">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
                    <p className="min-w-0 text-sm text-foreground">
                      <SentenceText sentence={event.sentence} />
                    </p>
                    <p className="shrink-0 text-xs tabular-nums text-muted">
                      {event.at.toLocaleString('en-GB', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                  <p className="mt-0.5 text-xs text-muted [overflow-wrap:anywhere]">
                    {event.runTitle}
                  </p>
                  {event.comment ? (
                    <p className="mt-1 text-xs text-muted [overflow-wrap:anywhere]">
                      {event.comment}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section
          className="lg:col-span-12"
          title="What I can do"
          description="Granted by my access level, separately from my workflow roles."
        >
          <div className="grid divide-y divide-border sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-3">
            {groupedCapabilities(CAPABILITIES_BY_ACCESS_LEVEL[user.accessLevel]).map((group) => (
              <div key={group.title} className="px-5 py-4">
                <h3 className="text-xs font-bold text-muted">{group.title}</h3>
                <ul className="mt-2.5 space-y-2">
                  {group.items.map((item) => (
                    <li key={item.capability} className="flex items-start gap-2 text-sm">
                      <Check
                        size={14}
                        strokeWidth={2.25}
                        aria-hidden
                        className="mt-1 shrink-0 text-status-complete"
                      />
                      {item.label}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </Section>
      </div>
    </>
  )
}

export const dynamic = 'force-dynamic'

export const metadata = { title: 'Profile' }
