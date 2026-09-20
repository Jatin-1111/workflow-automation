/**
 * Section tabs and filter controls (spec §9, §10).
 *
 * Filter state lives in the URL, which keeps the dashboard a server-rendered
 * page, makes any view shareable, and survives a reload.
 */

import Link from 'next/link'
import { BUCKET_LABELS } from '@/lib/workflow/buckets'
import { WORK_BUCKETS, type WorkBucket } from '@/lib/types/status'
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
              className={`-mb-px border-b-2 px-3 py-2 text-sm transition ${
                active
                  ? 'border-accent font-medium text-foreground'
                  : 'border-transparent text-muted hover:text-foreground'
              }`}
            >
              {tab === 'all' ? 'All open' : BUCKET_LABELS[tab]}
              {count ? (
                <span
                  className={`ml-1.5 text-xs ${
                    tab === 'overdue' && count > 0 ? 'text-status-overdue' : 'text-subtle'
                  }`}
                >
                  {count}
                </span>
              ) : null}
            </Link>
          )
        })}
      </nav>

      <form method="get" action="/my-work" className="flex flex-wrap items-end gap-3">
        <input type="hidden" name="view" value={filters.view} />

        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-medium uppercase tracking-wide text-subtle">
            Search
          </span>
          <input
            type="search"
            name="q"
            defaultValue={filters.search ?? ''}
            placeholder="Client, stage, workflow…"
            className="h-9 w-56 rounded-md border border-border bg-surface px-3 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent-soft"
          />
        </label>

        <Select
          name="project"
          label="Project"
          value={filters.project}
          options={work.projects.map((project) => ({
            value: project.projectId,
            label: project.name,
          }))}
        />

        <Select
          name="workflow"
          label="Workflow"
          value={filters.workflow}
          options={work.workflows.map((workflow) => ({
            value: workflow.workflowId,
            label: workflow.name,
          }))}
        />

        <Select
          name="priority"
          label="Priority"
          value={filters.priority}
          options={[
            { value: 'urgent', label: 'Urgent' },
            { value: 'high', label: 'High' },
            { value: 'medium', label: 'Medium' },
            { value: 'low', label: 'Low' },
          ]}
        />

        <Select
          name="group"
          label="Group by"
          value={filters.group === 'none' ? undefined : filters.group}
          anyLabel="No grouping"
          options={[
            { value: 'project', label: 'Project' },
            { value: 'workflow', label: 'Workflow' },
            { value: 'status', label: 'Status' },
            { value: 'due', label: 'Due date' },
          ]}
        />

        <Select
          name="sort"
          label="Sort"
          value={filters.sort === 'due' ? undefined : filters.sort}
          anyLabel="Deadline"
          options={[
            { value: 'priority', label: 'Priority' },
            { value: 'project', label: 'Project' },
          ]}
        />

        <button
          type="submit"
          className="h-9 rounded-md border border-border-strong bg-surface px-3 text-sm font-medium transition hover:bg-accent-soft"
        >
          Apply
        </button>

        {filters.project || filters.workflow || filters.priority || filters.search ? (
          <Link
            href={hrefWith(filters, {
              project: undefined,
              workflow: undefined,
              priority: undefined,
              q: undefined,
            })}
            className="h-9 px-1 pt-2 text-sm text-muted transition hover:text-foreground"
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
  anyLabel = 'All',
}: {
  name: string
  label: string
  value?: string
  options: { value: string; label: string }[]
  anyLabel?: string
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] font-medium uppercase tracking-wide text-subtle">
        {label}
      </span>
      <select
        name={name}
        defaultValue={value ?? ''}
        className="h-9 rounded-md border border-border bg-surface px-2 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent-soft"
      >
        <option value="">{anyLabel}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  )
}
