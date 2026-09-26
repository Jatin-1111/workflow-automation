'use client'

/**
 * Major Projects (spec §2, §18, §45).
 *
 * Their own component rather than the shared one, because a project carries
 * people: an owner and a team, which the project dashboard shows. Bending the
 * generic editor to hold a checkbox list would make it worse at the three
 * things it already does well.
 */

import { useActionState, useState } from 'react'
import { Button, Pill, buttonClass, controlClass, fieldClass } from '@/features/ui/primitives'
import {
  createProjectAction,
  deleteProjectAction,
  updateProjectAction,
} from './org-actions'
import type { AdminActionState } from './actions'

const IDLE: AdminActionState = { ok: null }

export interface PersonOption {
  value: string
  label: string
}

export interface ProjectRow {
  projectId: string
  name: string
  description?: string
  status: 'active' | 'inactive'
  ownerId?: string
  memberIds: string[]
}

function PeoplePicker({
  people,
  owner,
  members,
}: {
  people: PersonOption[]
  owner?: string
  members: string[]
}) {
  const chosen = new Set(members)

  return (
    <>
      <label className="block space-y-1">
        <span className="text-xs font-medium text-muted">Owner</span>
        <select
          name="ownerId"
          defaultValue={owner ?? ''}
          className={`${controlClass} block w-full`}
        >
          <option value="">Not set</option>
          {people.map((person) => (
            <option key={person.value} value={person.value}>
              {person.label}
            </option>
          ))}
        </select>
      </label>

      <fieldset className="space-y-1.5">
        <legend className="text-xs font-medium text-muted">Team members</legend>
        <div className="grid gap-x-6 gap-y-1.5 sm:grid-cols-3">
          {people.map((person) => (
            <label key={person.value} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="memberIds"
                value={person.value}
                defaultChecked={chosen.has(person.value)}
                className="size-3.5 accent-[var(--accent)]"
              />
              <span>{person.label}</span>
            </label>
          ))}
        </div>
      </fieldset>
    </>
  )
}

function ProjectRowItem({
  project,
  people,
}: {
  project: ProjectRow
  people: PersonOption[]
}) {
  const [editing, setEditing] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [removeState, remove, removing] = useActionState(deleteProjectAction, IDLE)
  const ownerName = people.find((person) => person.value === project.ownerId)?.label

  if (editing) {
    return (
      <li className="bg-surface-sunken px-5 py-4">
        <form action={updateProjectAction} className="space-y-3">
          <input type="hidden" name="projectId" value={project.projectId} />

          <label className="block space-y-1">
            <span className="text-xs font-medium text-muted">Name</span>
            <input
              name="name"
              defaultValue={project.name}
              required
              maxLength={80}
              className={fieldClass}
            />
          </label>

          <label className="block space-y-1">
            <span className="text-xs font-medium text-muted">What it is for</span>
            <input
              name="description"
              defaultValue={project.description ?? ''}
              maxLength={200}
              className={fieldClass}
            />
          </label>

          <label className="block space-y-1">
            <span className="text-xs font-medium text-muted">Status</span>
            <select
              name="status"
              defaultValue={project.status}
              className={`${controlClass} block w-full max-w-xs`}
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive — kept, but not offered</option>
            </select>
          </label>

          <PeoplePicker
            people={people}
            owner={project.ownerId}
            members={project.memberIds}
          />

          <div className="flex flex-wrap items-center gap-2">
            <Button type="submit" tone="primary" size="sm">
              Save project
            </Button>
            <Button type="button" tone="quiet" size="sm" onClick={() => setEditing(false)}>
              Cancel
            </Button>
          </div>
        </form>
      </li>
    )
  }

  return (
    <li className="flex flex-wrap items-center gap-3 px-5 py-3">
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium">{project.name}</span>
        <span className="font-mono text-xs text-subtle">{project.projectId}</span>
        <span className="mt-0.5 block text-xs text-muted">
          {ownerName ? `Owner: ${ownerName}` : 'No owner'}
          {` · ${project.memberIds.length} member${project.memberIds.length === 1 ? '' : 's'}`}
          {project.description ? ` · ${project.description}` : ''}
        </span>
        {removeState.ok === false ? (
          <span role="status" className="mt-1 block text-xs text-status-overdue">
            {removeState.message}
          </span>
        ) : null}
      </span>

      {project.status === 'inactive' ? <Pill tone="neutral">Inactive</Pill> : null}

      <button
        type="button"
        onClick={() => setEditing(true)}
        className={buttonClass('quiet', 'sm')}
      >
        Edit
      </button>

      {confirming ? (
        <form action={remove} className="flex shrink-0 items-center gap-2">
          <input type="hidden" name="projectId" value={project.projectId} />
          <span className="text-xs text-muted">Delete {project.name}?</span>
          <button type="submit" disabled={removing} className={buttonClass('danger', 'sm')}>
            {removing ? 'Deleting…' : 'Yes, delete'}
          </button>
          <button
            type="button"
            onClick={() => setConfirming(false)}
            className={buttonClass('quiet', 'sm')}
          >
            Keep
          </button>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className={buttonClass('quiet', 'sm')}
        >
          Delete
        </button>
      )}
    </li>
  )
}

export function ProjectManager({
  projects,
  people,
}: {
  projects: ProjectRow[]
  people: PersonOption[]
}) {
  const [state, create, creating] = useActionState(createProjectAction, IDLE)
  const [adding, setAdding] = useState(false)

  return (
    <div className="divide-y divide-border">
      <ul className="divide-y divide-border">
        {projects.length === 0 ? (
          <li className="px-5 py-6 text-center text-sm text-muted">No projects yet.</li>
        ) : null}
        {projects.map((project) => (
          <ProjectRowItem key={project.projectId} project={project} people={people} />
        ))}
      </ul>

      <div className="bg-surface-sunken px-5 py-4">
        {adding ? (
          <form action={create} className="space-y-3">
            <label className="block space-y-1">
              <span className="text-xs font-medium text-muted">New project</span>
              <input
                name="name"
                required
                maxLength={80}
                placeholder="Project name"
                className={fieldClass}
              />
            </label>

            <input
              name="description"
              maxLength={200}
              placeholder="What it is for (optional)"
              className={fieldClass}
            />

            <PeoplePicker people={people} members={[]} />

            <div className="flex flex-wrap items-center gap-2">
              <Button type="submit" tone="primary" size="sm" disabled={creating}>
                {creating ? 'Adding…' : 'Add project'}
              </Button>
              <Button type="button" tone="quiet" size="sm" onClick={() => setAdding(false)}>
                Cancel
              </Button>

              {state.ok !== null ? (
                <p
                  role="status"
                  className={`text-xs ${
                    state.ok ? 'text-status-complete' : 'text-status-overdue'
                  }`}
                >
                  {state.message}
                </p>
              ) : null}
            </div>
          </form>
        ) : (
          <Button type="button" tone="secondary" size="sm" onClick={() => setAdding(true)}>
            Add a project
          </Button>
        )}
      </div>
    </div>
  )
}
