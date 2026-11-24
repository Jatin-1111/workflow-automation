/**
 * REPORTS (spec §16, §47).
 *
 * The dashboard says what is happening now. This says how the work is going:
 * is it piling up or clearing, how long it takes, which stage holds it up, how
 * often it comes back, and who is carrying it. The trend leads because it is
 * the question the rest explain.
 */

import { buttonClass, tdClass, tdNumClass, theadClass, thClass, thNumClass } from '@/features/ui/primitives'
import Link from 'next/link'
import { LinkPending } from '@/features/ui/link-pending'
import { requireCapability } from '@/lib/auth/dal'
import { EmptyRow, Section } from '@/features/management/section'
import { Activity, CircleCheckBig, CirclePlay, Undo2 } from 'lucide-react'
import { StatStrip, StatTile } from '@/features/management/stat-tile'
import { TrendChart } from '@/features/reports/trend-chart'
import { getReport } from '@/features/reports/queries'
import { formatHours, REPORT_RANGES, type ReportRange } from '@/lib/workflow/metrics'

function readRange(value: string | string[] | undefined): ReportRange {
  const raw = Array.isArray(value) ? value[0] : value
  return raw && raw in REPORT_RANGES ? (raw as ReportRange) : '30'
}

export default async function ReportsPage({ searchParams }: PageProps<'/reports'>) {
  await requireCapability('management.view_dashboard')
  const params = await searchParams
  const range = readRange(params.range)

  const report = await getReport(range)
  const { totals } = report
  const slowest = Math.max(1, ...report.stages.map((stage) => stage.medianHours ?? 0))

  return (
    <>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[2rem] font-extrabold leading-9 tracking-[-0.03em]">Reports</h1>
          <p className="mt-1.5 text-sm text-muted">
            {REPORT_RANGES[range]}
            {range === 'all'
              ? ''
              : ` · since ${report.from.toLocaleDateString('en-GB', {
                  day: 'numeric',
                  month: 'short',
                })}`}
          </p>
        </div>

        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
          <nav
            aria-label="Period"
            className="flex max-w-full items-center gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {(Object.keys(REPORT_RANGES) as ReportRange[]).map((option) => (
              <Link
                key={option}
                href={`/reports?range=${option}`}
                aria-current={option === range ? 'page' : undefined}
                className={`transition-ui relative shrink-0 whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-semibold active:scale-[0.97] max-sm:min-h-11 max-sm:py-3 ${
                  option === range
                    ? 'bg-foreground text-white'
                    : 'text-muted hover:bg-sidebar hover:text-foreground'
                }`}
              >
                {REPORT_RANGES[option]}
                <LinkPending />
              </Link>
            ))}
          </nav>

          <a href={`/api/reports/export?range=${range}`} className={buttonClass('secondary', 'sm')}>
            Export CSV
          </a>
        </div>
      </div>

      <StatStrip>
        <StatTile label="Started" value={totals.started} icon={CirclePlay} />
        <StatTile label="Completed" value={totals.completed} tone="good" icon={CircleCheckBig} />
        <StatTile label="Still running" value={totals.inFlight} tone="progress" icon={Activity} />
        <StatTile
          label="Sent back for changes"
          value={totals.rejections}
          tone="action"
          icon={Undo2}
        />
      </StatStrip>

      <div className="mt-6 grid grid-cols-[minmax(0,1fr)] gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Section
          fill
          title="Started and finished"
          description="When more starts than finishes, work is piling up."
        >
          <TrendChart points={report.trend} />
        </Section>

        <StatStrip
          columns={2}
          className="xl:h-full xl:[&>div]:h-full xl:[&>div]:grid-cols-1 xl:[&>div]:grid-rows-2"
        >
          <StatTile
            label="Median time to complete"
            value={formatHours(totals.medianCycleHours)}
            note="From the request being raised to the work finishing."
          />
          <StatTile
            label="Finished on time"
            value={totals.onTimeRate === null ? 'n/a' : `${totals.onTimeRate}%`}
            tone={totals.onTimeRate !== null && totals.onTimeRate < 60 ? 'alert' : 'neutral'}
            note="Counted only when every stage met its deadline."
          />
        </StatStrip>
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
            <table className="w-full min-w-[40rem] text-sm">
              <thead>
                <tr className={theadClass}>
                  <th scope="col" className={thClass}>Stage</th>
                  <th scope="col" className={thClass}>Workflow</th>
                  <th scope="col" className={thNumClass}>Times run</th>
                  <th scope="col" className={`${thClass} w-48`}>Median</th>
                  <th scope="col" className={thNumClass}>Longest</th>
                  <th scope="col" className={thNumClass}>Rework</th>
                  <th scope="col" className={thNumClass}>Late</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border [&>tr]:transition-ui [&>tr:hover]:bg-surface-sunken">
                {report.stages.map((stage) => (
                  <tr key={`${stage.workflowId}-${stage.stageKey}`}>
                    <td className={`${tdClass} min-w-36 font-bold [overflow-wrap:anywhere]`}>{stage.stageName}</td>
                    <td className={`${tdClass} min-w-28 text-muted`}>{stage.workflowName}</td>
                    <td className={tdNumClass}>{stage.runs}</td>
                    <td className={tdClass}>
                      <span className="flex items-center gap-2.5">
                        <span
                          aria-hidden
                          className="block h-1.5 flex-1 overflow-hidden rounded-full bg-sidebar"
                        >
                          <span
                            className="block h-full rounded-full bg-accent"
                            style={{ width: `${((stage.medianHours ?? 0) / slowest) * 100}%` }}
                          />
                        </span>
                        <span className="w-14 text-right text-sm font-semibold tabular-nums">
                          {formatHours(stage.medianHours)}
                        </span>
                      </span>
                    </td>
                    <td className={`${tdNumClass} text-muted`}>{formatHours(stage.longestHours)}</td>
                    <td
                      className={`${tdNumClass} ${
                        stage.rework > 0 ? 'font-semibold text-status-action' : 'text-muted'
                      }`}
                    >
                      {stage.rework}
                    </td>
                    <td
                      className={`${tdNumClass} ${
                        stage.lateCompletions > 0 ? 'font-bold text-status-overdue' : 'text-muted'
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
          <table className="w-full min-w-[36rem] text-sm">
            <thead>
              <tr className={theadClass}>
                <th scope="col" className={thClass}>Workflow</th>
                <th scope="col" className={thNumClass}>Started</th>
                <th scope="col" className={thNumClass}>Completed</th>
                <th scope="col" className={thNumClass}>Running</th>
                <th scope="col" className={thNumClass}>Median time</th>
                <th scope="col" className={thNumClass}>On time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border [&>tr]:transition-ui [&>tr:hover]:bg-surface-sunken">
              {report.workflows.map((workflow) => (
                <tr key={workflow.workflowId}>
                  <td className={`${tdClass} min-w-36 font-bold [overflow-wrap:anywhere]`}>{workflow.name}</td>
                  <td className={tdNumClass}>{workflow.started}</td>
                  <td className={tdNumClass}>{workflow.completed}</td>
                  <td className={`${tdNumClass} text-muted`}>{workflow.inFlight}</td>
                  <td className={tdNumClass}>{formatHours(workflow.medianCycleHours)}</td>
                  <td className={tdNumClass}>
                    {workflow.onTimeRate === null ? 'n/a' : `${workflow.onTimeRate}%`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>

        <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-6 lg:grid-cols-2">
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
                  <tr className={theadClass}>
                    <th scope="col" className={thClass}>Person</th>
                    <th scope="col" className={thNumClass}>Completed</th>
                    <th scope="col" className={thNumClass}>Late</th>
                    <th scope="col" className={thNumClass}>Median</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border [&>tr]:transition-ui [&>tr:hover]:bg-surface-sunken">
                  {report.people.map((person) => (
                    <tr key={person.userId}>
                      <td className={`${tdClass} min-w-36 font-bold [overflow-wrap:anywhere]`}>{person.name}</td>
                      <td className={tdNumClass}>{person.completed}</td>
                      <td
                        className={`${tdNumClass} ${
                          person.late > 0 ? 'font-bold text-status-overdue' : 'text-muted'
                        }`}
                      >
                        {person.late}
                      </td>
                      <td className={`${tdNumClass} text-muted`}>{formatHours(person.medianHours)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Section>

          <Section title="By project" count={report.projects.length}>
            <table className="w-full text-sm">
              <thead>
                <tr className={theadClass}>
                  <th scope="col" className={thClass}>Project</th>
                  <th scope="col" className={thNumClass}>Running</th>
                  <th scope="col" className={thNumClass}>Completed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border [&>tr]:transition-ui [&>tr:hover]:bg-surface-sunken">
                {report.projects.map((project) => (
                  <tr key={project.name}>
                    <td className={`${tdClass} min-w-36 font-bold [overflow-wrap:anywhere]`}>{project.name}</td>
                    <td className={tdNumClass}>{project.active}</td>
                    <td className={tdNumClass}>{project.completed}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Section>
        </div>
      </div>

      <p className="mt-6 text-xs text-subtle">
        Figures come from the stage records themselves. Every entry and exit is
        timestamped, so these are measured rather than estimated.
      </p>
    </>
  )
}

export const dynamic = 'force-dynamic'

export const metadata = { title: 'Reports' }
