/**
 * The engine, the persistence layer and MongoDB together.
 *
 * The unit tests prove the engine decides correctly. These prove the decision
 * survives being written down and read back, which is the seam where most of
 * this project's defects have lived: an id spread into an insert, a document
 * carrying a field it should not, a flag the engine chose that nothing applied.
 *
 * Runs against its own database so demo data is never touched, and skips
 * cleanly when MongoDB is not up.
 */

// Set before anything opens a connection: `getDb` reads this at call time.
process.env.MONGO_DB = 'business_orbit_integration_test'

import assert from 'node:assert/strict'
import { after, before, describe, it } from 'node:test'
import { closeMongoClient, getDb } from '@/lib/db/client'
import { COLLECTIONS } from '@/lib/db/collections'
import { insertRoles } from '@/lib/db/repositories/roles'
import { insertUsers } from '@/lib/db/repositories/users'
import {
  findTemplateVersion,
  insertTemplate,
} from '@/lib/db/repositories/workflow-templates'
import { findInstanceById } from '@/lib/db/repositories/workflow-instances'
import {
  findTaskById,
  listOpenTasksForUser,
  listTasksForInstance,
} from '@/lib/db/repositories/tasks'
import { listTimelineForInstance } from '@/lib/db/repositories/timeline-events'
import { listNotificationsForUser } from '@/lib/db/repositories/notifications'
import {
  findFileById,
  insertFile,
  markFileFinalApproved,
} from '@/lib/db/repositories/files'
import { nextId } from '@/lib/ids/generate'
import {
  approve,
  completeStage,
  reassignTask,
  recordFileUpload,
  requestChanges,
  startInstance,
  type EngineContext,
  type EngineOutcome,
} from '@/lib/engine'
import { persistResult, persistStart } from './persist'
import { buildEngineContext } from './engine-context'
import { formatId } from '@/lib/ids/format'
import type { RoleId, UserId, WorkflowTemplateId } from '@/lib/types/ids'
import type { WorkflowTemplate } from '@/lib/types/workflow'

const WRITER = formatId('user', 1) as UserId
const REVIEWER = formatId('user', 2) as UserId
const STANDIN = formatId('user', 3) as UserId
const WRITER_ROLE = formatId('role', 1) as RoleId
const REVIEWER_ROLE = formatId('role', 2) as RoleId
const WORKFLOW = formatId('workflowTemplate', 1) as WorkflowTemplateId

let available = true
let clock = new Date('2026-09-01T09:00:00Z')
const tick = (minutes = 60) => (clock = new Date(clock.getTime() + minutes * 60_000))

/** Draft → Review (approval, rejects back to draft) → Publish. */
function template(version = 1): WorkflowTemplate {
  return {
    workflowId: WORKFLOW,
    version,
    name: 'Integration workflow',
    initialStageKey: 'draft',
    status: 'active',
    createdAt: clock,
    updatedAt: clock,
    stages: [
      {
        key: 'draft',
        name: 'Draft',
        assignees: [{ mode: 'role', roleId: WRITER_ROLE }],
        completionRule: 'any',
        fields: [{ key: 'headline', label: 'Headline', type: 'text', required: true }],
        files: [{ key: 'manuscript', label: 'Manuscript', required: true }],
        checklist: [],
        priority: 'high',
        dueInHours: 24,
        slaHours: 24,
        requiresApproval: false,
        nextStageKey: 'review',
      },
      {
        key: 'review',
        name: 'Review',
        assignees: [{ mode: 'role', roleId: REVIEWER_ROLE }],
        completionRule: 'any',
        fields: [],
        files: [],
        checklist: [],
        priority: 'urgent',
        requiresApproval: true,
        rejectTargetStageKey: 'draft',
        nextStageKey: 'publish',
      },
      {
        key: 'publish',
        name: 'Publish',
        assignees: [{ mode: 'initiator' }],
        completionRule: 'any',
        fields: [],
        files: [],
        checklist: [],
        priority: 'medium',
        requiresApproval: false,
        nextStageKey: null,
      },
    ],
  }
}

async function wipe() {
  const db = await getDb()
  await Promise.all(
    Object.values(COLLECTIONS).map((name) => db.collection(name).deleteMany({})),
  )
}

function expectOk<T>(outcome: EngineOutcome<T>): T {
  assert.ok(
    outcome.ok,
    `engine refused: ${outcome.ok ? '' : outcome.errors.map((e) => e.code).join(', ')}`,
  )
  return outcome.result
}

async function context(at = clock): Promise<EngineContext> {
  const stored = await findTemplateVersion(WORKFLOW, 1)
  return buildEngineContext(stored!, at)
}

before(async () => {
  if (!process.env.MONGODB_URI) {
    available = false
    return
  }

  try {
    await wipe()
  } catch {
    // Nothing to test against; the suite reports as skipped rather than failing
    // a build on a machine with no database running.
    available = false
    return
  }

  const now = clock
  await insertRoles([
    { roleId: WRITER_ROLE, key: 'writer', name: 'Writer', status: 'active', createdAt: now, updatedAt: now },
    { roleId: REVIEWER_ROLE, key: 'reviewer', name: 'Reviewer', status: 'active', createdAt: now, updatedAt: now },
  ])
  await insertUsers([
    {
      userId: WRITER, name: 'Writer', email: 'writer@test.local', roleIds: [WRITER_ROLE],
      accessLevel: 'employee', status: 'active', passwordHash: 'x', createdAt: now, updatedAt: now,
    },
    {
      userId: REVIEWER, name: 'Reviewer', email: 'reviewer@test.local', roleIds: [REVIEWER_ROLE],
      accessLevel: 'manager', status: 'active', passwordHash: 'x', createdAt: now, updatedAt: now,
    },
    {
      userId: STANDIN, name: 'Standin', email: 'standin@test.local', roleIds: [],
      accessLevel: 'employee', status: 'active', passwordHash: 'x', createdAt: now, updatedAt: now,
    },
  ])
  await insertTemplate(template())
})

after(async () => {
  if (available) await wipe()
  await closeMongoClient()
})

describe('a workflow written to the database and read back', () => {
  it('runs start to finish, through a rejection, exactly as the engine decided', async (t) => {
    if (!available) return t.skip('MongoDB is not available')

    const stored = (await findTemplateVersion(WORKFLOW, 1))!

    // --- Start -----------------------------------------------------------
    tick()
    const instance = await persistStart(
      expectOk(
        startInstance(
          { template: stored, initiatedBy: WRITER, title: 'Integration run' },
          await context(),
        ),
      ),
      clock,
    )

    assert.ok(instance.instanceId.startsWith('BO-INS-'))
    const afterStart = await listTasksForInstance(instance.instanceId)
    assert.equal(afterStart.length, 1)
    assert.deepEqual(afterStart[0].assignees, [WRITER])
    // The writer's dashboard query must see it, not just the instance query.
    assert.equal(
      (await listOpenTasksForUser(WRITER)).some((task) => task.taskId === afterStart[0].taskId),
      true,
    )

    // --- The required file gate holds against stored state ----------------
    const draftTask = afterStart[0]
    const premature = completeStage({
      template: stored,
      instance,
      tasks: afterStart,
      taskId: draftTask.taskId,
      actor: WRITER,
      submission: { fieldValues: { headline: 'First draft' } },
      context: await context(),
    })
    assert.equal(premature.ok, false)

    // --- Upload, then complete -------------------------------------------
    const fileId = await nextId('file')
    tick(10)
    await insertFile({
      fileId,
      instanceId: instance.instanceId,
      workflowId: WORKFLOW,
      taskId: draftTask.taskId,
      stageKey: 'draft',
      slotKey: 'manuscript',
      name: 'manuscript-v1.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 100,
      version: 1,
      storageKey: 'test/manuscript-v1.pdf',
      isFinalApproved: false,
      uploadedBy: WRITER,
      uploadedAt: clock,
    })

    await persistResult(
      expectOk(
        recordFileUpload({
          template: stored,
          instance,
          tasks: afterStart,
          taskId: draftTask.taskId,
          actor: WRITER,
          file: { fileId, slotKey: 'manuscript', version: 1 },
          context: await context(),
        }),
      ),
      clock,
    )

    tick()
    await persistResult(
      expectOk(
        completeStage({
          template: stored,
          instance: (await findInstanceById(instance.instanceId))!,
          tasks: await listTasksForInstance(instance.instanceId),
          taskId: draftTask.taskId,
          actor: WRITER,
          submission: { fieldValues: { headline: 'First draft' } },
          context: await context(),
        }),
      ),
      clock,
    )

    // --- The review task exists in the database, assigned by role ---------
    let tasks = await listTasksForInstance(instance.instanceId)
    const review = tasks.find((task) => task.stageKey === 'review')
    assert.ok(review, 'review should have been opened and written')
    assert.deepEqual(review.assignees, [REVIEWER])
    assert.equal(review.status, 'pending_approval')
    assert.equal(
      (await findInstanceById(instance.instanceId))!.status,
      'pending_approval',
      'the instance status must be written too, not only the task',
    )

    // --- Reject, and check the revision landed ----------------------------
    tick()
    await persistResult(
      expectOk(
        requestChanges({
          template: stored,
          instance: (await findInstanceById(instance.instanceId))!,
          tasks: await listTasksForInstance(instance.instanceId),
          taskId: review.taskId,
          actor: REVIEWER,
          submission: { comment: 'Needs a stronger opening.' },
          context: await context(),
        }),
      ),
      clock,
    )

    tasks = await listTasksForInstance(instance.instanceId)
    const redraft = tasks.find((task) => task.stageKey === 'draft' && !task.completedAt)
    assert.ok(redraft, 'rejection should have opened the draft stage again')
    assert.equal(redraft.revisionRound, 2)
    assert.deepEqual(redraft.assignees, [WRITER])

    // The rejection and its comment must be in the stored timeline.
    const timeline = await listTimelineForInstance(instance.instanceId)
    const rejection = timeline.find((event) => event.action === 'changes_requested')
    assert.equal(rejection?.comment, 'Needs a stronger opening.')
    assert.equal(rejection?.actorId, REVIEWER)

    // --- Revise, approve, publish ----------------------------------------
    // A revision is a fresh pass with its own record, so its required field
    // and file are asked for again rather than inherited from the pass that
    // was rejected. For a file that is the point (spec §29 expects a revised
    // upload); for a typed field it is friction worth revisiting.
    const bare = completeStage({
      template: stored,
      instance: (await findInstanceById(instance.instanceId))!,
      tasks: await listTasksForInstance(instance.instanceId),
      taskId: redraft.taskId,
      actor: WRITER,
      context: await context(),
    })
    assert.equal(bare.ok, false)
    assert.deepEqual(
      bare.ok ? [] : [...new Set(bare.errors.map((error) => error.code))].sort(),
      ['missing_required_field', 'missing_required_file'],
    )

    const revisedFileId = await nextId('file')
    tick(10)
    await insertFile({
      fileId: revisedFileId,
      instanceId: instance.instanceId,
      workflowId: WORKFLOW,
      taskId: redraft.taskId,
      stageKey: 'draft',
      slotKey: 'manuscript',
      name: 'manuscript-v2.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 120,
      version: 2,
      storageKey: 'test/manuscript-v2.pdf',
      isFinalApproved: false,
      uploadedBy: WRITER,
      uploadedAt: clock,
    })
    await persistResult(
      expectOk(
        recordFileUpload({
          template: stored,
          instance: (await findInstanceById(instance.instanceId))!,
          tasks: await listTasksForInstance(instance.instanceId),
          taskId: redraft.taskId,
          actor: WRITER,
          file: { fileId: revisedFileId, slotKey: 'manuscript', version: 2 },
          context: await context(),
        }),
      ),
      clock,
    )

    tick()
    await persistResult(
      expectOk(
        completeStage({
          template: stored,
          instance: (await findInstanceById(instance.instanceId))!,
          tasks: await listTasksForInstance(instance.instanceId),
          taskId: redraft.taskId,
          actor: WRITER,
          submission: { fieldValues: { headline: 'Stronger opening' } },
          context: await context(),
        }),
      ),
      clock,
    )

    const secondReview = (await listTasksForInstance(instance.instanceId)).find(
      (task) => task.stageKey === 'review' && !task.completedAt,
    )!
    tick()
    const approval = expectOk(
      approve({
        template: stored,
        instance: (await findInstanceById(instance.instanceId))!,
        tasks: await listTasksForInstance(instance.instanceId),
        taskId: secondReview.taskId,
        actor: REVIEWER,
        context: await context(),
      }),
    )
    await persistResult(approval, clock)

    // The engine chose which file was approved; something must have applied it.
    const approvedFileId = approval.events.find(
      (event) => event.action === 'approval_granted',
    )?.fileId
    // The revised upload is what gets approved, not the version it replaced.
    assert.equal(approvedFileId, revisedFileId)
    await markFileFinalApproved(approvedFileId!)
    assert.equal((await findFileById(revisedFileId))!.isFinalApproved, true)
    assert.equal((await findFileById(fileId))!.isFinalApproved, false)

    // Publish returns to whoever started it.
    const publish = (await listTasksForInstance(instance.instanceId)).find(
      (task) => task.stageKey === 'publish' && !task.completedAt,
    )!
    assert.deepEqual(publish.assignees, [WRITER])

    tick()
    await persistResult(
      expectOk(
        completeStage({
          template: stored,
          instance: (await findInstanceById(instance.instanceId))!,
          tasks: await listTasksForInstance(instance.instanceId),
          taskId: publish.taskId,
          actor: WRITER,
          context: await context(),
        }),
      ),
      clock,
    )

    const finished = (await findInstanceById(instance.instanceId))!
    assert.equal(finished.status, 'completed')
    assert.deepEqual(finished.currentStageKeys, [])
    assert.equal(
      (await listTasksForInstance(instance.instanceId)).every((task) => task.completedAt),
      true,
    )
    assert.equal((await listOpenTasksForUser(WRITER)).length, 0)
  })
})

describe('what reaches the application from the database', () => {
  it('never carries Mongo\'s own key', async (t) => {
    if (!available) return t.skip('MongoDB is not available')

    // Three separate defects came from `_id` escaping the database layer: it
    // collided on insert, and React refused it in a client component.
    const instances = await (await getDb()).collection(COLLECTIONS.workflowInstances).find().toArray()
    assert.ok(instances.length > 0, 'expected the earlier run to have written something')

    const instance = await findInstanceById(instances[0].instanceId)
    const [task] = await listTasksForInstance(instance!.instanceId)
    const template = await findTemplateVersion(WORKFLOW, 1)
    const events = await listTimelineForInstance(instance!.instanceId)

    for (const [label, record] of [
      ['instance', instance],
      ['task', task],
      ['template', template],
      ['event', events[0]],
    ] as [string, object][]) {
      assert.equal('_id' in record, false, `${label} still carries _id`)
      assert.doesNotThrow(
        () => structuredClone(record),
        `${label} is not a plain object a client component could receive`,
      )
    }
  })

  it('can be copied into a new version without colliding', async (t) => {
    if (!available) return t.skip('MongoDB is not available')

    // Spreading a stored template into a new version is exactly what broke
    // when documents still carried their key.
    const source = (await findTemplateVersion(WORKFLOW, 1))!
    await assert.doesNotReject(() =>
      insertTemplate({ ...source, version: 2, status: 'draft' }),
    )
    assert.equal((await findTemplateVersion(WORKFLOW, 2))!.version, 2)
  })
})

describe('reassignment against stored state', () => {
  it('moves the work, and the new owner sees it on their dashboard', async (t) => {
    if (!available) return t.skip('MongoDB is not available')

    const stored = (await findTemplateVersion(WORKFLOW, 1))!
    tick()
    const instance = await persistStart(
      expectOk(
        startInstance(
          { template: stored, initiatedBy: WRITER, title: 'Reassignment run' },
          await context(),
        ),
      ),
      clock,
    )

    const task = (await listTasksForInstance(instance.instanceId))[0]
    assert.deepEqual(task.assignees, [WRITER])

    tick()
    await persistResult(
      expectOk(
        reassignTask({
          template: stored,
          instance,
          tasks: [task],
          taskId: task.taskId,
          actor: REVIEWER,
          assignees: [STANDIN],
          reason: 'Writer is away.',
          context: await context(),
        }),
      ),
      clock,
    )

    const moved = await findTaskById(task.taskId)
    assert.deepEqual(moved!.assignees, [STANDIN])
    assert.equal(
      (await listOpenTasksForUser(STANDIN)).some((open) => open.taskId === task.taskId),
      true,
    )
    assert.equal(
      (await listOpenTasksForUser(WRITER)).some((open) => open.taskId === task.taskId),
      false,
    )

    // The person taking it on needs a notification that opens the task.
    const notifications = await listNotificationsForUser(STANDIN)
    const handover = notifications.find(
      (notification) => notification.kind === 'task_reassigned',
    )
    assert.ok(handover, 'the new owner should have been told')
    assert.equal(handover.taskId, task.taskId, 'the notification must link to the task')
  })
})

describe('version pinning', () => {
  it('keeps a running instance on the version it started with', async (t) => {
    if (!available) return t.skip('MongoDB is not available')

    const v1 = (await findTemplateVersion(WORKFLOW, 1))!
    tick()
    const instance = await persistStart(
      expectOk(
        startInstance(
          { template: v1, initiatedBy: WRITER, title: 'Pinned run' },
          await context(),
        ),
      ),
      clock,
    )
    assert.equal(instance.templateVersion, 1)

    // A newer version exists by now; the instance must still read version 1.
    const pinned = await findTemplateVersion(
      instance.workflowId,
      (await findInstanceById(instance.instanceId))!.templateVersion,
    )
    assert.equal(pinned!.version, 1)
    assert.equal(pinned!.stages.length, v1.stages.length)
  })
})

describe('ids allocated while writing', () => {
  it('gives every record its own permanent id', async (t) => {
    if (!available) return t.skip('MongoDB is not available')

    const db = await getDb()
    for (const [collection, field] of [
      [COLLECTIONS.workflowInstances, 'instanceId'],
      [COLLECTIONS.tasks, 'taskId'],
      [COLLECTIONS.timelineEvents, 'eventId'],
    ] as const) {
      const rows = await db.collection(collection).find({}, { projection: { [field]: 1, _id: 0 } }).toArray()
      const ids = rows.map((row) => row[field] as string)
      assert.ok(ids.length > 0, `${collection} should have records`)
      assert.equal(new Set(ids).size, ids.length, `${collection} has a duplicate id`)
      assert.equal(
        ids.every((id) => /^BO-[A-Z]{3}-\d{5,}$/.test(id)),
        true,
        `${collection} has a malformed id`,
      )
    }
  })
})
