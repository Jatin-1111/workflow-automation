'use client'

/** Start a new workflow as a draft (spec §35). */

import { buttonClass, controlClass } from '@/features/ui/primitives'
import { useActionState } from 'react'
import { createWorkflowAction, type BuilderState } from './actions'
import type { ProjectOption } from './workflow-editor'

const IDLE: BuilderState = { ok: null }

export function CreateWorkflowForm({ projects }: { projects: ProjectOption[] }) {
  const [state, create, creating] = useActionState(createWorkflowAction, IDLE)

  return (
    <form action={create} className="flex flex-wrap items-end gap-3 px-5 py-4">
      <label className="flex flex-col gap-1 max-sm:w-full">
        <span className="text-xs font-medium text-muted">
          Name
        </span>
        <input
          name="name"
          required
          placeholder="Speaker Onboarding"
          className={`${controlClass} sm:w-56`}
        />
      </label>

      <label className="flex flex-col gap-1 max-sm:w-full">
        <span className="text-xs font-medium text-muted">
          Major Project
        </span>
        <select
          name="projectId"
          className={controlClass}
        >
          <option value="">Not tied to a project</option>
          {projects.map((project) => (
            <option key={project.projectId} value={project.projectId}>
              {project.name}
            </option>
          ))}
        </select>
      </label>

      <label className="flex min-w-48 flex-1 flex-col gap-1 max-sm:w-full">
        <span className="text-xs font-medium text-muted">
          Description
        </span>
        <input
          name="description"
          placeholder="What this process is for"
          className={`${controlClass} w-full`}
        />
      </label>

      <button
        type="submit"
        disabled={creating}
        className={buttonClass('primary', 'md')}
      >
        {creating ? 'Creating…' : 'Create draft'}
      </button>

      {state.ok === false ? (
        <p role="alert" className="text-sm text-status-overdue">
          {state.message}
        </p>
      ) : null}
    </form>
  )
}
