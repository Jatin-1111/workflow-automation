import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  activeFilterCount,
  filterPeople,
  filterTasks,
  hasAnyFilter,
  instancesMatching,
  parseOverviewFilters,
  type PersonIndex,
} from './filters'
import { formatId } from '@/lib/ids/format'
import type { Task } from '@/lib/types/task'
import type { WorkflowInstance } from '@/lib/types/instance'
import type { DepartmentId, RoleId, UserId } from '@/lib/types/ids'

const NOW = new Date('2026-03-10T09:00:00Z')
const HOUR = 3_600_000

const ANANYA = formatId('user', 1) as UserId
const HARNOOR = formatId('user', 2) as UserId
const DESIGN = formatId('department', 1) as DepartmentId
const SALES = formatId('department', 2) as DepartmentId
const DESIGNER = formatId('role', 1) as RoleId
const SELLER = formatId('role', 2) as RoleId
const PROJECT_A = formatId('project', 1)
const WORKFLOW_A = formatId('workflowTemplate', 1)

const INDEX: PersonIndex = {
  departmentOf: new Map([
    [ANANYA, DESIGN],
    [HARNOOR, SALES],
  ]),
  rolesOf: new Map([
    [ANANYA, [DESIGNER]],
    [HARNOOR, [SELLER]],
  ]),
}

let sequence = 0
function task(overrides: Partial<Task> = {}): Task {
  sequence += 1
  return {
    taskId: formatId('task', sequence),
    instanceId: formatId('workflowInstance', 1),
    workflowId: WORKFLOW_A,
    projectId: PROJECT_A,
    stageKey: 'stage',
    stageName: 'Stage',
    assignees: [ANANYA],
    completionRule: 'any',
    completedBy: [],
    status: 'not_started',
    priority: 'medium',
    revisionRound: 1,
    fieldValues: {},
    checklist: [],
    files: [],
    activatedAt: new Date(NOW.getTime() - 4 * HOUR),
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  }
}

describe('reading filters from a URL', () => {
  it('keeps only values the system recognises', () => {
    const filters = parseOverviewFilters({
      status: 'blocked',
      priority: 'nonsense',
      due: 'week',
      user: '  ',
    })

    assert.equal(filters.status, 'blocked')
    assert.equal(filters.priority, undefined)
    assert.equal(filters.due, 'week')
    // Whitespace is not a filter, and would otherwise match nobody.
    assert.equal(filters.user, undefined)
  })

  it('reports whether anything is narrowing the view', () => {
    assert.equal(hasAnyFilter(parseOverviewFilters({})), false)
    assert.equal(activeFilterCount(parseOverviewFilters({ due: 'today', status: 'blocked' })), 2)
  })
})

describe('filtering work', () => {
  it('narrows by the department of whoever holds it', () => {
    const tasks = [task(), task({ assignees: [HARNOOR] })]
    const design = filterTasks(tasks, { department: DESIGN }, INDEX, NOW)

    assert.deepEqual(design.map((t) => t.assignees), [[ANANYA]])
  })

  it('keeps a shared stage that reaches into the department', () => {
    // One holder in Design, one in Sales: it belongs in both views.
    const shared = task({ assignees: [ANANYA, HARNOOR] })

    assert.equal(filterTasks([shared], { department: DESIGN }, INDEX, NOW).length, 1)
    assert.equal(filterTasks([shared], { department: SALES }, INDEX, NOW).length, 1)
  })

  it('narrows by a role somebody holds, not by the stage name', () => {
    const tasks = [task(), task({ assignees: [HARNOOR] })]
    assert.equal(filterTasks(tasks, { role: SELLER }, INDEX, NOW).length, 1)
  })

  it('separates overdue from due today', () => {
    const late = task({ dueAt: new Date(NOW.getTime() - HOUR) })
    const soon = task({ dueAt: new Date(NOW.getTime() + 2 * HOUR) })
    const later = task({ dueAt: new Date(NOW.getTime() + 5 * 86_400_000) })
    const undated = task({ dueAt: undefined })
    const all = [late, soon, later, undated]

    assert.deepEqual(filterTasks(all, { due: 'overdue' }, INDEX, NOW), [late])
    assert.deepEqual(filterTasks(all, { due: 'none' }, INDEX, NOW), [undated])
    // Due today excludes what is already past: overdue is its own answer.
    assert.deepEqual(filterTasks(all, { due: 'today' }, INDEX, NOW), [soon])
    assert.deepEqual(filterTasks(all, { due: 'week' }, INDEX, NOW), [soon, later])
  })

  it('combines filters rather than choosing between them', () => {
    const tasks = [
      task({ priority: 'urgent' }),
      task({ priority: 'urgent', assignees: [HARNOOR] }),
      task({ priority: 'low' }),
    ]
    const found = filterTasks(tasks, { priority: 'urgent', department: DESIGN }, INDEX, NOW)

    assert.equal(found.length, 1)
    assert.equal(found[0].priority, 'urgent')
    assert.deepEqual(found[0].assignees, [ANANYA])
  })
})

describe('which runs stay in view', () => {
  const instances = [
    { instanceId: formatId('workflowInstance', 1), status: 'completed' },
    { instanceId: formatId('workflowInstance', 2), status: 'active' },
  ] as WorkflowInstance[]

  const allTasks = [
    task({ instanceId: instances[0].instanceId, completedAt: NOW, status: 'completed' }),
    task({ instanceId: instances[1].instanceId, assignees: [HARNOOR] }),
  ]

  it('leaves everything alone when nothing is filtered', () => {
    assert.equal(instancesMatching(instances, allTasks, {}, INDEX).length, 2)
  })

  it('keeps a finished run whose work was in the chosen department', () => {
    // Worked out from every task, not just open ones: a completed workflow has
    // none, and would otherwise disappear from "completed this week".
    const kept = instancesMatching(instances, allTasks, { department: DESIGN }, INDEX)
    assert.deepEqual(kept.map((i) => i.instanceId), [instances[0].instanceId])
  })

  it('ignores deadline and status, which describe a task not a run', () => {
    const kept = instancesMatching(instances, allTasks, { due: 'overdue' }, INDEX)
    assert.equal(kept.length, 2)
  })
})

describe('who appears in the workload table', () => {
  const people = [
    { userId: ANANYA, roleIds: [DESIGNER], departmentId: DESIGN },
    { userId: HARNOOR, roleIds: [SELLER], departmentId: SALES },
  ]

  it('narrows to the chosen department', () => {
    assert.deepEqual(
      filterPeople(people, { department: SALES }).map((p) => p.userId),
      [HARNOOR],
    )
  })

  it('narrows to one person', () => {
    assert.deepEqual(filterPeople(people, { user: ANANYA }).map((p) => p.userId), [ANANYA])
  })
})
