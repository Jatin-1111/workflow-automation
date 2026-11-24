'use client'

/**
 * Raising a piece of work (spec §21).
 *
 * Deliberately short: a workflow, a name for this particular run, and the
 * project it belongs to. Everything the process needs to know is asked for by
 * its first stage, which opens as an ordinary task the moment this is
 * submitted — so this form does not try to be that stage.
 */

import { useActionState, useEffect, useRef, useState } from 'react'
import { TEXT_LIMITS } from '@/lib/validation/bounds'
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
  const [titleError, setTitleError] = useState<string | null>(null)
  const wrapper = useRef<HTMLDivElement>(null)
  const opener = useRef<HTMLButtonElement>(null)

  // Escape closes it and puts focus back on the button that opened it, and so
  // does a click anywhere else: a panel that only Cancel could dismiss was a
  // small trap for keyboard users.
  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      setOpen(false)
      opener.current?.focus()
    }
    const onPointer = (event: PointerEvent) => {
      if (wrapper.current && !wrapper.current.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('pointerdown', onPointer)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('pointerdown', onPointer)
    }
  }, [open])

  const chosen = workflows.find((w) => w.workflowId === workflowId)

  if (workflows.length === 0) {
    return (
      <Panel title="Start a workflow">
        <p className="px-5 py-4 text-sm text-muted">
          No workflow has been published yet. Build one under Workflows, then
          publish it. A draft cannot carry work.
        </p>
      </Panel>
    )
  }

  return (
    // The panel hangs below its button instead of replacing it in the page's
    // header, which is what pushed the rest of the header around.
    <div ref={wrapper} className="relative">
      <Button
        ref={opener}
        type="button"
        tone="primary"
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen((current) => !current)}
      >
        Start a workflow
      </Button>

      {open ? (
        <Panel
          title="Start a workflow"
          description="This opens the first stage straight away and tells whoever it belongs to."
          className="absolute right-0 top-full z-20 mt-2 w-[min(26rem,calc(100vw-2rem))] shadow-float"
        >
      <form
        action={start}
        noValidate
        onSubmit={(event) => {
          // The browser's own "Please fill out this field" bubble is not the
          // way the rest of the product says things. Said here, beside the
          // field, and the field is focused so it can be fixed straight away.
          const title = new FormData(event.currentTarget).get('title')
          if (typeof title !== 'string' || title.trim() === '') {
            event.preventDefault()
            setTitleError('Give this one a name so people can find it.')
            event.currentTarget.querySelector<HTMLInputElement>('input[name="title"]')?.focus()
            return
          }
          setTitleError(null)
        }}
        className="space-y-3 px-5 py-4"
      >
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
                {workflow.name}, {workflow.stageCount} {workflow.stageCount === 1 ? 'stage' : 'stages'}
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
            autoFocus
            maxLength={TEXT_LIMITS.title}
            placeholder="ABC Technologies"
            aria-invalid={titleError ? true : undefined}
            aria-describedby="start-title-help"
            onChange={() => setTitleError(null)}
            className={`${fieldClass} ${titleError ? 'border-status-overdue' : ''}`}
          />
          <span
            id="start-title-help"
            role={titleError ? 'alert' : undefined}
            className={`block text-xs ${titleError ? 'font-semibold text-status-overdue' : 'text-subtle'}`}
          >
            {titleError ??
              'How it will appear on everyone’s dashboard: the client, the episode, the vendor.'}
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
          <Button
            type="button"
            tone="quiet"
            size="sm"
            onClick={() => {
              setOpen(false)
              opener.current?.focus()
            }}
          >
            Cancel
          </Button>
        </div>

        {state.ok === false ? (
          <p role="alert" className="text-xs text-status-overdue">
            {state.message}
          </p>
        ) : null}
      </form>
        </Panel>
      ) : null}
    </div>
  )
}
