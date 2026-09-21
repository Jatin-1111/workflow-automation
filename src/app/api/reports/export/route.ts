/**
 * Report export (spec §16).
 *
 * The same figures the page shows, as CSV, because a number somebody wants to
 * put in a board pack has to leave the application somehow.
 *
 * The proxy does not run on /api, so this authenticates for itself.
 */

import { NextResponse, type NextRequest } from 'next/server'
import { getCurrentUser } from '@/lib/auth/dal'
import { can } from '@/lib/auth/permissions'
import { getReport } from '@/features/reports/queries'
import { formatHours, REPORT_RANGES, type ReportRange } from '@/lib/workflow/metrics'

/** Quote a cell so a comma, quote or newline inside it cannot break the row. */
function cell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return ''
  const text = String(value)
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

function row(values: (string | number | null | undefined)[]): string {
  return values.map(cell).join(',')
}

export async function GET(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return new NextResponse('Not authorised', { status: 401 })
  if (!can(user.accessLevel, 'management.view_dashboard')) {
    return new NextResponse('Not authorised', { status: 403 })
  }

  const requested = request.nextUrl.searchParams.get('range') ?? '30'
  const range: ReportRange = requested in REPORT_RANGES ? (requested as ReportRange) : '30'

  const report = await getReport(range)

  const lines: string[] = [
    row(['Business Orbit report']),
    row(['Period', REPORT_RANGES[range]]),
    row(['Generated', new Date().toISOString()]),
    '',
    row(['Summary']),
    row(['Started', report.totals.started]),
    row(['Completed', report.totals.completed]),
    row(['Still running', report.totals.inFlight]),
    row(['Sent back for changes', report.totals.rejections]),
    row(['Median time to complete', formatHours(report.totals.medianCycleHours)]),
    row([
      'Finished on time',
      report.totals.onTimeRate === null ? '' : `${report.totals.onTimeRate}%`,
    ]),
    '',
    row(['Stages']),
    row(['Stage', 'Workflow', 'Times run', 'Median', 'Longest', 'Rework', 'Late', 'SLA breaches']),
    ...report.stages.map((stage) =>
      row([
        stage.stageName,
        stage.workflowName,
        stage.runs,
        formatHours(stage.medianHours),
        formatHours(stage.longestHours),
        stage.rework,
        stage.lateCompletions,
        stage.slaBreaches,
      ]),
    ),
    '',
    row(['Workflows']),
    row(['Workflow', 'Started', 'Completed', 'Running', 'Median time', 'On time']),
    ...report.workflows.map((workflow) =>
      row([
        workflow.name,
        workflow.started,
        workflow.completed,
        workflow.inFlight,
        formatHours(workflow.medianCycleHours),
        workflow.onTimeRate === null ? '' : `${workflow.onTimeRate}%`,
      ]),
    ),
    '',
    row(['People']),
    row(['Person', 'Completed', 'Late', 'Median']),
    ...report.people.map((person) =>
      row([person.name, person.completed, person.late, formatHours(person.medianHours)]),
    ),
    '',
    row(['Projects']),
    row(['Project', 'Running', 'Completed']),
    ...report.projects.map((project) =>
      row([project.name, project.active, project.completed]),
    ),
  ]

  const filename = `business-orbit-report-${range}-${new Date().toISOString().slice(0, 10)}.csv`

  return new NextResponse(lines.join('\r\n'), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
