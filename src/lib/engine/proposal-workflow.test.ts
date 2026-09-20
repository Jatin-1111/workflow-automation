/**
 * The end-to-end scenario the brief defines as done (spec §55).
 *
 * Driven entirely through the engine with no database, which is what proves
 * the engine carries no hidden dependency on storage - and no knowledge of
 * proposals beyond what the template document says.
 */

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  approve,
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
  openTasksFor,
  type WorkflowState,
} from './memory-runtime'
import { buildWorkflowTemplate } from '@/lib/seed/workflows/build'
import { PROPOSAL_CREATION_WORKFLOW } from '@/lib/seed/workflows/proposal-creation'
import { ROLE_SEEDS } from '@/lib/seed/organization'
import { formatId } from '@/lib/ids/format'
import type { EngineContext, EngineOutcome } from './index'
import type { RoleId, UserId, WorkflowTemplateId } from '@/lib/types/ids'
import type { WorkflowTemplate } from '@/lib/types/workflow'

// --- Fixtures -------------------------------------------------------------

const HARNOOR = formatId('user', 3) as UserId
const TANU = formatId('user', 2) as UserId
const ANANYA = formatId('user', 4) as UserId

const roleIdByKey = new Map<string, RoleId>(
  ROLE_SEEDS.map((role, index) => [role.key, formatId('role', index + 1) as RoleId]),
)

function roleId(key: string): RoleId {
  const id = roleIdByKey.get(key)
  assert.ok(id, `unknown role ${key}`)
  return id
}

/** Role-to-person mapping, exactly as the seed sets it up. */
const USERS_BY_ROLE: Record<string, UserId[]> = {
  [roleId('sales')]: [HARNOOR],
  [roleId('proposal_content_owner')]: [TANU],
  [roleId('final_proposal_approver')]: [TANU],
  [roleId('proposal_designer')]: [ANANYA],
  [roleId('proposal_qc_owner')]: [ANANYA],
}

function template(): WorkflowTemplate {
  return buildWorkflowTemplate(PROPOSAL_CREATION_WORKFLOW, {
    workflowId: formatId('workflowTemplate', 1) as WorkflowTemplateId,
    version: 1,
    now: new Date('2026-01-01T09:00:00Z'),
    roleIdByKey,
  })
}

let clock = new Date('2026-01-05T09:00:00Z')
function tick(minutes = 30): Date {
  clock = new Date(clock.getTime() + minutes * 60_000)
  return clock
}

function context(usersByRole = USERS_BY_ROLE): EngineContext {
  return { now: clock, usersByRole }
}

/** Unwrap an engine outcome, failing the test with its refusals. */
function expectOk<T>(outcome: EngineOutcome<T>): T {
  assert.ok(
    outcome.ok,
    `expected success, got: ${
      outcome.ok ? '' : outcome.errors.map((error) => error.code).join(', ')
    }`,
  )
  return outcome.result
}

const REQUEST_FIELDS = {
  client_name: 'ABC Technologies',
  contact_person: 'Priya Menon',
  contact_email: 'priya@abctech.example',
  discussion_summary: 'Interested in sponsoring Startup Mela 2027.',
  client_interest: 'Title sponsorship with exhibition space.',
  proposal_type: 'Sponsorship',
  expected_deadline: '2026-01-20',
}

/** Every checklist key on the quality check stage. */
function allChecklistKeys(workflow: WorkflowTemplate): string[] {
  const stage = workflow.stages.find((candidate) => candidate.key === 'quality_check')
  assert.ok(stage)
  return stage.checklist.map((item) => item.key)
}

// --- The scenario ---------------------------------------------------------

describe('Proposal Creation, end to end (spec §55)', () => {
  const workflow = template()
  const ids = new MemoryIds()
  let state: WorkflowState

  it('1-4. Harnoor raises a proposal request and an instance is created', () => {
    tick()
    const start = expectOk(
      startInstance(
        {
          template: workflow,
          initiatedBy: HARNOOR,
          title: 'Proposal — ABC Technologies',
          fieldValues: REQUEST_FIELDS,
        },
        context(),
      ),
    )
    state = applyStart(start, ids, clock)

    assert.equal(state.instance.status, 'active')
    assert.equal(state.instance.templateVersion, 1)
    assert.deepEqual(state.instance.currentStageKeys, ['proposal_request'])
    assert.equal(state.instance.initiatedBy, HARNOOR)
    assert.equal(state.tasks.length, 1)
    assert.deepEqual(state.tasks[0].assignees, [HARNOOR])
  })

  it('5. submitting the request opens Deliverables Discussion for Harnoor and Tanu', () => {
    const task = openTaskAt(state, 'proposal_request')
    assert.ok(task)

    tick()
    state = applyResult(
      state,
      expectOk(
        completeStage({
          template: workflow,
          instance: state.instance,
          tasks: state.tasks,
          taskId: task.taskId,
          actor: HARNOOR,
          context: context(),
        }),
      ),
      ids,
      clock,
    )

    const discussion = openTaskAt(state, 'deliverables_discussion')
    assert.ok(discussion, 'deliverables discussion should be open')
    // Two owners resolved from two different sources: the initiator and a role.
    assert.deepEqual([...discussion.assignees].sort(), [HARNOOR, TANU].sort())
    assert.equal(discussion.completionRule, 'any')
  })

  it('6. either owner can finalise the deliverables', () => {
    const discussion = openTaskAt(state, 'deliverables_discussion')
    assert.ok(discussion)

    tick()
    state = applyResult(
      state,
      expectOk(
        completeStage({
          template: workflow,
          instance: state.instance,
          tasks: state.tasks,
          taskId: discussion.taskId,
          actor: TANU,
          submission: {
            fieldValues: {
              final_deliverables: 'Title sponsorship, 6x6 stall, keynote slot.',
            },
          },
          context: context(),
        }),
      ),
      ids,
      clock,
    )

    assert.ok(openTaskAt(state, 'proposal_content'), 'content stage should open')
    assert.equal(
      state.instance.fieldValues.final_deliverables,
      'Title sponsorship, 6x6 stall, keynote slot.',
      'stage values should accumulate on the instance',
    )
  })

  it('7-9. Tanu completes content and Ananya is assigned design automatically', () => {
    const content = openTaskAt(state, 'proposal_content')
    assert.ok(content)
    assert.deepEqual(content.assignees, [TANU])

    tick()
    state = applyResult(
      state,
      expectOk(
        completeStage({
          template: workflow,
          instance: state.instance,
          tasks: state.tasks,
          taskId: content.taskId,
          actor: TANU,
          submission: {
            fieldValues: { proposal_content: 'Full proposal copy for ABC Technologies.' },
          },
          context: context(),
        }),
      ),
      ids,
      clock,
    )

    const design = openTaskAt(state, 'design_formatting')
    assert.ok(design, 'design should be assigned without anyone messaging anyone')
    assert.deepEqual(design.assignees, [ANANYA])
    assert.equal(design.revisionRound, 1)
    // The work reached Ananya's dashboard by itself (spec §24).
    assert.equal(openTasksFor(state, ANANYA).length, 1)
  })

  it('10. design cannot be completed until the required file is uploaded', () => {
    const design = openTaskAt(state, 'design_formatting')
    assert.ok(design)

    const premature = completeStage({
      template: workflow,
      instance: state.instance,
      tasks: state.tasks,
      taskId: design.taskId,
      actor: ANANYA,
      context: context(),
    })
    assert.equal(premature.ok, false)
    assert.deepEqual(
      premature.ok ? [] : premature.errors.map((error) => error.code),
      ['missing_required_file'],
    )

    tick()
    state = applyResult(
      state,
      expectOk(
        recordFileUpload({
          template: workflow,
          instance: state.instance,
          tasks: state.tasks,
          taskId: design.taskId,
          actor: ANANYA,
          file: { fileId: nextFileId(ids), slotKey: 'designed_proposal', version: 1 },
          context: context(),
        }),
      ),
      ids,
      clock,
    )

    tick()
    state = applyResult(
      state,
      expectOk(
        completeStage({
          template: workflow,
          instance: state.instance,
          tasks: state.tasks,
          taskId: openTaskAt(state, 'design_formatting')!.taskId,
          actor: ANANYA,
          context: context(),
        }),
      ),
      ids,
      clock,
    )
  })

  it('11-12. quality check opens and refuses submission until every item is ticked', () => {
    const qc = openTaskAt(state, 'quality_check')
    assert.ok(qc, 'quality check is its own stage even with the same owner')
    assert.deepEqual(qc.assignees, [ANANYA])

    const keys = allChecklistKeys(workflow)
    const partial = completeStage({
      template: workflow,
      instance: state.instance,
      tasks: state.tasks,
      taskId: qc.taskId,
      actor: ANANYA,
      submission: { checkedItemKeys: keys.slice(0, -1) },
      context: context(),
    })

    assert.equal(partial.ok, false, 'an incomplete checklist must block submission')
    assert.deepEqual(
      partial.ok ? [] : [...new Set(partial.errors.map((error) => error.code))],
      ['incomplete_checklist'],
    )
  })

  it('13-14. a complete checklist sends the proposal to Tanu for approval', () => {
    const qc = openTaskAt(state, 'quality_check')
    assert.ok(qc)

    tick()
    state = applyResult(
      state,
      expectOk(
        completeStage({
          template: workflow,
          instance: state.instance,
          tasks: state.tasks,
          taskId: qc.taskId,
          actor: ANANYA,
          submission: { checkedItemKeys: allChecklistKeys(workflow) },
          context: context(),
        }),
      ),
      ids,
      clock,
    )

    const approval = openTaskAt(state, 'final_approval')
    assert.ok(approval)
    assert.deepEqual(approval.assignees, [TANU])
    assert.equal(approval.status, 'pending_approval')
    assert.equal(state.instance.status, 'pending_approval')
  })

  it('15-16. requesting changes needs a comment and routes back to design', () => {
    const approval = openTaskAt(state, 'final_approval')
    assert.ok(approval)

    const silent = requestChanges({
      template: workflow,
      instance: state.instance,
      tasks: state.tasks,
      taskId: approval.taskId,
      actor: TANU,
      context: context(),
    })
    assert.equal(silent.ok, false)
    assert.deepEqual(
      silent.ok ? [] : silent.errors.map((error) => error.code),
      ['comment_required'],
    )

    tick()
    state = applyResult(
      state,
      expectOk(
        requestChanges({
          template: workflow,
          instance: state.instance,
          tasks: state.tasks,
          taskId: approval.taskId,
          actor: TANU,
          submission: {
            comment:
              'Please correct the pricing table on page 4 and update the sponsorship benefit on page 6.',
          },
          context: context(),
        }),
      ),
      ids,
      clock,
    )

    const redesign = openTaskAt(state, 'design_formatting')
    assert.ok(redesign, 'rejection goes to the configured stage, not the previous one')
    assert.deepEqual(redesign.assignees, [ANANYA])
    assert.equal(redesign.revisionRound, 2, 'a revision is a new pass')
    assert.deepEqual(state.instance.currentStageKeys, ['design_formatting'])
  })

  it('17-19. Ananya revises, QC runs again, and Tanu approves', () => {
    const redesign = openTaskAt(state, 'design_formatting')
    assert.ok(redesign)

    tick()
    state = applyResult(
      state,
      expectOk(
        recordFileUpload({
          template: workflow,
          instance: state.instance,
          tasks: state.tasks,
          taskId: redesign.taskId,
          actor: ANANYA,
          file: { fileId: nextFileId(ids), slotKey: 'designed_proposal', version: 2 },
          context: context(),
        }),
      ),
      ids,
      clock,
    )

    tick()
    state = applyResult(
      state,
      expectOk(
        completeStage({
          template: workflow,
          instance: state.instance,
          tasks: state.tasks,
          taskId: openTaskAt(state, 'design_formatting')!.taskId,
          actor: ANANYA,
          context: context(),
        }),
      ),
      ids,
      clock,
    )

    const qc = openTaskAt(state, 'quality_check')
    assert.ok(qc)
    assert.equal(qc.revisionRound, 2)

    tick()
    state = applyResult(
      state,
      expectOk(
        completeStage({
          template: workflow,
          instance: state.instance,
          tasks: state.tasks,
          taskId: qc.taskId,
          actor: ANANYA,
          submission: { checkedItemKeys: allChecklistKeys(workflow) },
          context: context(),
        }),
      ),
      ids,
      clock,
    )

    const approval = openTaskAt(state, 'final_approval')
    assert.ok(approval)
    assert.equal(approval.revisionRound, 2)

    tick()
    state = applyResult(
      state,
      expectOk(
        approve({
          template: workflow,
          instance: state.instance,
          tasks: state.tasks,
          taskId: approval.taskId,
          actor: TANU,
          context: context(),
        }),
      ),
      ids,
      clock,
    )
  })

  it('20-23. dispatch returns to Harnoor and completes the workflow', () => {
    const dispatch = openTaskAt(state, 'client_dispatch')
    assert.ok(dispatch, 'dispatch should open after approval')
    // Resolved from the initiator, so the sales owner needs no role mapping.
    assert.deepEqual(dispatch.assignees, [HARNOOR])

    tick()
    state = applyResult(
      state,
      expectOk(
        completeStage({
          template: workflow,
          instance: state.instance,
          tasks: state.tasks,
          taskId: dispatch.taskId,
          actor: HARNOOR,
          submission: {
            fieldValues: {
              recipient_email: 'priya@abctech.example',
              sent_at: '2026-01-08',
            },
          },
          context: context(),
        }),
      ),
      ids,
      clock,
    )

    assert.equal(state.instance.status, 'completed')
    assert.deepEqual(state.instance.currentStageKeys, [])
    assert.ok(state.instance.completedAt)
    assert.equal(
      state.tasks.every((task) => Boolean(task.completedAt)),
      true,
      'no task should be left open',
    )
  })

  it('26. the timeline matches the sequence the brief describes (spec §33)', () => {
    const story = state.events
      .filter((event) =>
        [
          'instance_created',
          'stage_completed',
          'changes_requested',
          'approval_granted',
          'instance_completed',
        ].includes(event.action),
      )
      .map((event) => `${event.action}:${event.stageKey}`)

    assert.deepEqual(story, [
      'instance_created:proposal_request',
      'stage_completed:proposal_request',
      'stage_completed:deliverables_discussion',
      'stage_completed:proposal_content',
      'stage_completed:design_formatting',
      'stage_completed:quality_check',
      'changes_requested:final_approval',
      'stage_completed:design_formatting',
      'stage_completed:quality_check',
      'approval_granted:final_approval',
      'stage_completed:client_dispatch',
      'instance_completed:client_dispatch',
    ])
  })

  it('27. every event records an actor and a timestamp', () => {
    for (const event of state.events) {
      assert.ok(event.actorId, `${event.action} has no actor`)
      assert.ok(event.at instanceof Date, `${event.action} has no timestamp`)
      assert.ok(event.eventId.startsWith('BO-EVT-'))
      assert.equal(event.instanceId, state.instance.instanceId)
    }

    const rejection = state.events.find((event) => event.action === 'changes_requested')
    assert.ok(rejection?.comment, 'a rejection must carry its explanation')
    assert.equal(rejection.actorId, TANU)
  })

  it('28. the approved file is recorded and both versions are preserved', () => {
    const approval = state.events.find((event) => event.action === 'approval_granted')
    assert.ok(approval?.fileId, 'approval should name the file it approved')

    const uploads = state.events.filter((event) => event.action === 'file_uploaded')
    assert.equal(uploads.length, 2, 'the superseded version is kept')
    assert.deepEqual(
      uploads.map((event) => event.fileVersion),
      [1, 2],
    )
    // The approval points at the revised file, not the original.
    assert.equal(approval.fileId, uploads[1].fileId)
  })

  it('notifies the right people as work moves', () => {
    const forAnanya = state.notifications.filter(
      (notification) => notification.recipientId === ANANYA,
    )
    assert.ok(
      forAnanya.some((notification) => notification.kind === 'task_assigned'),
      'Ananya is told when design lands on her',
    )
    assert.ok(
      forAnanya.some((notification) => notification.kind === 'changes_requested'),
      'Ananya is told when changes are requested',
    )
    assert.ok(
      state.notifications.some(
        (notification) =>
          notification.recipientId === TANU && notification.kind === 'approval_required',
      ),
      'Tanu is told when an approval is waiting',
    )
  })
})
