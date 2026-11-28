/** TEAM WORKLOAD — who is carrying what (spec §17). */

import Link from 'next/link'
import { requireCapability } from '@/lib/auth/dal'
import { getManagementOverview, type WorkloadRow } from '@/features/management/queries'
import { Section } from '@/features/management/section'
import { parseSort, sortRows } from '@/features/ui/sort'
import { SortHeader } from '@/features/ui/sort-header'
import { rowLinkClass, tbodyClass, theadClass } from '@/features/ui/primitives'

const COLUMNS = ['name', 'roles', 'active', 'dueToday', 'overdue', 'approvals'] as const
type Column = (typeof COLUMNS)[number]

const PICK: Record<Column, (person: WorkloadRow) => string | number> = {
  name: (person) => person.name.toLowerCase(),
  roles: (person) => person.roleCount,
  active: (person) => person.active,
  dueToday: (person) => person.dueToday,
  overdue: (person) => person.overdue,
  approvals: (person) => person.pendingApprovals,
}

export default async function TeamPage({ searchParams }: PageProps<'/team'>) {
  await requireCapability('team.view_workload')
  const { workload } = await getManagementOverview()
  const sort = parseSort(await searchParams, COLUMNS, { key: 'overdue', direction: 'desc' })

  const rows = sortRows(workload, PICK[sort.key], sort.direction, (person) => person.name)
  const busiest = Math.max(1, ...workload.map((person) => person.active))

  return (
    <>
      <div className="mb-6">
        <h1 className="text-[1.625rem] font-bold leading-8 sm:text-[2rem] sm:leading-9 tracking-[-0.02em]">Team</h1>
        <p className="mt-1.5 max-w-2xl text-sm text-muted">
          Open work per person, across every project. Anyone carrying overdue work comes
          first; click a heading to sort.
        </p>
      </div>

      <Section title="Workload" count={rows.length}>
        <table className="w-full min-w-[44rem] text-sm">
          <thead>
            <tr className={theadClass}>
              <SortHeader label="Person" field="name" current={sort} path="/team" />
              <SortHeader label="Roles" field="roles" current={sort} path="/team" numeric firstDirection="desc" />
              <th scope="col" className="w-40 px-5 py-2.5 text-left font-semibold">
                Load
              </th>
              <SortHeader label="Open" field="active" current={sort} path="/team" numeric firstDirection="desc" />
              <SortHeader label="Due today" field="dueToday" current={sort} path="/team" numeric firstDirection="desc" />
              <SortHeader label="Overdue" field="overdue" current={sort} path="/team" numeric firstDirection="desc" />
              <SortHeader label="To approve" field="approvals" current={sort} path="/team" numeric firstDirection="desc" />
            </tr>
          </thead>
          <tbody className={tbodyClass}>
            {rows.map((person) => (
              <tr key={person.userId}>
                <td className="min-w-40 px-5 py-3.5">
                  <Link
                    href={`/team/${person.userId}`}
                    className={`font-bold text-foreground underline-offset-4 hover:text-accent hover:underline [overflow-wrap:anywhere] ${rowLinkClass}`}
                  >
                    {person.name}
                  </Link>
                  <span className="mt-0.5 block font-mono text-xs text-subtle">
                    {person.userId}
                  </span>
                </td>
                <td className="px-5 py-3.5 text-right tabular-nums text-muted">
                  {person.roleCount}
                </td>
                <td className="px-5 py-3.5">
                  <span
                    aria-hidden
                    className="block h-1.5 overflow-hidden rounded-full bg-sidebar"
                  >
                    <span
                      className={`block h-full rounded-full ${
                        person.overdue > 0 ? 'bg-status-overdue' : 'bg-accent'
                      }`}
                      style={{ width: `${(person.active / busiest) * 100}%` }}
                    />
                  </span>
                </td>
                <td className="px-5 py-3.5 text-right tabular-nums">{person.active}</td>
                <td
                  className={`px-5 py-3.5 text-right tabular-nums ${
                    person.dueToday > 0 ? 'font-semibold text-status-action' : 'text-muted'
                  }`}
                >
                  {person.dueToday}
                </td>
                <td
                  className={`px-5 py-3.5 text-right tabular-nums ${
                    person.overdue > 0 ? 'font-bold text-status-overdue' : 'text-muted'
                  }`}
                >
                  {person.overdue}
                </td>
                <td
                  className={`px-5 py-3.5 text-right tabular-nums ${
                    person.pendingApprovals > 0 ? 'font-semibold text-status-action' : 'text-muted'
                  }`}
                >
                  {person.pendingApprovals}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>
    </>
  )
}

export const dynamic = 'force-dynamic'

export const metadata = { title: 'Team' }
