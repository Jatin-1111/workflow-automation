/**
 * The seam between the application and the engine.
 *
 * Loads the state an operation needs, runs the pure engine over it, and
 * persists the result. Every route into the workflow - a form post, a script,
 * a future API - goes through here, so the rules hold in one place.
 *
 * The template is always loaded at the version the instance was started on, so
 * running work keeps following the process it began with (spec §38).
 */

import 'server-only'
import { markFileFinalApproved } from '@/lib/db/repositories/files'
import { listTasksForInstance, findTaskById } from '@/lib/db/repositories/tasks'
import { findInstanceById } from '@/lib/db/repositories/workflow-instances'
import { findTemplateVersion } from '@/lib/db/repositories/workflow-templates'
import {
  approve,
  cancelInstance,
  completeStage,
  holdTask,
  resumeTask,
  reassignTask,
  recordFileUpload,
  requestChanges,
  saveProgress,
  type EngineOutcome,
  type EngineResult,
  type StageSubmission,
  type TaskOperationRequest,
} from '@/lib/engine'
import { buildEngineContext } from './engine-context'
import { persistResult } from './persist'
import type { FileId, TaskId, UserId, WorkflowInstanceId } from '@/lib/types/ids'
import type { WorkflowInstance } from '@/lib/types/instance'
import type { Task } from '@/lib/types/task'
import type { WorkflowTemplate } from '@/lib/types/workflow'

export interface LoadedTask {
  task: Task
  instance: WorkflowInstance
  template: WorkflowTemplate
  tasks: Task[]
}

/** Load everything an operation on this task needs, at the pinned version. */
export async function loadTaskContext(taskId: TaskId): Promise<LoadedTask | null> {
  const task = await findTaskById(taskId)
  if (!task) return null

  const instance = await findInstanceById(task.instanceId)
  if (!instance) return null

  const template = await findTemplateVersion(
    instance.workflowId,
    instance.templateVersion,
  )
  if (!template) return null

  return { task, instance, template, tasks: await listTasksForInstance(instance.instanceId) }
}

/** Refusal shape shared by every action, so forms can render errors uniformly. */
export type OperationOutcome =
  | { ok: true }
  | { ok: false; errors: { code: string; message: string; key?: string }[] }

function failed(code: string, message: string): OperationOutcome {
  return { ok: false, errors: [{ code, message }] }
}

async function run(
  taskId: TaskId,
  actor: UserId,
  operate: (request: TaskOperationRequest) => EngineOutcome<EngineResult>,
  submission?: StageSubmission,
  /** Runs after a successful operation, with the engine's own result. */
  afterPersist?: (result: EngineResult) => Promise<void>,
): Promise<OperationOutcome> {
  const loaded = await loadTaskContext(taskId)
  if (!loaded) return failed('task_not_found', 'That task no longer exists.')

  const now = new Date()
  const outcome = operate({
    template: loaded.template,
    instance: loaded.instance,
    tasks: loaded.tasks,
    taskId,
    actor,
    submission,
    context: await buildEngineContext(loaded.template, now),
  })

  if (!outcome.ok) return { ok: false, errors: outcome.errors }

  await persistResult(outcome.result, now)
  await afterPersist?.(outcome.result)
  return { ok: true }
}

export function saveTaskProgress(
  taskId: TaskId,
  actor: UserId,
  submission: StageSubmission,
): Promise<OperationOutcome> {
  return run(taskId, actor, saveProgress, submission)
}

export function completeTask(
  taskId: TaskId,
  actor: UserId,
  submission: StageSubmission,
): Promise<OperationOutcome> {
  return run(taskId, actor, completeStage, submission)
}

/**
 * Approve a stage, and mark the file that was approved as final (spec §30).
 *
 * Which file that is comes from the engine's own decision, recorded on the
 * approval event, rather than from whatever a form happened to submit.
 */
export function approveTask(
  taskId: TaskId,
  actor: UserId,
  submission: StageSubmission,
  finalFileId?: FileId,
): Promise<OperationOutcome> {
  return run(
    taskId,
    actor,
    (request) => approve({ ...request, finalFileId }),
    submission,
    async (result) => {
      const approved = result.events.find(
        (event) => event.action === 'approval_granted',
      )?.fileId
      if (approved) await markFileFinalApproved(approved)
    },
  )
}

export function requestTaskChanges(
  taskId: TaskId,
  actor: UserId,
  submission: StageSubmission,
): Promise<OperationOutcome> {
  return run(taskId, actor, requestChanges, submission)
}

/**
 * Move an open task to different people (spec §46).
 *
 * Whether the actor may do this is settled by the caller through the
 * `task.reassign` capability; the engine only decides whether the move itself
 * is coherent.
 */
export function reassignTaskTo(
  taskId: TaskId,
  actor: UserId,
  assignees: UserId[],
  reason?: string,
): Promise<OperationOutcome> {
  return run(taskId, actor, (request) =>
    reassignTask({ ...request, assignees, reason }),
  )
}

export function attachFileToTask(
  taskId: TaskId,
  actor: UserId,
  file: { fileId: FileId; slotKey?: string; version: number },
): Promise<OperationOutcome> {
  return run(taskId, actor, (request) => recordFileUpload({ ...request, file }))
}

/**
 * Park a task, or put it back (spec §42).
 *
 * The engine settles whether the transition is coherent and insists on a
 * reason; who may do it is the caller's business, and today that is whoever
 * holds the task.
 */
export function holdTaskFor(
  taskId: TaskId,
  actor: UserId,
  hold: 'waiting' | 'blocked',
  reason: string,
): Promise<OperationOutcome> {
  return run(taskId, actor, (request) => holdTask({ ...request, hold, reason }))
}

export function resumeHeldTask(taskId: TaskId, actor: UserId): Promise<OperationOutcome> {
  return run(taskId, actor, resumeTask)
}

/**
 * Call off a whole run.
 *
 * Instance-level rather than task-level, so it loads from the instance and
 * does not go through `run`, which is built around one person's task.
 * Authorisation belongs to the caller: the engine cannot see who is asking.
 */
export async function cancelWorkflowInstance(
  instanceId: WorkflowInstanceId,
  actor: UserId,
  reason: string,
): Promise<OperationOutcome> {
  const instance = await findInstanceById(instanceId)
  if (!instance) return failed('instance_not_found', 'That workflow no longer exists.')

  const template = await findTemplateVersion(instance.workflowId, instance.templateVersion)
  if (!template) {
    return failed('template_missing', 'The version this workflow started on is missing.')
  }

  const now = new Date()
  const outcome = cancelInstance({
    template,
    instance,
    tasks: await listTasksForInstance(instanceId),
    actor,
    context: await buildEngineContext(template, now),
    reason,
  })

  if (!outcome.ok) return { ok: false, errors: outcome.errors }

  await persistResult(outcome.result, now)
  return { ok: true }
}
