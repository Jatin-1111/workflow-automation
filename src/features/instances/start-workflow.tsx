'use client'

/**
 * Raising a piece of work (spec §21).
 *
 * Deliberately short: a workflow, a name for this particular run, and the
 * project it belongs to. Everything the process needs to know is asked for by
 * its first stage, which opens as an ordinary task the moment this is
 * submitted — so this form does not try to be that stage.
 */

import { useActionState, useState } from 'react'
import { Button, Panel, controlClass, fieldClass } from '@/features/ui/primitives'
import { startWorkflowAction, type StartActionState } from './actions'

const IDLE: StartActionState = { ok: null }

export interface WorkflowChoice {
  workflowId: string
  name: string
  projectId?: string
  stageCount: number
}

export interface ProjectChoice {
  projectId: string
  name: string
}

export function StartWorkflow({
  workflows,
  projects,
}: {
  workflows: WorkflowChoice[]
  projects: ProjectChoice[]
}) {
  const [state, start, starting] = useActionState(startWorkflowAction, IDLE)
  const [open, setOpen] = useState(false)
  const [workflowId, setWorkflowId] = useState(workflows[0]?.workflowId ?? '')

  const chosen = workflows.find((w) => w.workflowId === workflowId)

  if (workflows.length === 0) {
    return (
      <Panel title="Start a workflow">
        <p className="px-5 py-4 text-sm text-muted">
          No workflow has been published yet. Build one under Workflows, then
          publish it — a draft cannot carry work.
        </p>
      </Panel>
    )
  }

  if (!open) {
    return (
      <Button type="button" tone="primary" onClick={() => setOpen(true)}>
        Start a workflow
      </Button>
    )
  }

  return (
    <Panel
      title="Start a workflow"
      description="This opens the first stage straight away and tells whoever it belongs to."
    >
      <form action={start} className="space-y-3 px-5 py-4">
        <label className="block space-y-1">
          <span className="text-xs font-medium text-muted">Process</span>
          <select
            name="workflowId"
            value={workflowId}
            onChange={(event) => setWorkflowId(event.target.value)}
            className={`${controlClass} block w-full`}
          >
            {workflows.map((workflow) => (
              <option key={workflow.workflowId} value={workflow.workflowId}>
                {workflow.name} — {workflow.stageCount} stages
              </option>
            ))}
          </select>
        </label>

        <label className="block space-y-1">
          <span className="text-xs font-medium text-muted">
            What is this one for?
          </span>
          <input
            name="title"
            required
            maxLength={120}
            placeholder="ABC Technologies"
            className={fieldClass}
          />
          <span className="block text-xs text-subtle">
            How it will appear on everyone&rsquo;s dashboard — the client, the
            episode, the vendor.
          </span>
        </label>

        <label className="block space-y-1">
          <span className="text-xs font-medium text-muted">Major Project</span>
          <select
            name="projectId"
            // Remount when the process changes: a defaultValue is read once, so
            // without this the field keeps the previous workflow's project and
            // quietly files the work under the wrong one.
            key={workflowId}
            defaultValue={chosen?.projectId ?? ''}
            className={`${controlClass} block w-full`}
          >
            <option value="">Not tied to a project</option>
            {projects.map((project) => (
              <option key={project.projectId} value={project.projectId}>
                {project.name}
              </option>
            ))}
          </select>
        </label>

        <div className="flex flex-wrap items-center gap-2">
          <Button type="submit" tone="primary" size="sm" disabled={starting}>
            {starting ? 'Starting…' : 'Start it'}
          </Button>
          <Button type="button" tone="quiet" size="sm" onClick={() => setOpen(false)}>
            Cancel
          </Button>
        </div>

        {state.ok === false ? (
          <p role="status" className="text-xs text-status-overdue">
            {state.message}
          </p>
        ) : null}
      </form>
    </Panel>
  )
}
