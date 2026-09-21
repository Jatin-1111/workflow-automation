import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  applyFilters,
  applyWaitingFilters,
  groupItems,
  parseFilters,
  sortItems,
} from './filters'
import { formatId } from '@/lib/ids/format'
import type { WaitingItem, WorkItem } from './queries'

const NOW = new Date('2026-04-10T10:00:00Z')
const MELA = formatId('project', 1)
const SUMMIT = formatId('project', 2)
const PROPOSAL = formatId('workflowTemplate', 1)
const PODCAST_FLOW = formatId('workflowTemplate', 2)

let sequence = 0
function item(overrides: Partial<WorkItem> = {}): WorkItem {
  sequence += 1
  return {
    taskId: formatId('task', sequence),
    instanceId: formatId('workflowInstance', sequence),
    projectId: MELA,
    projectName: 'Startup Mela 2027',
    workflowId: PROPOSAL,
    workflowName: 'Proposal Creation',
    instanceTitle: 'Proposal — ABC Technologies',
    stageName: 'Design & Formatting',
    status: 'not_started',
    priority: 'medium',
    bucket: 'needs_action',
    revisionRound: 1,
    slaBreached: false,
    ...overrides,
  }
}

describe('parseFilters', () => {
  it('defaults to the Needs action view with no grouping', () => {
    const filters = parseFilters({})
    assert.equal(filters.view, 'needs_action')
    assert.equal(filters.group, 'none')
    assert.equal(filters.sort, 'due')
  })

  it('ignores values that are not part of the vocabulary', () => {
    const filters = parseFilters({
      view: 'nonsense',
      group: 'by-colour',
      sort: 'random',
      priority: 'extreme',
    })
    assert.equal(filters.view, 'needs_action')
    assert.equal(filters.group, 'none')
    assert.equal(filters.sort, 'due')
    assert.equal(filters.priority, undefined)
  })

  it('treats blank and repeated parameters sensibly', () => {
    const filters = parseFilters({ q: '   ', project: ['BO-PRJ-00001', 'BO-PRJ-00002'] })
    assert.equal(filters.search, undefined)
    assert.equal(filters.project, 'BO-PRJ-00001')
  })
})

describe('applyFilters', () => {
  const items = [
    item({ bucket: 'needs_action' }),
    item({ bucket: 'overdue', priority: 'urgent' }),
    item({ bucket: 'completed' }),
    item({
      bucket: 'needs_action',
      projectId: SUMMIT,
      projectName: 'AI Summit',
      workflowId: PODCAST_FLOW,
      workflowName: 'Podcast Production',
      instanceTitle: 'Episode 04',
      stageName: 'Edit Video',
    }),
  ]

  it('shows only the selected section', () => {
    const shown = applyFilters(items, parseFilters({ view: 'overdue' }))
    assert.equal(shown.length, 1)
    assert.equal(shown[0].priority, 'urgent')
  })

  it('treats "all" as everything still open, not everything ever', () => {
    const shown = applyFilters(items, parseFilters({ view: 'all' }))
    assert.equal(shown.length, 3)
    assert.equal(
      shown.some((row) => row.bucket === 'completed'),
      false,
    )
  })

  it('filters by project and by workflow', () => {
    assert.equal(
      applyFilters(items, parseFilters({ view: 'all', project: SUMMIT })).length,
      1,
    )
    assert.equal(
      applyFilters(items, parseFilters({ view: 'all', workflow: PROPOSAL })).length,
      2,
    )
  })

  it('searches across every name on the row, ignoring case', () => {
    assert.equal(applyFilters(items, parseFilters({ view: 'all', q: 'episode' })).length, 1)
    assert.equal(applyFilters(items, parseFilters({ view: 'all', q: 'edit video' })).length, 1)
    assert.equal(applyFilters(items, parseFilters({ view: 'all', q: 'ai summit' })).length, 1)
    assert.equal(applyFilters(items, parseFilters({ view: 'all', q: 'nothing' })).length, 0)
  })

  it('combines filters rather than replacing them', () => {
    const shown = applyFilters(
      items,
      parseFilters({ view: 'all', project: SUMMIT, q: 'episode' }),
    )
    assert.equal(shown.length, 1)

    const contradictory = applyFilters(
      items,
      parseFilters({ view: 'all', project: MELA, q: 'episode' }),
    )
    assert.equal(contradictory.length, 0)
  })
})

describe('sortItems', () => {
  it('puts the soonest deadline first and undated work last', () => {
    const rows = [
      item({ stageName: 'none' }),
      item({ stageName: 'later', dueAt: new Date('2026-04-12T10:00:00Z') }),
      item({ stageName: 'sooner', dueAt: new Date('2026-04-11T10:00:00Z') }),
    ]
    assert.deepEqual(
      sortItems(rows, 'due').map((row) => row.stageName),
      ['sooner', 'later', 'none'],
    )
  })

  it('orders by priority when asked, breaking ties on the deadline', () => {
    const rows = [
      item({ stageName: 'medium', priority: 'medium' }),
      item({ stageName: 'urgent', priority: 'urgent' }),
      item({ stageName: 'high-late', priority: 'high', dueAt: new Date('2026-04-14T10:00:00Z') }),
      item({ stageName: 'high-soon', priority: 'high', dueAt: new Date('2026-04-11T10:00:00Z') }),
    ]
    assert.deepEqual(
      sortItems(rows, 'priority').map((row) => row.stageName),
      ['urgent', 'high-soon', 'high-late', 'medium'],
    )
  })

  it('does not mutate the array it was given', () => {
    const rows = [item({ priority: 'low' }), item({ priority: 'urgent' })]
    const before = rows.map((row) => row.taskId)
    sortItems(rows, 'priority')
    assert.deepEqual(
      rows.map((row) => row.taskId),
      before,
    )
  })
})

describe('groupItems', () => {
  const rows = [
    item({ projectName: 'Startup Mela 2027' }),
    item({ projectName: 'AI Summit' }),
    item({ projectName: 'Startup Mela 2027' }),
  ]

  it('returns a single unlabelled group when grouping is off', () => {
    const groups = groupItems(rows, 'none', NOW)
    assert.equal(groups.length, 1)
    assert.equal(groups[0].label, '')
    assert.equal(groups[0].items.length, 3)
  })

  it('groups by project with counts, in alphabetical order', () => {
    const groups = groupItems(rows, 'project', NOW)
    assert.deepEqual(
      groups.map((group) => [group.label, group.items.length]),
      [
        ['AI Summit', 1],
        ['Startup Mela 2027', 2],
      ],
    )
  })

  it('buckets deadlines into readable bands', () => {
    const dated = [
      item({ dueAt: new Date('2026-04-09T10:00:00Z') }),
      item({ dueAt: new Date('2026-04-10T18:00:00Z') }),
      item({ dueAt: new Date('2026-04-11T18:00:00Z') }),
      item({ dueAt: undefined }),
    ]
    assert.deepEqual(
      groupItems(dated, 'due', NOW)
        .map((group) => group.label)
        .sort(),
      ['No deadline', 'Overdue', 'Today', 'Tomorrow'],
    )
  })

  it('keeps every row when grouping', () => {
    const total = groupItems(rows, 'workflow', NOW).reduce(
      (count, group) => count + group.items.length,
      0,
    )
    assert.equal(total, rows.length)
  })
})

describe('applyWaitingFilters', () => {
  const waiting: WaitingItem[] = [
    {
      instanceId: formatId('workflowInstance', 90),
      projectId: MELA,
      workflowId: PROPOSAL,
      projectName: 'Startup Mela 2027',
      workflowName: 'Proposal Creation',
      instanceTitle: 'Proposal — XYZ Technologies',
      stageName: 'Final Approval',
      waitingOn: ['Tanu'],
      hoursWaiting: 30,
      slaBreached: true,
    },
    {
      instanceId: formatId('workflowInstance', 91),
      projectId: SUMMIT,
      workflowId: PROPOSAL,
      projectName: 'AI Summit',
      workflowName: 'Proposal Creation',
      instanceTitle: 'Proposal — DEF Media',
      stageName: 'Proposal Content',
      waitingOn: ['Tanu'],
      hoursWaiting: 2,
      slaBreached: false,
    },
  ]

  it('applies the same project filter as the task list', () => {
    assert.equal(
      applyWaitingFilters(waiting, parseFilters({ view: 'all', project: SUMMIT })).length,
      1,
    )
  })

  it('searches the person the work is waiting on', () => {
    assert.equal(
      applyWaitingFilters(waiting, parseFilters({ view: 'all', q: 'tanu' })).length,
      2,
    )
    assert.equal(
      applyWaitingFilters(waiting, parseFilters({ view: 'all', q: 'ananya' })).length,
      0,
    )
  })

  it('leaves the list alone when nothing is filtered', () => {
    assert.equal(applyWaitingFilters(waiting, parseFilters({ view: 'all' })).length, 2)
  })
})

describe('filtering by deadline (spec §10)', () => {
  const HOUR = 3_600_000

  // Rows as the dashboard has already bucketed them: the filter trusts that
  // work rather than deciding overdue a second time.
  const late = item({ bucket: 'overdue', dueAt: new Date(NOW.getTime() - HOUR) })
  const soon = item({ bucket: 'needs_action', dueAt: new Date(NOW.getTime() + 2 * HOUR) })
  const later = item({ bucket: 'upcoming', dueAt: new Date(NOW.getTime() + 5 * 86_400_000) })
  const undated = item({ bucket: 'needs_action', dueAt: undefined })
  const all = [late, soon, later, undated]

  function shown(due: string) {
    return applyFilters(all, parseFilters({ view: 'all', due }), NOW).map((i) => i.taskId)
  }

  it('answers each deadline question separately', () => {
    assert.deepEqual(shown('overdue'), [late.taskId])
    assert.deepEqual(shown('none'), [undated.taskId])
    // Already past is not "due today": overdue is its own answer.
    assert.deepEqual(shown('today'), [soon.taskId])
    assert.deepEqual(shown('week'), [soon.taskId, later.taskId])
  })

  it('ignores a deadline value it does not recognise', () => {
    assert.equal(parseFilters({ due: 'someday' }).due, undefined)
    assert.equal(applyFilters(all, parseFilters({ view: 'all', due: 'someday' }), NOW).length, 4)
  })
})
