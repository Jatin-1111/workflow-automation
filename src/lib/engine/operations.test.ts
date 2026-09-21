/**
 * Engine rules the end-to-end scenario does not exercise: refusals, shared
 * stages, multi-holder roles and version pinning.
 */

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  completeStage,
  recordFileUpload,
  requestChanges,
  startInstance,
} from './operations'
import {
  applyResult,
  applyStart,
  MemoryIds,
  nextFileId,
  openTaskAt,
} from './memory-runtime'
import { resolveAssignees } from './assignees'
import { formatId } from '@/lib/ids/format'
import type { EngineContext, EngineOutcome } from './index'
import type { RoleId, TaskId, UserId, WorkflowTemplateId } from '@/lib/types/ids'
import type { StageDefinition, WorkflowTemplate } from '@/lib/types/workflow'

const ALICE = formatId('user', 1) as UserId
const BEN = formatId('user', 2) as UserId
const CHARU = formatId('user', 3) as UserId
const REVIEWER_ROLE = formatId('role', 1) as RoleId
const OWNER_ROLE = formatId('role', 2) as RoleId

function stage(overrides: Partial<StageDefinition> & { key: string }): StageDefinition {
  return {
    name: overrides.key,
    assignees: [{ mode: 'role', roleId: OWNER_ROLE }],
    completionRule: 'any',
    fields: [],
    files: [],
    checklist: [],
    priority: 'medium',
    requiresApproval: false,
    nextStageKey: null,
    ...overrides,
  }
}

function templateOf(stages: StageDefinition[]): WorkflowTemplate {
  return {
    workflowId: formatId('workflowTemplate', 1) as WorkflowTemplateId,
    version: 1,
    name: 'Test workflow',
    stages,
    initialStageKey: stages[0].key,
    status: 'active',
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  }
}

const NOW = new Date('2026-02-01T10:00:00Z')

function context(usersByRole: Record<string, UserId[]>): EngineContext {
  return { now: NOW, usersByRole }
}

function expectOk<T>(outcome: EngineOutcome<T>): T {
  assert.ok(outcome.ok, 'expected the engine to accept this operation')
  return outcome.result
}

function codesOf(outcome: EngineOutcome<unknown>): string[] {
  return outcome.ok ? [] : outcome.errors.map((error) => error.code)
}

/** Open a one-stage workflow and return its live state. */
function openWorkflow(
  template: WorkflowTemplate,
  usersByRole: Record<string, UserId[]>,
  initiatedBy: UserId = ALICE,
) {
  const ids = new MemoryIds()
  const start = expectOk(
    startInstance(
      { template, initiatedBy, title: 'Test instance' },
      context(usersByRole),
    ),
  )
  return { ids, state: applyStart(start, ids, NOW) }
}

describe('operation preconditions', () => {
  const template = templateOf([stage({ key: 'only' })])

  it('refuses a task that is not assigned to the actor', () => {
    const { state } = openWorkflow(template, { [OWNER_ROLE]: [ALICE] })
    const task = openTaskAt(state, 'only')!

    const outcome = completeStage({
      template,
      instance: state.instance,
      tasks: state.tasks,
      taskId: task.taskId,
      actor: BEN,
      context: context({ [OWNER_ROLE]: [ALICE] }),
    })

    assert.deepEqual(codesOf(outcome), ['not_assigned'])
  })

  it('refuses an unknown task', () => {
    const { state } = openWorkflow(template, { [OWNER_ROLE]: [ALICE] })

    const outcome = completeStage({
      template,
      instance: state.instance,
      tasks: state.tasks,
      taskId: formatId('task', 999) as TaskId,
      actor: ALICE,
      context: context({ [OWNER_ROLE]: [ALICE] }),
    })

    assert.deepEqual(codesOf(outcome), ['task_not_found'])
  })

  it('refuses to complete the same task twice', () => {
    const { ids, state: opened } = openWorkflow(template, { [OWNER_ROLE]: [ALICE] })
    const task = openTaskAt(opened, 'only')!

    const state = applyResult(
      opened,
      expectOk(
        completeStage({
          template,
          instance: opened.instance,
          tasks: opened.tasks,
          taskId: task.taskId,
          actor: ALICE,
          context: context({ [OWNER_ROLE]: [ALICE] }),
        }),
      ),
      ids,
      NOW,
    )

    const again = completeStage({
      template,
      instance: state.instance,
      tasks: state.tasks,
      taskId: task.taskId,
      actor: ALICE,
      context: context({ [OWNER_ROLE]: [ALICE] }),
    })

    // The instance also finished, so both guards apply; either is a valid stop.
    assert.ok(codesOf(again).includes('task_already_completed'))
  })

  it('refuses to start when the stage role has no holder', () => {
    const outcome = startInstance(
      { template, initiatedBy: ALICE, title: 'Nobody home' },
      context({}),
    )

    assert.deepEqual(codesOf(outcome), ['no_assignee_resolved'])
  })

  it('refuses to advance into a stage whose role has no holder', () => {
    const twoStage = templateOf([
      stage({ key: 'first', nextStageKey: 'second' }),
      stage({ key: 'second', assignees: [{ mode: 'role', roleId: REVIEWER_ROLE }] }),
    ])
    const { state } = openWorkflow(twoStage, { [OWNER_ROLE]: [ALICE] })

    const outcome = completeStage({
      template: twoStage,
      instance: state.instance,
      tasks: state.tasks,
      taskId: openTaskAt(state, 'first')!.taskId,
      actor: ALICE,
      context: context({ [OWNER_ROLE]: [ALICE] }),
    })

    // Better to refuse than to strand the work on nobody's dashboard.
    assert.deepEqual(codesOf(outcome), ['no_assignee_resolved'])
  })
})

describe('completion rules', () => {
  it('advances on the first completion when the rule is "any"', () => {
    const template = templateOf([
      stage({
        key: 'shared',
        assignees: [{ mode: 'initiator' }, { mode: 'role', roleId: OWNER_ROLE }],
        nextStageKey: 'after',
      }),
      stage({ key: 'after' }),
    ])
    const { ids, state: opened } = openWorkflow(template, { [OWNER_ROLE]: [BEN] })

    assert.deepEqual([...openTaskAt(opened, 'shared')!.assignees].sort(), [ALICE, BEN].sort())

    const state = applyResult(
      opened,
      expectOk(
        completeStage({
          template,
          instance: opened.instance,
          tasks: opened.tasks,
          taskId: openTaskAt(opened, 'shared')!.taskId,
          actor: ALICE,
          context: context({ [OWNER_ROLE]: [BEN] }),
        }),
      ),
      ids,
      NOW,
    )

    assert.ok(openTaskAt(state, 'after'), 'one owner finishing closes the stage')
  })

  it('waits for every assignee when the rule is "all"', () => {
    const template = templateOf([
      stage({
        key: 'shared',
        completionRule: 'all',
        assignees: [{ mode: 'initiator' }, { mode: 'role', roleId: OWNER_ROLE }],
        nextStageKey: 'after',
      }),
      stage({ key: 'after' }),
    ])
    const { ids, state: opened } = openWorkflow(template, { [OWNER_ROLE]: [BEN] })
    const sharedId = openTaskAt(opened, 'shared')!.taskId

    const afterFirst = applyResult(
      opened,
      expectOk(
        completeStage({
          template,
          instance: opened.instance,
          tasks: opened.tasks,
          taskId: sharedId,
          actor: ALICE,
          context: context({ [OWNER_ROLE]: [BEN] }),
        }),
      ),
      ids,
      NOW,
    )

    assert.equal(openTaskAt(afterFirst, 'after'), undefined, 'must not advance yet')
    assert.deepEqual(openTaskAt(afterFirst, 'shared')!.completedBy, [ALICE])

    const afterSecond = applyResult(
      afterFirst,
      expectOk(
        completeStage({
          template,
          instance: afterFirst.instance,
          tasks: afterFirst.tasks,
          taskId: sharedId,
          actor: BEN,
          context: context({ [OWNER_ROLE]: [BEN] }),
        }),
      ),
      ids,
      NOW,
    )

    assert.ok(openTaskAt(afterSecond, 'after'), 'the last assignee closes the stage')
  })
})

describe('assignee resolution', () => {
  it('assigns every holder when a role maps to several people', () => {
    const template = templateOf([stage({ key: 'only' })])
    const { state } = openWorkflow(template, { [OWNER_ROLE]: [ALICE, BEN, CHARU] })

    assert.deepEqual(openTaskAt(state, 'only')!.assignees, [ALICE, BEN, CHARU])
  })

  it('de-duplicates a person reachable through two sources', () => {
    const shared = stage({
      key: 'shared',
      assignees: [{ mode: 'initiator' }, { mode: 'role', roleId: OWNER_ROLE }],
    })

    const resolved = resolveAssignees(
      shared,
      { initiatedBy: ALICE },
      [],
      context({ [OWNER_ROLE]: [ALICE] }),
    )

    assert.deepEqual(resolved, [ALICE])
  })

  it('routes back to whoever actually did an earlier stage', () => {
    const template = templateOf([
      stage({ key: 'work', nextStageKey: 'review' }),
      stage({
        key: 'review',
        assignees: [{ mode: 'role', roleId: REVIEWER_ROLE }],
        requiresApproval: true,
        rejectTargetStageKey: 'rework',
        nextStageKey: null,
      }),
      stage({
        key: 'rework',
        assignees: [{ mode: 'stage_assignee', stageKey: 'work' }],
      }),
    ])
    const usersByRole = { [OWNER_ROLE]: [BEN], [REVIEWER_ROLE]: [CHARU] }
    const { ids, state: opened } = openWorkflow(template, usersByRole)

    const afterWork = applyResult(
      opened,
      expectOk(
        completeStage({
          template,
          instance: opened.instance,
          tasks: opened.tasks,
          taskId: openTaskAt(opened, 'work')!.taskId,
          actor: BEN,
          context: context(usersByRole),
        }),
      ),
      ids,
      NOW,
    )

    const rejected = applyResult(
      afterWork,
      expectOk(
        requestChanges({
          template,
          instance: afterWork.instance,
          tasks: afterWork.tasks,
          taskId: openTaskAt(afterWork, 'review')!.taskId,
          actor: CHARU,
          submission: { comment: 'Needs another pass.' },
          context: context(usersByRole),
        }),
      ),
      ids,
      NOW,
    )

    // Ben did the work, so Ben gets the rework - even though the role could
    // now resolve to someone else.
    assert.deepEqual(openTaskAt(rejected, 'rework')!.assignees, [BEN])
  })
})

describe('rejection routing', () => {
  const usersByRole = { [OWNER_ROLE]: [ALICE], [REVIEWER_ROLE]: [BEN] }

  it('refuses to reject from a stage that is not an approval gate', () => {
    const template = templateOf([stage({ key: 'only' })])
    const { state } = openWorkflow(template, usersByRole)

    const outcome = requestChanges({
      template,
      instance: state.instance,
      tasks: state.tasks,
      taskId: openTaskAt(state, 'only')!.taskId,
      actor: ALICE,
      submission: { comment: 'nope' },
      context: context(usersByRole),
    })

    assert.deepEqual(codesOf(outcome), ['not_an_approval_stage'])
  })

  it('can send work back further than the previous stage', () => {
    const template = templateOf([
      stage({ key: 'draft', nextStageKey: 'polish' }),
      stage({ key: 'polish', nextStageKey: 'sign_off' }),
      stage({
        key: 'sign_off',
        assignees: [{ mode: 'role', roleId: REVIEWER_ROLE }],
        requiresApproval: true,
        // Two stages back, which is the point of configuring the target.
        rejectTargetStageKey: 'draft',
        nextStageKey: null,
      }),
    ])
    const { ids, state: opened } = openWorkflow(template, usersByRole)

    let state = opened
    for (const key of ['draft', 'polish']) {
      state = applyResult(
        state,
        expectOk(
          completeStage({
            template,
            instance: state.instance,
            tasks: state.tasks,
            taskId: openTaskAt(state, key)!.taskId,
            actor: ALICE,
            context: context(usersByRole),
          }),
        ),
        ids,
        NOW,
      )
    }

    state = applyResult(
      state,
      expectOk(
        requestChanges({
          template,
          instance: state.instance,
          tasks: state.tasks,
          taskId: openTaskAt(state, 'sign_off')!.taskId,
          actor: BEN,
          submission: { comment: 'Start again from the draft.' },
          context: context(usersByRole),
        }),
      ),
      ids,
      NOW,
    )

    assert.ok(openTaskAt(state, 'draft'))
    assert.equal(openTaskAt(state, 'draft')!.revisionRound, 2)
    assert.deepEqual(state.instance.currentStageKeys, ['draft'])
  })
})

describe('version pinning', () => {
  it('records the template version an instance started on', () => {
    const template = { ...templateOf([stage({ key: 'only' })]), version: 3 }
    const { state } = openWorkflow(template, { [OWNER_ROLE]: [ALICE] })

    assert.equal(state.instance.templateVersion, 3)
  })
})

describe('who is told when work moves', () => {
  const template = templateOf([
    stage({ key: 'draft', nextStageKey: 'review' }),
    stage({
      key: 'review',
      assignees: [{ mode: 'role', roleId: REVIEWER_ROLE }],
    }),
  ])
  const roles = { [OWNER_ROLE]: [BEN], [REVIEWER_ROLE]: [CHARU] }

  function completeDraft(initiatedBy: UserId) {
    const { state } = openWorkflow(template, roles, initiatedBy)
    const task = openTaskAt(state, 'draft')!
    return expectOk(
      completeStage({
        instance: state.instance,
        template,
        tasks: state.tasks,
        taskId: task.taskId,
        actor: BEN,
        context: context(roles),
      }),
    )
  }

  it('tells whoever raised the work that it has moved on', () => {
    const result = completeDraft(ALICE)
    const toInitiator = result.notifications.filter((note) => note.recipientId === ALICE)

    assert.equal(toInitiator.length, 1)
    assert.equal(toInitiator[0].kind, 'stage_completed')
    assert.match(toInitiator[0].body ?? '', /draft is finished\. Now with review\./)
    // Pointed at the stage now holding it, which is the thing they want to open.
    assert.equal(toInitiator[0].taskStageKey, 'review')
  })

  it('does not tell somebody about their own work', () => {
    // BEN raised it and BEN completed it: the notice would tell him nothing.
    const result = completeDraft(BEN)
    assert.deepEqual(
      result.notifications.filter((note) => note.recipientId === BEN),
      [],
    )
  })

  it('does not double up when the next stage is the initiator’s own', () => {
    // CHARU raised it and holds the review, so she gets the assignment alone.
    const result = completeDraft(CHARU)
    const toCharu = result.notifications.filter((note) => note.recipientId === CHARU)

    assert.equal(toCharu.length, 1)
    assert.equal(toCharu[0].kind, 'task_assigned')
  })

  it('tells the other holders of a shared stage about an upload', () => {
    const shared = templateOf([
      stage({ key: 'only', assignees: [{ mode: 'users', userIds: [BEN, CHARU] }] }),
    ])
    const { ids, state } = openWorkflow(shared, roles)
    const task = openTaskAt(state, 'only')!

    const result = expectOk(
      recordFileUpload({
        instance: state.instance,
        template: shared,
        tasks: state.tasks,
        taskId: task.taskId,
        actor: BEN,
        context: context(roles),
        file: { fileId: nextFileId(ids), version: 1 },
      }),
    )

    assert.equal(result.notifications.length, 1)
    assert.equal(result.notifications[0].recipientId, CHARU)
    assert.equal(result.notifications[0].kind, 'file_uploaded')
    assert.equal(result.notifications[0].taskId, task.taskId)
  })

  it('says nothing about an upload to a stage held by one person', () => {
    const { ids, state } = openWorkflow(template, roles)
    const task = openTaskAt(state, 'draft')!

    const result = expectOk(
      recordFileUpload({
        instance: state.instance,
        template,
        tasks: state.tasks,
        taskId: task.taskId,
        actor: BEN,
        context: context(roles),
        file: { fileId: nextFileId(ids), version: 1 },
      }),
    )

    assert.deepEqual(result.notifications, [])
  })
})
