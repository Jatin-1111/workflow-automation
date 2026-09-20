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
import { listTasksForInstance, findTaskById } from '@/lib/db/repositories/tasks'
import { findInstanceById } from '@/lib/db/repositories/workflow-instances'
import { findTemplateVersion } from '@/lib/db/repositories/workflow-templates'
import {
  approve,
  completeStage,
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
import type { FileId, TaskId, UserId } from '@/lib/types/ids'
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

export function approveTask(
  taskId: TaskId,
  actor: UserId,
  submission: StageSubmission,
  finalFileId?: FileId,
): Promise<OperationOutcome> {
  return run(taskId, actor, (request) => approve({ ...request, finalFileId }), submission)
}

export function requestTaskChanges(
  taskId: TaskId,
  actor: UserId,
  submission: StageSubmission,
): Promise<OperationOutcome> {
  return run(taskId, actor, requestChanges, submission)
}

export function attachFileToTask(
  taskId: TaskId,
  actor: UserId,
  file: { fileId: FileId; slotKey?: string; version: number },
): Promise<OperationOutcome> {
  return run(taskId, actor, (request) => recordFileUpload({ ...request, file }))
}
