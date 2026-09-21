/**
 * Demo workflow instances (spec §54).
 *
 * Every instance is created by running the real engine and persisting the real
 * results, so the seeded state is state the application could actually have
 * reached - no hand-written tasks or timelines.
 */

import { nextId } from '@/lib/ids/generate'
import { insertFile, markFileFinalApproved } from '@/lib/db/repositories/files'
import { storeBytes } from '@/lib/files/blob-store'
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
  /** Which workflow template this instance runs on. */
  workflowKey: string
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
    workflowKey: 'proposal_creation',
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
    workflowKey: 'proposal_creation',
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
    workflowKey: 'proposal_creation',
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
    workflowKey: 'proposal_creation',
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
    workflowKey: 'proposal_creation',
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
    workflowKey: 'proposal_creation',
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
  {
    // Podcast episodes run on a completely different template through the same
    // engine, which is the point of seeding them (spec §53).
    title: 'Podcast — Episode 04: Building in Public',
    workflowKey: 'podcast_production',
    projectKey: 'podcast',
    initiatorKey: 'tanu',
    stopAt: 'editing',
    startedHoursAgo: 30,
    fieldValues: {
      episode_title: 'Episode 04: Building in Public',
      episode_topic: 'How founders use transparency to build an audience.',
      guest_name: 'Rhea Kapoor',
      guest_email: 'rhea@buildinpublic.example',
      target_publish_date: '2026-10-08',
    },
  },
  {
    title: 'Podcast — Episode 05: Hiring Your First Ten',
    workflowKey: 'podcast_production',
    projectKey: 'podcast',
    initiatorKey: 'tanu',
    stopAt: 'research',
    startedHoursAgo: 8,
    fieldValues: {
      episode_title: 'Episode 05: Hiring Your First Ten',
      episode_topic: 'Early hiring mistakes and how to avoid them.',
      guest_name: 'Vikram Desai',
      guest_email: 'vikram@tenhires.example',
      target_publish_date: '2026-10-22',
    },
  },
  {
    title: 'Podcast — Episode 03: Sample Guest',
    workflowKey: 'podcast_production',
    projectKey: 'podcast',
    initiatorKey: 'tanu',
    stopAt: null,
    startedHoursAgo: 200,
    fieldValues: {
      episode_title: 'Episode 03: Sample Guest',
      episode_topic: 'A finished episode, for the completed views.',
      guest_name: 'Sample Guest',
      guest_email: 'guest@example.com',
      target_publish_date: '2026-09-10',
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

/**
 * A plausible value for a required field the seed did not supply.
 *
 * Keyed on field type first, so a new workflow needs no change here unless it
 * wants a nicer sentence than the generic one.
 */
function defaultValueFor(
  key: string,
  type: string,
  instance: WorkflowInstance,
): FieldValue {
  const subject = String(
    instance.fieldValues.client_name ?? instance.fieldValues.guest_name ?? 'this work',
  )

  if (type === 'email') {
    return String(
      instance.fieldValues.contact_email ?? instance.fieldValues.guest_email ?? 'contact@example.com',
    )
  }
  if (type === 'date') return new Date().toISOString().slice(0, 10)
  if (type === 'number' || type === 'currency') return key === 'duration_minutes' ? 48 : 3
  if (type === 'select') {
    const stageField = instance.fieldValues[key]
    return typeof stageField === 'string' ? stageField : 'Remote'
  }

  const sentences: Record<string, string> = {
    final_deliverables: `Agreed package for ${subject}: branding, stall space and speaking slot.`,
    proposal_content: `Full proposal content prepared for ${subject}.`,
    research_summary: `Background notes on ${subject} and the episode topic.`,
    question_list: `Opening question, three topic questions and a closing question for ${subject}.`,
    published_url: `https://businessorbit.example/podcast/${subject.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
  }
  return sentences[key] ?? `Recorded for ${subject}.`
}

/** A tiny valid PDF, so seeded attachments open rather than 404. */
function placeholderPdf(caption: string): Buffer {
  const text = caption.replace(/[()\\]/g, '')
  const body = [
    '%PDF-1.4',
    '1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj',
    '2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj',
    '3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 300 120]/Contents 4 0 R' +
      '/Resources<</Font<</F1 5 0 R>>>>>>endobj',
    `4 0 obj<</Length 70>>stream`,
    `BT /F1 10 Tf 20 60 Td (${text}) Tj ET`,
    'endstream endobj',
    '5 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj',
    'trailer<</Root 1 0 R>>',
    '%%EOF',
  ].join('\n')
  return Buffer.from(body, 'utf8')
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
      // Write real bytes: a seeded record pointing at nothing would download
      // as a broken link the moment anyone clicked it.
      const stored = await storeBytes({
        instanceId: current.instanceId,
        extension: 'pdf',
        bytes: placeholderPdf(`${slot.label} — ${current.title}`),
      })

      await insertFile({
        fileId,
        instanceId: current.instanceId,
        workflowId: current.workflowId,
        taskId: task.taskId,
        stageKey,
        slotKey: slot.key,
        name: `${slot.key}-v1.pdf`,
        mimeType: 'application/pdf',
        sizeBytes: stored.sizeBytes,
        version: 1,
        storageKey: stored.storageKey,
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

    const result = unwrap(
      stageKey,
      stage.requiresApproval ? approve(request) : completeStage(request),
    )
    await persistResult(result, clock.at)

    // Mirror what the service does after an approval, so seeded history shows
    // the same final-approved file a real run would (spec §30).
    const approvedFileId = result.events.find(
      (event) => event.action === 'approval_granted',
    )?.fileId
    if (approvedFileId) await markFileFinalApproved(approvedFileId)
  }
}

export async function seedInstances(params: {
  templateByKey: Map<string, WorkflowTemplate>
  projectIdByKey: Map<string, ProjectId>
  userIdByKey: Map<string, UserId>
  now: Date
}): Promise<number> {
  const { templateByKey, projectIdByKey, userIdByKey, now } = params

  for (const seed of INSTANCE_SEEDS) {
    const template = templateByKey.get(seed.workflowKey)
    if (!template) {
      throw new Error(`Instance seed "${seed.title}" names unknown workflow "${seed.workflowKey}"`)
    }

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
