/**
 * The management view's filter bar (spec §49).
 *
 * A plain form with a GET submit, so the filtered view has a URL somebody can
 * bookmark, send to a colleague or reload — which is most of what a manager
 * wants from a filter they use every morning.
 */

import Link from 'next/link'
import { Count, buttonClass, controlClass } from '@/features/ui/primitives'
import { DUE_WINDOWS, DUE_WINDOW_LABELS, activeFilterCount } from './filters'
import { humanise } from '@/features/my-work/format'
import { PRIORITIES, TASK_STATUSES } from '@/lib/types/status'
import type { OverviewFilters } from './filters'

export interface FilterOption {
  value: string
  label: string
}

function Choice({
  name,
  label,
  value,
  options,
}: {
  name: string
  label: string
  value?: string
  options: FilterOption[]
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-medium text-muted">{label}</span>
      <select name={name} defaultValue={value ?? ''} className={controlClass}>
        <option value="">Any</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  )
}

export function OverviewFilterBar({
  filters,
  projects,
  workflows,
  people,
  roles,
  departments,
}: {
  filters: OverviewFilters
  projects: FilterOption[]
  workflows: FilterOption[]
  people: FilterOption[]
  roles: FilterOption[]
  departments: FilterOption[]
}) {
  const active = activeFilterCount(filters)

  return (
    <form
      method="get"
      className="mb-6 rounded-xl border border-border bg-surface px-5 py-4"
    >
      <div className="mb-3 flex items-center justify-between gap-4">
        <h2 className="text-sm font-semibold text-foreground">
          Filter
          {active > 0 ? <Count value={active} /> : null}
        </h2>
        {active > 0 ? (
          <Link href="/dashboard" className={buttonClass('quiet', 'sm')}>
            Clear
          </Link>
        ) : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Choice name="project" label="Project" value={filters.project} options={projects} />
        <Choice name="workflow" label="Workflow" value={filters.workflow} options={workflows} />
        <Choice name="user" label="Person" value={filters.user} options={people} />
        <Choice name="role" label="Role" value={filters.role} options={roles} />
        <Choice
          name="department"
          label="Department"
          value={filters.department}
          options={departments}
        />
        <Choice
          name="status"
          label="Status"
          value={filters.status}
          options={TASK_STATUSES.map((status) => ({
            value: status,
            label: humanise(status),
          }))}
        />
        <Choice
          name="priority"
          label="Priority"
          value={filters.priority}
          options={PRIORITIES.map((priority) => ({
            value: priority,
            label: humanise(priority),
          }))}
        />
        <Choice
          name="due"
          label="Deadline"
          value={filters.due}
          options={DUE_WINDOWS.map((window) => ({
            value: window,
            label: DUE_WINDOW_LABELS[window],
          }))}
        />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button type="submit" className={buttonClass('primary', 'sm')}>
          Apply
        </button>
        {active > 0 ? (
          <p className="text-xs text-subtle">
            Every figure below counts only the work that matches.
          </p>
        ) : null}
      </div>
    </form>
  )
}
