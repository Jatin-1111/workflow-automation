/**
 * Drives the Proposal Creation workflow end to end against the seeded
 * template and the real role-to-person mapping, printing the timeline the
 * brief describes (spec §33, §55).
 *
 * Run with `npm run walkthrough`. Nothing is written: the run happens in
 * memory, which is what makes it safe against a live database and proves the
 * engine needs no storage of its own.
 */

import { closeMongoClient } from '@/lib/db/client'
import { listActiveTemplates } from '@/lib/db/repositories/workflow-templates'
import { findUserByEmail, listUsers } from '@/lib/db/repositories/users'
import {
  approve,
  completeStage,
  recordFileUpload,
  requestChanges,
  startInstance,
  type EngineOutcome,
} from '@/lib/engine'
import {
  applyResult,
  applyStart,
  MemoryIds,
  nextFileId,
  openTaskAt,
  type WorkflowState,
} from '@/lib/engine/memory-runtime'
import { buildEngineContext } from '@/lib/workflow/engine-context'
import type { UserId } from '@/lib/types/ids'

const ids = new MemoryIds()
let clock = new Date('2026-01-05T09:00:00Z')

function tick(minutes: number): Date {
  clock = new Date(clock.getTime() + minutes * 60_000)
  return clock
}

function unwrap<T>(label: string, outcome: EngineOutcome<T>): T {
  if (!outcome.ok) {
    const detail = outcome.errors.map((error) => `${error.code}: ${error.message}`)
    throw new Error(`${label} was refused\n  - ${detail.join('\n  - ')}`)
  }
  return outcome.result
}

async function main() {
  const [template] = await listActiveTemplates()
  if (!template) throw new Error('No workflow template seeded. Run `npm run seed` first.')

  const users = await listUsers()
  const nameOf = new Map(users.map((user) => [user.userId, user.name]))
  const idOf = async (email: string): Promise<UserId> => {
    const user = await findUserByEmail(email)
    if (!user) throw new Error(`Seeded user ${email} is missing`)
    return user.userId
  }

  const harnoor = await idOf('harnoor@businessorbit.in')
  const tanu = await idOf('tanu@businessorbit.in')
  const ananya = await idOf('ananya@businessorbit.in')

  const context = async () => buildEngineContext(template, clock)

  console.log(`Workflow: ${template.name} (${template.workflowId} v${template.version})`)
  console.log(`Stages:   ${template.stages.map((stage) => stage.name).join(' -> ')}\n`)

  // 1. Harnoor raises the request.
  tick(30)
  let state: WorkflowState = applyStart(
    unwrap(
      'Create proposal request',
      startInstance(
        {
          template,
          initiatedBy: harnoor,
          title: 'Proposal — ABC Technologies',
          fieldValues: {
            client_name: 'ABC Technologies',
            contact_person: 'Priya Menon',
            contact_email: 'priya@abctech.example',
            discussion_summary: 'Interested in sponsoring Startup Mela 2027.',
            client_interest: 'Title sponsorship with exhibition space.',
            proposal_type: 'Sponsorship',
            expected_deadline: '2026-01-20',
          },
        },
        await context(),
      ),
    ),
    ids,
    clock,
  )

  const complete = async (
    label: string,
    stageKey: string,
    actor: UserId,
    submission?: Parameters<typeof completeStage>[0]['submission'],
  ) => {
    const task = openTaskAt(state, stageKey)
    if (!task) throw new Error(`No open task at "${stageKey}"`)
    tick(90)
    state = applyResult(
      state,
      unwrap(
        label,
        completeStage({
          template,
          instance: state.instance,
          tasks: state.tasks,
          taskId: task.taskId,
          actor,
          submission,
          context: await context(),
        }),
      ),
      ids,
      clock,
    )
  }

  const upload = async (stageKey: string, actor: UserId, slotKey: string, version: number) => {
    const task = openTaskAt(state, stageKey)
    if (!task) throw new Error(`No open task at "${stageKey}"`)
    tick(20)
    state = applyResult(
      state,
      unwrap(
        `Upload ${slotKey} v${version}`,
        recordFileUpload({
          template,
          instance: state.instance,
          tasks: state.tasks,
          taskId: task.taskId,
          actor,
          file: { fileId: nextFileId(ids), slotKey, version },
          context: await context(),
        }),
      ),
      ids,
      clock,
    )
  }

  const checklistKeys = (stageKey: string) =>
    template.stages.find((stage) => stage.key === stageKey)?.checklist.map((i) => i.key) ?? []

  await complete('Submit request', 'proposal_request', harnoor)
  await complete('Finalise deliverables', 'deliverables_discussion', tanu, {
    fieldValues: { final_deliverables: 'Title sponsorship, 6x6 stall, keynote slot.' },
  })
  await complete('Complete content', 'proposal_content', tanu, {
    fieldValues: { proposal_content: 'Full proposal copy for ABC Technologies.' },
  })

  await upload('design_formatting', ananya, 'designed_proposal', 1)
  await complete('Complete design', 'design_formatting', ananya)
  await complete('Complete quality check', 'quality_check', ananya, {
    checkedItemKeys: checklistKeys('quality_check'),
  })

  // Tanu sends it back, exactly as spec §29 describes.
  tick(240)
  state = applyResult(
    state,
    unwrap(
      'Request changes',
      requestChanges({
        template,
        instance: state.instance,
        tasks: state.tasks,
        taskId: openTaskAt(state, 'final_approval')!.taskId,
        actor: tanu,
        submission: {
          comment:
            'Please correct the pricing table on page 4 and update the sponsorship benefit on page 6.',
        },
        context: await context(),
      }),
    ),
    ids,
    clock,
  )

  await upload('design_formatting', ananya, 'designed_proposal', 2)
  await complete('Complete revised design', 'design_formatting', ananya)
  await complete('Complete quality check again', 'quality_check', ananya, {
    checkedItemKeys: checklistKeys('quality_check'),
  })

  tick(120)
  state = applyResult(
    state,
    unwrap(
      'Approve final',
      approve({
        template,
        instance: state.instance,
        tasks: state.tasks,
        taskId: openTaskAt(state, 'final_approval')!.taskId,
        actor: tanu,
        context: await context(),
      }),
    ),
    ids,
    clock,
  )

  await complete('Send to client', 'client_dispatch', harnoor, {
    fieldValues: { recipient_email: 'priya@abctech.example', sent_at: '2026-01-08' },
  })

  // --- Report -------------------------------------------------------------

  console.log('TIMELINE')
  for (const event of state.events) {
    const who = nameOf.get(event.actorId) ?? event.actorId
    const stage = event.stageKey ? ` [${event.stageKey}]` : ''
    const extra = event.comment ? `\n            "${event.comment}"` : ''
    const version = event.fileVersion ? ` v${event.fileVersion}` : ''
    const file = event.fileId ? ` (${event.fileId}${version})` : ''
    console.log(
      `  ${event.at.toISOString().slice(0, 16).replace('T', ' ')}  ${who.padEnd(8)} ${event.action}${stage}${file}${extra}`,
    )
  }

  console.log('\nSTAGE RECORD')
  for (const task of state.tasks) {
    const who = task.assignees.map((id) => nameOf.get(id) ?? id).join(', ')
    console.log(
      `  ${task.stageName.padEnd(24)} pass ${task.revisionRound}  ${task.status.padEnd(10)} ${who}`,
    )
  }

  console.log('\nRESULT')
  console.log(`  Instance:  ${state.instance.instanceId} — ${state.instance.title}`)
  console.log(`  Status:    ${state.instance.status}`)
  console.log(`  Started:   ${nameOf.get(state.instance.initiatedBy)}`)
  console.log(`  Events:    ${state.events.length}`)
  console.log(`  Tasks:     ${state.tasks.length}`)
  console.log(`  Notified:  ${state.notifications.length} in-app notifications`)
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error)
    process.exitCode = 1
  })
  .finally(closeMongoClient)
