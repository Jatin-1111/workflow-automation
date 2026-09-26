/**
 * REPORTS (spec §16, §47).
 *
 * The dashboard says what is happening now. This says how the work is going:
 * how long it takes, which stage holds it up, how often it comes back, and who
 * is carrying it.
 */

import { buttonClass } from '@/features/ui/primitives'
import Link from 'next/link'
import { requireCapability } from '@/lib/auth/dal'
import { AppShell } from '@/features/shell/app-shell'
import { EmptyRow, Section } from '@/features/management/section'
import { StatTile } from '@/features/management/stat-tile'
import { getReport } from '@/features/reports/queries'
import { formatHours, REPORT_RANGES, type ReportRange } from '@/lib/workflow/metrics'

function readRange(value: string | string[] | undefined): ReportRange {
  const raw = Array.isArray(value) ? value[0] : value
  return raw && raw in REPORT_RANGES ? (raw as ReportRange) : '30'
}

export default async function ReportsPage({ searchParams }: PageProps<'/reports'>) {
  const user = await requireCapability('management.view_dashboard')
  const params = await searchParams
  const range = readRange(params.range)

  const report = await getReport(range)
  const { totals } = report

  return (
    <AppShell user={user} current="/reports">
      <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Reports</h1>
            <p className="mt-1 text-sm text-muted">
              {REPORT_RANGES[range]}
              {range === 'all'
                ? ''
                : ` · since ${report.from.toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'short',
                  })}`}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <nav className="flex items-center gap-1">
              {(Object.keys(REPORT_RANGES) as ReportRange[]).map((option) => (
                <Link
                  key={option}
                  href={`/reports?range=${option}`}
                  aria-current={option === range ? 'page' : undefined}
                  className={`rounded-md border px-2.5 py-1 text-xs font-medium transition ${
                    option === range
                      ? 'border-accent bg-accent-soft text-accent'
                      : 'border-border bg-surface text-muted hover:text-foreground'
                  }`}
                >
                  {REPORT_RANGES[option]}
                </Link>
              ))}
            </nav>

            <a
              href={`/api/reports/export?range=${range}`}
              className={buttonClass('secondary', 'sm')}
            >
              Export CSV
            </a>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatTile label="Started" value={totals.started} />
          <StatTile label="Completed" value={totals.completed} tone="good" />
          <StatTile label="Still running" value={totals.inFlight} />
          <StatTile
            label="Sent back for changes"
            value={totals.rejections}
            tone={totals.rejections > 0 ? 'action' : 'neutral'}
          />
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-border bg-surface p-4">
            <p className="text-xs font-medium text-muted">
              Median time to complete
            </p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">
              {formatHours(totals.medianCycleHours)}
            </p>
            <p className="mt-0.5 text-xs text-subtle">
              From the request being raised to the work finishing.
            </p>
          </div>

          <div className="rounded-xl border border-border bg-surface p-4">
            <p className="text-xs font-medium text-muted">
              Finished on time
            </p>
            <p
              className={`mt-1 text-2xl font-semibold tabular-nums ${
                totals.onTimeRate !== null && totals.onTimeRate < 60
                  ? 'text-status-overdue'
                  : ''
              }`}
            >
              {totals.onTimeRate === null ? '—' : `${totals.onTimeRate}%`}
            </p>
            <p className="mt-0.5 text-xs text-subtle">
              Counted only when every stage met its deadline.
            </p>
          </div>
        </div>

        <div className="mt-6 space-y-6">
          <Section
            title="Where the time goes"
            count={report.stages.length}
            description="Slowest stage first. This is where a process is worth changing."
          >
            {report.stages.length === 0 ? (
              <EmptyRow>Nothing finished in this period.</EmptyRow>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-surface-sunken text-left text-xs font-medium text-muted">
                    <th className="px-5 py-2.5 font-medium">Stage</th>
                    <th className="px-5 py-2.5 font-medium">Workflow</th>
                    <th className="px-5 py-2.5 text-right font-medium">Times run</th>
                    <th className="px-5 py-2.5 text-right font-medium">Median</th>
                    <th className="px-5 py-2.5 text-right font-medium">Longest</th>
                    <th className="px-5 py-2.5 text-right font-medium">Rework</th>
                    <th className="px-5 py-2.5 text-right font-medium">Late</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {report.stages.map((stage) => (
                    <tr key={`${stage.workflowId}-${stage.stageKey}`}>
                      <td className="px-5 py-2.5 font-medium">{stage.stageName}</td>
                      <td className="px-5 py-3 text-muted">{stage.workflowName}</td>
                      <td className="px-5 py-3 text-right tabular-nums">{stage.runs}</td>
                      <td className="px-5 py-3 text-right tabular-nums">
                        {formatHours(stage.medianHours)}
                      </td>
                      <td className="px-5 py-3 text-right tabular-nums text-muted">
                        {formatHours(stage.longestHours)}
                      </td>
                      <td
                        className={`px-5 py-3 text-right tabular-nums ${
                          stage.rework > 0 ? 'text-status-action' : 'text-muted'
                        }`}
                      >
                        {stage.rework}
                      </td>
                      <td
                        className={`px-5 py-3 text-right tabular-nums ${
                          stage.lateCompletions > 0
                            ? 'font-medium text-status-overdue'
                            : 'text-muted'
                        }`}
                      >
                        {stage.lateCompletions}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Section>

          <Section title="By workflow" count={report.workflows.length}>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-surface-sunken text-left text-xs font-medium text-muted">
                  <th className="px-5 py-2.5 font-medium">Workflow</th>
                  <th className="px-5 py-2.5 text-right font-medium">Started</th>
                  <th className="px-5 py-2.5 text-right font-medium">Completed</th>
                  <th className="px-5 py-2.5 text-right font-medium">Running</th>
                  <th className="px-5 py-2.5 text-right font-medium">Median time</th>
                  <th className="px-5 py-2.5 text-right font-medium">On time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {report.workflows.map((workflow) => (
                  <tr key={workflow.workflowId}>
                    <td className="px-5 py-2.5 font-medium">{workflow.name}</td>
                    <td className="px-5 py-3 text-right tabular-nums">{workflow.started}</td>
                    <td className="px-5 py-3 text-right tabular-nums">
                      {workflow.completed}
                    </td>
                    <td className="px-5 py-3 text-right tabular-nums text-muted">
                      {workflow.inFlight}
                    </td>
                    <td className="px-5 py-3 text-right tabular-nums">
                      {formatHours(workflow.medianCycleHours)}
                    </td>
                    <td className="px-5 py-3 text-right tabular-nums">
                      {workflow.onTimeRate === null ? '—' : `${workflow.onTimeRate}%`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Section>

          <div className="grid gap-6 lg:grid-cols-2">
            <Section
              title="People"
              count={report.people.length}
              description="Stages finished in this period."
            >
              {report.people.length === 0 ? (
                <EmptyRow>Nobody finished anything in this period.</EmptyRow>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-surface-sunken text-left text-xs font-medium text-muted">
                      <th className="px-5 py-2.5 font-medium">Person</th>
                      <th className="px-5 py-2.5 text-right font-medium">Completed</th>
                      <th className="px-5 py-2.5 text-right font-medium">Late</th>
                      <th className="px-5 py-2.5 text-right font-medium">Median</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {report.people.map((person) => (
                      <tr key={person.userId}>
                        <td className="px-5 py-3">{person.name}</td>
                        <td className="px-5 py-3 text-right tabular-nums">
                          {person.completed}
                        </td>
                        <td
                          className={`px-5 py-3 text-right tabular-nums ${
                            person.late > 0 ? 'text-status-overdue' : 'text-muted'
                          }`}
                        >
                          {person.late}
                        </td>
                        <td className="px-5 py-3 text-right tabular-nums text-muted">
                          {formatHours(person.medianHours)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Section>

            <Section title="By project" count={report.projects.length}>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-surface-sunken text-left text-xs font-medium text-muted">
                    <th className="px-5 py-2.5 font-medium">Project</th>
                    <th className="px-5 py-2.5 text-right font-medium">Running</th>
                    <th className="px-5 py-2.5 text-right font-medium">Completed</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {report.projects.map((project) => (
                    <tr key={project.name}>
                      <td className="px-5 py-3">{project.name}</td>
                      <td className="px-5 py-3 text-right tabular-nums">{project.active}</td>
                      <td className="px-5 py-3 text-right tabular-nums">
                        {project.completed}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Section>
          </div>
        </div>

        <p className="mt-6 text-xs text-subtle">
          Figures come from the stage records themselves — every entry and exit is
          timestamped, so these are measured rather than estimated.
        </p>
      </main>
    </AppShell>
  )
}

export const dynamic = 'force-dynamic'
