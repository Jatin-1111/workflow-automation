'use client'

/** Start a new workflow as a draft (spec §35). */

import { useActionState } from 'react'
import { createWorkflowAction, type BuilderState } from './actions'
import type { ProjectOption } from './workflow-editor'

const IDLE: BuilderState = { ok: null }

export function CreateWorkflowForm({ projects }: { projects: ProjectOption[] }) {
  const [state, create, creating] = useActionState(createWorkflowAction, IDLE)

  return (
    <form action={create} className="flex flex-wrap items-end gap-3 px-4 py-3">
      <label className="flex flex-col gap-1">
        <span className="text-[11px] font-medium uppercase tracking-wide text-subtle">
          Name
        </span>
        <input
          name="name"
          required
          placeholder="Speaker Onboarding"
          className="h-9 w-56 rounded-md border border-border bg-surface px-2.5 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft"
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-[11px] font-medium uppercase tracking-wide text-subtle">
          Major Project
        </span>
        <select
          name="projectId"
          className="h-9 rounded-md border border-border bg-surface px-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft"
        >
          <option value="">Not tied to a project</option>
          {projects.map((project) => (
            <option key={project.projectId} value={project.projectId}>
              {project.name}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-1 flex-col gap-1">
        <span className="text-[11px] font-medium uppercase tracking-wide text-subtle">
          Description
        </span>
        <input
          name="description"
          placeholder="What this process is for"
          className="h-9 w-full rounded-md border border-border bg-surface px-2.5 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft"
        />
      </label>

      <button
        type="submit"
        disabled={creating}
        className="h-9 rounded-md bg-accent px-4 text-sm font-medium text-white transition hover:bg-accent-hover disabled:opacity-60"
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
