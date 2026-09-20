/** TEAM WORKLOAD — who is carrying what (spec §17). */

import Link from 'next/link'
import { requireCapability } from '@/lib/auth/dal'
import { AppShell } from '@/features/shell/app-shell'
import { getManagementOverview } from '@/features/management/queries'
import { Section } from '@/features/management/section'

export default async function TeamPage() {
  const user = await requireCapability('team.view_workload')
  const { workload } = await getManagementOverview()

  return (
    <AppShell user={user} current="/team">
      <main className="mx-auto w-full max-w-5xl px-6 py-8">
        <div className="mb-6">
          <h1 className="text-xl font-semibold tracking-tight">Team</h1>
          <p className="mt-1 text-sm text-muted">
            Open work per person, across every project. Anyone carrying overdue
            work appears first.
          </p>
        </div>

        <Section title="Workload" count={workload.length}>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-[11px] uppercase tracking-wide text-subtle">
                <th className="px-4 py-2 font-medium">Person</th>
                <th className="px-4 py-2 font-medium">Roles</th>
                <th className="px-4 py-2 text-right font-medium">Active</th>
                <th className="px-4 py-2 text-right font-medium">Due today</th>
                <th className="px-4 py-2 text-right font-medium">Overdue</th>
                <th className="px-4 py-2 text-right font-medium">To approve</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {workload.map((person) => (
                <tr key={person.userId}>
                  <td className="px-4 py-2.5">
                    <Link
                      href={`/team/${person.userId}`}
                      className="font-medium text-accent underline-offset-4 hover:underline"
                    >
                      {person.name}
                    </Link>
                    <span className="ml-2 font-mono text-xs text-subtle">
                      {person.userId}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-muted">{person.roleCount}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{person.active}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{person.dueToday}</td>
                  <td
                    className={`px-4 py-2.5 text-right tabular-nums ${
                      person.overdue > 0
                        ? 'font-medium text-status-overdue'
                        : 'text-muted'
                    }`}
                  >
                    {person.overdue}
                  </td>
                  <td
                    className={`px-4 py-2.5 text-right tabular-nums ${
                      person.pendingApprovals > 0 ? 'text-status-action' : 'text-muted'
                    }`}
                  >
                    {person.pendingApprovals}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>
      </main>
    </AppShell>
  )
}

export const dynamic = 'force-dynamic'
