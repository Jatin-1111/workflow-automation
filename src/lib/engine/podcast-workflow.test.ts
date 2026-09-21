/**
 * The reusability proof (spec §34, §52, §53).
 *
 * The same engine that runs Proposal Creation runs Podcast Production, a
 * different department, a different shape and eleven stages instead of seven.
 * Nothing in `src/lib/engine` knows either process exists: both are template
 * documents, and this test drives the second one using the same operations.
 */

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { approve, completeStage, recordFileUpload, requestChanges } from './operations'
import { startInstance } from './operations'
import {
  applyResult,
  applyStart,
  MemoryIds,
  nextFileId,
  openTaskAt,
  type WorkflowState,
} from './memory-runtime'
import { buildWorkflowTemplate } from '@/lib/seed/workflows/build'
import { PODCAST_PRODUCTION_WORKFLOW } from '@/lib/seed/workflows/podcast-production'
import { PROPOSAL_CREATION_WORKFLOW } from '@/lib/seed/workflows/proposal-creation'
import { ROLE_SEEDS } from '@/lib/seed/organization'
import { formatId } from '@/lib/ids/format'
import type { EngineContext, EngineOutcome } from './index'
import type { RoleId, UserId, WorkflowTemplateId } from '@/lib/types/ids'
import type { WorkflowTemplate } from '@/lib/types/workflow'

const TANU = formatId('user', 2) as UserId
const HARNOOR = formatId('user', 3) as UserId
const ANANYA = formatId('user', 4) as UserId
const NITIN = formatId('user', 1) as UserId

const roleIdByKey = new Map<string, RoleId>(
  ROLE_SEEDS.map((role, index) => [role.key, formatId('role', index + 1) as RoleId]),
)

function roleId(key: string): RoleId {
  const id = roleIdByKey.get(key)
  assert.ok(id, `unknown role ${key}`)
  return id
}

/** The same role-to-person mapping the seed sets up. */
const USERS_BY_ROLE: Record<string, UserId[]> = {
  [roleId('podcast_producer')]: [TANU],
  [roleId('podcast_host')]: [NITIN],
  [roleId('content_writer')]: [HARNOOR],
  [roleId('video_editor')]: [ANANYA],
  [roleId('management')]: [NITIN, TANU],
}

function podcastTemplate(): WorkflowTemplate {
  return buildWorkflowTemplate(PODCAST_PRODUCTION_WORKFLOW, {
    workflowId: formatId('workflowTemplate', 2) as WorkflowTemplateId,
    version: 1,
    now: new Date('2026-01-01T09:00:00Z'),
    roleIdByKey,
  })
}

let clock = new Date('2026-02-01T09:00:00Z')
function tick(minutes = 60): Date {
  clock = new Date(clock.getTime() + minutes * 60_000)
  return clock
}

function context(): EngineContext {
  return { now: clock, usersByRole: USERS_BY_ROLE }
}

function expectOk<T>(outcome: EngineOutcome<T>): T {
  assert.ok(
    outcome.ok,
    `expected success, got ${outcome.ok ? '' : outcome.errors.map((e) => e.code).join(', ')}`,
  )
  return outcome.result
}

describe('Podcast Production runs on the same engine (spec §53)', () => {
  const workflow = podcastTemplate()
  const ids = new MemoryIds()
  let state: WorkflowState

  const complete = (
    stageKey: string,
    actor: UserId,
    submission?: Parameters<typeof completeStage>[0]['submission'],
  ) => {
    const task = openTaskAt(state, stageKey)
    assert.ok(task, `expected an open task at "${stageKey}"`)
    tick()
    state = applyResult(
      state,
      expectOk(
        completeStage({
          template: workflow,
          instance: state.instance,
          tasks: state.tasks,
          taskId: task.taskId,
          actor,
          submission,
          context: context(),
        }),
      ),
      ids,
      clock,
    )
  }

  const upload = (stageKey: string, actor: UserId, slotKey: string) => {
    const task = openTaskAt(state, stageKey)
    assert.ok(task)
    tick(10)
    state = applyResult(
      state,
      expectOk(
        recordFileUpload({
          template: workflow,
          instance: state.instance,
          tasks: state.tasks,
          taskId: task.taskId,
          actor,
          file: { fileId: nextFileId(ids), slotKey, version: 1 },
          context: context(),
        }),
      ),
      ids,
      clock,
    )
  }

  it('opens an episode with the producer', () => {
    tick()
    state = applyStart(
      expectOk(
        startInstance(
          {
            template: workflow,
            initiatedBy: TANU,
            title: 'Podcast — Episode 04',
            fieldValues: {
              episode_title: 'Episode 04',
              episode_topic: 'Building in public',
              guest_name: 'Rhea Kapoor',
              guest_email: 'rhea@example.com',
              target_publish_date: '2026-03-01',
            },
          },
          context(),
        ),
      ),
      ids,
      clock,
    )

    assert.deepEqual(openTaskAt(state, 'podcast_request')!.assignees, [TANU])
    assert.equal(workflow.stages.length, 11)
  })

  it('routes through the production chain without anyone being told to', () => {
    complete('podcast_request', TANU)
    assert.deepEqual(openTaskAt(state, 'guest_confirmation')!.assignees, [NITIN])

    complete('guest_confirmation', NITIN, {
      fieldValues: { recording_slot: '2026-02-10', recording_format: 'Remote' },
    })
    assert.deepEqual(openTaskAt(state, 'research')!.assignees, [HARNOOR])

    complete('research', HARNOOR, {
      fieldValues: { research_summary: 'Background on Rhea and building in public.' },
    })
    complete('questions', HARNOOR, {
      fieldValues: { question_list: 'Five questions covering the arc of the story.' },
    })
  })

  it('lets either owner close the shared recording stage', () => {
    const recording = openTaskAt(state, 'recording')
    assert.ok(recording)
    // Host and producer are both in the room; the same shared-stage rule the
    // proposal process uses, reached through two roles rather than a role and
    // the initiator.
    assert.deepEqual([...recording.assignees].sort(), [NITIN, TANU].sort())

    complete('recording', NITIN, {
      fieldValues: { recorded_on: '2026-02-10', duration_minutes: 52 },
    })
    assert.ok(openTaskAt(state, 'raw_footage_upload'))
  })

  it('enforces the required upload before editing can start', () => {
    const task = openTaskAt(state, 'raw_footage_upload')!
    const premature = completeStage({
      template: workflow,
      instance: state.instance,
      tasks: state.tasks,
      taskId: task.taskId,
      actor: TANU,
      context: context(),
    })
    assert.equal(premature.ok, false)
    assert.deepEqual(
      premature.ok ? [] : premature.errors.map((error) => error.code),
      ['missing_required_file'],
    )

    upload('raw_footage_upload', TANU, 'raw_footage')
    complete('raw_footage_upload', TANU)
    assert.deepEqual(openTaskAt(state, 'editing')!.assignees, [ANANYA])
  })

  it('blocks the quality check until every item is ticked', () => {
    upload('editing', ANANYA, 'edited_episode')
    complete('editing', ANANYA)

    const qc = openTaskAt(state, 'quality_check')
    assert.ok(qc)
    assert.deepEqual(qc.assignees, [TANU])

    const keys = workflow.stages.find((stage) => stage.key === 'quality_check')!.checklist.map(
      (item) => item.key,
    )
    const partial = completeStage({
      template: workflow,
      instance: state.instance,
      tasks: state.tasks,
      taskId: qc.taskId,
      actor: TANU,
      submission: { checkedItemKeys: keys.slice(0, 2) },
      context: context(),
    })
    assert.equal(partial.ok, false)

    complete('quality_check', TANU, { checkedItemKeys: keys })
  })

  it('sends a rejected episode back to editing, not to the quality check', () => {
    const approval = openTaskAt(state, 'approval')
    assert.ok(approval)
    assert.equal(approval.status, 'pending_approval')

    tick()
    state = applyResult(
      state,
      expectOk(
        requestChanges({
          template: workflow,
          instance: state.instance,
          tasks: state.tasks,
          taskId: approval.taskId,
          actor: NITIN,
          submission: { comment: 'Trim the opening two minutes.' },
          context: context(),
        }),
      ),
      ids,
      clock,
    )

    const redo = openTaskAt(state, 'editing')
    assert.ok(redo, 'rejection goes to the stage the template names')
    assert.deepEqual(redo.assignees, [ANANYA])
    assert.equal(redo.revisionRound, 2)
  })

  it('completes the episode after approval, clips and publishing', () => {
    upload('editing', ANANYA, 'edited_episode')
    complete('editing', ANANYA)

    const keys = workflow.stages.find((stage) => stage.key === 'quality_check')!.checklist.map(
      (item) => item.key,
    )
    complete('quality_check', TANU, { checkedItemKeys: keys })

    tick()
    state = applyResult(
      state,
      expectOk(
        approve({
          template: workflow,
          instance: state.instance,
          tasks: state.tasks,
          taskId: openTaskAt(state, 'approval')!.taskId,
          actor: NITIN,
          context: context(),
        }),
      ),
      ids,
      clock,
    )

    upload('clips', ANANYA, 'social_clips')
    complete('clips', ANANYA, { fieldValues: { clip_count: 4 } })

    complete('publishing', TANU, {
      fieldValues: {
        published_url: 'https://businessorbit.example/podcast/04',
        published_on: '2026-02-20',
      },
    })

    assert.equal(state.instance.status, 'completed')
    assert.deepEqual(state.instance.currentStageKeys, [])
    assert.equal(
      state.tasks.every((task) => Boolean(task.completedAt)),
      true,
    )
  })
})

describe('the two workflows share nothing but the engine', () => {
  it('differ in department, length, roles and routing', () => {
    const proposal = PROPOSAL_CREATION_WORKFLOW
    const podcast = PODCAST_PRODUCTION_WORKFLOW

    assert.notEqual(proposal.stages.length, podcast.stages.length)
    assert.notEqual(proposal.departmentKey, podcast.departmentKey)

    const stageKeys = (seed: typeof proposal) => new Set(seed.stages.map((stage) => stage.key))
    const shared = [...stageKeys(proposal)].filter((key) => stageKeys(podcast).has(key))
    // Only the generic name "quality_check" appears in both.
    assert.deepEqual(shared, ['quality_check'])

    const rolesOf = (seed: typeof proposal) =>
      new Set(
        seed.stages.flatMap((stage) =>
          stage.assignees.flatMap((source) =>
            source.mode === 'role' ? [source.roleKey] : [],
          ),
        ),
      )
    const sharedRoles = [...rolesOf(proposal)].filter((role) => rolesOf(podcast).has(role))
    assert.deepEqual(sharedRoles, [], 'the two processes share no workflow role')
  })

  it('each sends rejected work to its own configured stage', () => {
    const rejectTargets = (seed: typeof PROPOSAL_CREATION_WORKFLOW) =>
      seed.stages
        .filter((stage) => stage.requiresApproval)
        .map((stage) => stage.rejectTargetStageKey)

    assert.deepEqual(rejectTargets(PROPOSAL_CREATION_WORKFLOW), ['design_formatting'])
    assert.deepEqual(rejectTargets(PODCAST_PRODUCTION_WORKFLOW), ['editing'])
  })
})
