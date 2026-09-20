/**
 * Demo workflow instances (spec §54).
 *
 * Every instance is created by running the real engine and persisting the real
 * results, so the seeded state is state the application could actually have
 * reached - no hand-written tasks or timelines.
 */

import { nextId } from '@/lib/ids/generate'
import { insertFile } from '@/lib/db/repositories/files'
import { listTasksForInstance } from '@/lib/db/repositories/tasks'
import { findInstanceById } from '@/lib/db/repositories/workflow-instances'
import {
  approve,
  completeStage,
  recordFileUpload,
  startInstance,
  type EngineContext,
  type EngineOutcome,
} from '@/lib/engine'
import { persistResult, persistStart } from '@/lib/workflow/persist'
import { buildEngineContext } from '@/lib/workflow/engine-context'
import type { FieldValue, WorkflowInstance } from '@/lib/types/instance'
import type { ProjectId, UserId } from '@/lib/types/ids'
import type { WorkflowTemplate } from '@/lib/types/workflow'

const HOUR = 3_600_000

export interface InstanceSeed {
  title: string
  projectKey: string
  initiatorKey: string
  /** Stage to leave the workflow sitting on, or `null` to run to completion. */
  stopAt: string | null
  /** Hours before now that this instance started. */
  startedHoursAgo: number
  fieldValues: Record<string, FieldValue>
}

export const INSTANCE_SEEDS: InstanceSeed[] = [
  {
    title: 'Proposal — ABC Technologies',
    projectKey: 'startup_mela_2027',
    initiatorKey: 'harnoor',
    stopAt: 'design_formatting',
    startedHoursAgo: 20,
    fieldValues: {
      client_name: 'ABC Technologies',
      contact_person: 'Priya Menon',
      contact_email: 'priya@abctech.example',
      discussion_summary: 'Interested in sponsoring Startup Mela 2027.',
      client_interest: 'Title sponsorship with exhibition space.',
      proposal_type: 'Sponsorship',
      expected_deadline: '2026-10-05',
      estimated_value: 750000,
    },
  },
  {
    // Left waiting long enough to breach the 12-hour approval SLA (spec §43).
    title: 'Proposal — XYZ Technologies',
    projectKey: 'startup_mela_2027',
    initiatorKey: 'harnoor',
    stopAt: 'final_approval',
    startedHoursAgo: 40,
    fieldValues: {
      client_name: 'XYZ Technologies',
      contact_person: 'Rahul Sharma',
      contact_email: 'rahul@xyztech.example',
      discussion_summary: 'Wants a startup showcase package.',
      client_interest: 'Exhibition booth and speaking slot.',
      proposal_type: 'Exhibitor',
      expected_deadline: '2026-09-28',
      estimated_value: 450000,
    },
  },
  {
    title: 'Proposal — DEF Media',
    projectKey: 'ai_summit',
    initiatorKey: 'harnoor',
    stopAt: 'proposal_content',
    startedHoursAgo: 6,
    fieldValues: {
      client_name: 'DEF Media',
      contact_person: 'Ishita Rao',
      contact_email: 'ishita@defmedia.example',
      discussion_summary: 'Media partnership for the AI Summit.',
      client_interest: 'Media partner listing and interviews.',
      proposal_type: 'Partnership',
      expected_deadline: '2026-10-12',
    },
  },
  {
    title: 'Proposal — GHI Labs',
    projectKey: 'podcast',
    initiatorKey: 'harnoor',
    stopAt: 'quality_check',
    startedHoursAgo: 14,
    fieldValues: {
      client_name: 'GHI Labs',
      contact_person: 'Arjun Nair',
      contact_email: 'arjun@ghilabs.example',
      discussion_summary: 'Podcast season sponsorship.',
      client_interest: 'Episode branding across the season.',
      proposal_type: 'Sponsorship',
      expected_deadline: '2026-10-20',
      estimated_value: 300000,
    },
  },
  {
    title: 'Proposal — JKL Industries',
    projectKey: 'general_operations',
    initiatorKey: 'harnoor',
    stopAt: 'deliverables_discussion',
    startedHoursAgo: 2,
    fieldValues: {
      client_name: 'JKL Industries',
      contact_person: 'Meera Iyer',
      contact_email: 'meera@jkl.example',
      discussion_summary: 'Retainer for ongoing brand work.',
      client_interest: 'Monthly content and design retainer.',
      proposal_type: 'Services',
      expected_deadline: '2026-11-01',
    },
  },
  {
    // One finished run, so the Completed view and project dashboards have
    // something real to show.
    title: 'Proposal — MNO Ventures',
    projectKey: 'startup_mela_2027',
    initiatorKey: 'harnoor',
    stopAt: null,
    startedHoursAgo: 120,
    fieldValues: {
      client_name: 'MNO Ventures',
      contact_person: 'Sanjay Gupta',
      contact_email: 'sanjay@mno.example',
      discussion_summary: 'Investor lounge sponsorship.',
      client_interest: 'Investor lounge branding.',
      proposal_type: 'Sponsorship',
      expected_deadline: '2026-09-15',
      estimated_value: 1200000,
    },
  },
]

/** Values good enough to satisfy each stage's required fields while seeding. */
function submissionFor(
  template: WorkflowTemplate,
  stageKey: string,
  instance: WorkflowInstance,
) {
  const stage = template.stages.find((candidate) => candidate.key === stageKey)
  if (!stage) throw new Error(`Unknown stage ${stageKey}`)

  const fieldValues: Record<string, FieldValue> = {}
  for (const field of stage.fields) {
    if (!field.required || instance.fieldValues[field.key] !== undefined) continue
    fieldValues[field.key] = defaultValueFor(field.key, field.type, instance)
  }

  return {
    fieldValues,
    checkedItemKeys: stage.checklist.map((item) => item.key),
  }
}

function defaultValueFor(
  key: string,
  type: string,
  instance: WorkflowInstance,
): FieldValue {
  const client = String(instance.fieldValues.client_name ?? 'the client')
  if (type === 'email') return String(instance.fieldValues.contact_email ?? 'contact@example.com')
  if (type === 'date') return new Date().toISOString().slice(0, 10)
  if (type === 'number' || type === 'currency') return 0
  if (key === 'final_deliverables') {
    return `Agreed package for ${client}: branding, stall space and speaking slot.`
  }
  if (key === 'proposal_content') {
    return `Full proposal content prepared for ${client}.`
  }
  return `Recorded for ${client}.`
}

function unwrap<T>(label: string, outcome: EngineOutcome<T>): T {
  if (!outcome.ok) {
    throw new Error(
      `Seeding "${label}" failed: ${outcome.errors.map((e) => e.code).join(', ')}`,
    )
  }
  return outcome.result
}

/**
 * Run an instance forward until it is sitting on `stopAt`.
 *
 * Each step advances the clock, so deadlines and SLA breaches in the seeded
 * data are the ones the engine actually computed.
 */
async function driveTo(
  template: WorkflowTemplate,
  instance: WorkflowInstance,
  stopAt: string | null,
  clock: { at: Date },
): Promise<void> {
  const context = async (): Promise<EngineContext> =>
    buildEngineContext(template, clock.at)

  for (let guard = 0; guard < 50; guard += 1) {
    const current = await findInstanceById(instance.instanceId)
    if (!current || current.status === 'completed') return

    const stageKey = current.currentStageKeys[0]
    if (!stageKey || stageKey === stopAt) return

    const tasks = await listTasksForInstance(current.instanceId)
    const task = tasks.find((candidate) => !candidate.completedAt)
    if (!task) return

    const stage = template.stages.find((candidate) => candidate.key === stageKey)!
    const actor: UserId = task.assignees[0]
    clock.at = new Date(clock.at.getTime() + 2 * HOUR)

    // Satisfy any required uploads before trying to complete the stage.
    for (const slot of stage.files.filter((file) => file.required)) {
      const fileId = await nextId('file')
      await insertFile({
        fileId,
        instanceId: current.instanceId,
        workflowId: current.workflowId,
        taskId: task.taskId,
        stageKey,
        slotKey: slot.key,
        name: `${slot.key}-v1.pdf`,
        mimeType: 'application/pdf',
        sizeBytes: 248_000,
        version: 1,
        storageKey: `seed/${current.instanceId}/${fileId}.pdf`,
        isFinalApproved: false,
        uploadedBy: actor,
        uploadedAt: clock.at,
      })

      await persistResult(
        unwrap(
          `upload ${slot.key}`,
          recordFileUpload({
            template,
            instance: current,
            tasks,
            taskId: task.taskId,
            actor,
            file: { fileId, slotKey: slot.key, version: 1 },
            context: await context(),
          }),
        ),
        clock.at,
      )
    }

    const fresh = await findInstanceById(current.instanceId)
    const freshTasks = await listTasksForInstance(current.instanceId)
    const freshTask = freshTasks.find((candidate) => candidate.taskId === task.taskId)!
    const submission = submissionFor(template, stageKey, fresh!)

    const request = {
      template,
      instance: fresh!,
      tasks: freshTasks,
      taskId: freshTask.taskId,
      actor,
      submission,
      context: await context(),
    }

    await persistResult(
      unwrap(
        stageKey,
        stage.requiresApproval ? approve(request) : completeStage(request),
      ),
      clock.at,
    )
  }
}

export async function seedInstances(params: {
  template: WorkflowTemplate
  projectIdByKey: Map<string, ProjectId>
  userIdByKey: Map<string, UserId>
  now: Date
}): Promise<number> {
  const { template, projectIdByKey, userIdByKey, now } = params

  for (const seed of INSTANCE_SEEDS) {
    const clock = { at: new Date(now.getTime() - seed.startedHoursAgo * HOUR) }
    const initiatedBy = userIdByKey.get(seed.initiatorKey)
    const projectId = projectIdByKey.get(seed.projectKey)
    if (!initiatedBy || !projectId) {
      throw new Error(`Instance seed "${seed.title}" references unknown keys`)
    }

    const instance = await persistStart(
      unwrap(
        seed.title,
        startInstance(
          {
            template,
            initiatedBy,
            title: seed.title,
            projectId,
            fieldValues: seed.fieldValues,
          },
          await buildEngineContext(template, clock.at),
        ),
      ),
      clock.at,
    )

    await driveTo(template, instance, seed.stopAt, clock)
  }

  return INSTANCE_SEEDS.length
}
