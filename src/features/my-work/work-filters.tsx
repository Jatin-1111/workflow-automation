/**
 * Section tabs and filter controls (spec §9, §10).
 *
 * Filter state lives in the URL, which keeps the dashboard a server-rendered
 * page, makes any view shareable, and survives a reload.
 */

import Link from 'next/link'
import { BUCKET_LABELS } from '@/lib/workflow/buckets'
import { DUE_WINDOWS, DUE_WINDOW_LABELS } from '@/lib/workflow/due-window'
import { WORK_BUCKETS, type WorkBucket } from '@/lib/types/status'
import { buttonClass, controlClass } from '@/features/ui/primitives'
import type { MyWork } from './queries'
import type { MyWorkFilters } from './filters'

type Params = Record<string, string | undefined>

/** Build a link that changes some filters and leaves the rest alone. */
function hrefWith(filters: MyWorkFilters, changes: Params): string {
  const params = new URLSearchParams()
  const merged: Params = {
    view: filters.view,
    project: filters.project,
    workflow: filters.workflow,
    priority: filters.priority,
    due: filters.due,
    q: filters.search,
    group: filters.group === 'none' ? undefined : filters.group,
    sort: filters.sort === 'due' ? undefined : filters.sort,
    ...changes,
  }

  for (const [key, value] of Object.entries(merged)) {
    if (value) params.set(key, value)
  }
  const query = params.toString()
  return query ? `/my-work?${query}` : '/my-work'
}

export function WorkFilters({
  filters,
  work,
}: {
  filters: MyWorkFilters
  work: MyWork
}) {
  const tabs: (WorkBucket | 'all')[] = [...WORK_BUCKETS, 'all']
  const filtered = Boolean(
    filters.project ||
      filters.workflow ||
      filters.priority ||
      filters.due ||
      filters.search,
  )

  return (
    <div className="space-y-4">
      <nav className="flex flex-wrap items-center gap-1 border-b border-border">
        {tabs.map((tab) => {
          const active = filters.view === tab
          const count = tab === 'all' ? undefined : work.counts[tab]

          return (
            <Link
              key={tab}
              href={hrefWith(filters, { view: tab })}
              aria-current={active ? 'page' : undefined}
              className={`-mb-px flex items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm transition ${
                active
                  ? 'border-accent font-medium text-foreground'
                  : 'border-transparent text-muted hover:text-foreground'
              }`}
            >
              {tab === 'all' ? 'All open' : BUCKET_LABELS[tab]}
              {/*
                A count is always rendered once the section has any work, so the
                tab row keeps a steady width instead of shifting as work moves.
              */}
              {count ? (
                <span
                  className={`rounded px-1.5 py-0.5 text-xs font-medium tabular-nums ${
                    tab === 'overdue'
                      ? 'bg-status-overdue-soft text-status-overdue'
                      : active
                        ? 'bg-accent-soft text-accent'
                        : 'bg-status-neutral-soft text-muted'
                  }`}
                >
                  {count}
                </span>
              ) : null}
            </Link>
          )
        })}
      </nav>

      {/* One toolbar rather than a grid of labelled controls: the controls say
          what they are, and stacked captions above each was most of the noise. */}
      <form
        method="get"
        action="/my-work"
        className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2.5"
      >
        <input type="hidden" name="view" value={filters.view} />

        <input
          type="search"
          name="q"
          defaultValue={filters.search ?? ''}
          placeholder="Search client, stage or workflow"
          aria-label="Search my work"
          className={`${controlClass} w-full sm:w-64`}
        />

        <Select
          name="project"
          label="All projects"
          value={filters.project}
          options={work.projects.map((project) => ({
            value: project.projectId,
            label: project.name,
          }))}
        />

        <Select
          name="workflow"
          label="All workflows"
          value={filters.workflow}
          options={work.workflows.map((workflow) => ({
            value: workflow.workflowId,
            label: workflow.name,
          }))}
        />

        <Select
          name="priority"
          label="Any priority"
          value={filters.priority}
          options={[
            { value: 'urgent', label: 'Urgent' },
            { value: 'high', label: 'High' },
            { value: 'medium', label: 'Medium' },
            { value: 'low', label: 'Low' },
          ]}
        />

        <Select
          name="due"
          label="Any deadline"
          value={filters.due}
          options={DUE_WINDOWS.map((choice) => ({
            value: choice,
            label: DUE_WINDOW_LABELS[choice],
          }))}
        />

        <Select
          name="group"
          label="No grouping"
          value={filters.group === 'none' ? undefined : filters.group}
          options={[
            { value: 'project', label: 'Group by project' },
            { value: 'workflow', label: 'Group by workflow' },
            { value: 'status', label: 'Group by status' },
            { value: 'due', label: 'Group by due date' },
          ]}
        />

        <Select
          name="sort"
          label="By deadline"
          value={filters.sort === 'due' ? undefined : filters.sort}
          options={[
            { value: 'priority', label: 'By priority' },
            { value: 'project', label: 'By project' },
          ]}
        />

        <button type="submit" className={`${buttonClass('secondary', 'sm')} ml-auto`}>
          Apply
        </button>

        {filtered ? (
          <Link
            href={hrefWith(filters, {
              project: undefined,
              workflow: undefined,
              priority: undefined,
              q: undefined,
            })}
            className={buttonClass('quiet', 'sm')}
          >
            Clear
          </Link>
        ) : null}
      </form>
    </div>
  )
}

function Select({
  name,
  label,
  value,
  options,
}: {
  name: string
  label: string
  value?: string
  options: { value: string; label: string }[]
}) {
  return (
    <select
      name={name}
      defaultValue={value ?? ''}
      aria-label={label}
      className={`${controlClass} max-w-48`}
    >
      <option value="">{label}</option>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  )
}
