/**
 * Deciding what is left to set up.
 *
 * Pure, and outside the module that loads the records, because the case that
 * matters most is the one hardest to reach by hand: an organisation of one
 * administrator with nothing in it. Two faults lived here unnoticed because
 * the only organisation anybody ever looked at was the seeded one, which is
 * already finished.
 */

import { can } from '@/lib/auth/permissions'
import type { AccessLevel } from '@/lib/types/status'

export interface SetupStep {
  key: string
  title: string
  detail: string
  done: boolean
  /** Waiting on an earlier step, so it cannot be acted on yet. */
  blocked?: boolean
  href?: string
  /** Shown as the reason this matters, not as an instruction. */
  because?: string
}

/** Only the fields the steps read, so a test need not build whole records. */
export interface SetupInput {
  viewer: { userId: string; accessLevel: AccessLevel }
  users: { userId: string; name: string; status: string; roleIds: string[] }[]
  roles: { roleId: string; name: string }[]
  templates: {
    workflowId: string
    name: string
    status: string
    stages: { assignees: { mode: string; roleId?: string }[] }[]
  }[]
  instances: { workflowId: string; initiatedBy: string; status: string }[]
  /** The practice workflow, when the organisation has one at all. */
  practiceWorkflowName: string
}

export interface SetupState {
  steps: SetupStep[]
  practiceDone: boolean
}

export function buildSetupSteps(input: SetupInput): SetupState {
  const { viewer, users, roles, templates, instances } = input

  const practiceTemplate = templates.find(
    (template) => template.name === input.practiceWorkflowName,
  )
  const myPractice = instances.filter(
    (instance) =>
      practiceTemplate &&
      instance.workflowId === practiceTemplate.workflowId &&
      instance.initiatedBy === viewer.userId,
  )
  const practiceDone = myPractice.some((instance) => instance.status === 'completed')
  const practiceStarted = myPractice.length > 0

  const steps: SetupStep[] = []

  // A fresh organisation created by the bootstrap script has no templates at
  // all, so offering a practice run there is offering something that cannot
  // be done.
  if (practiceTemplate) {
    steps.push({
      key: 'practice',
      title: practiceDone ? 'You have run a workflow end to end' : 'Run a practice workflow',
      detail: practiceStarted && !practiceDone
        ? 'You have one in progress. Finish it to see a workflow complete.'
        : 'Three short stages in the Sandbox project. Nothing real is affected.',
      done: practiceDone,
      because: 'The quickest way to understand the product is to run one.',
    })
  }

  // Only an administrator can act on the rest, so only they are shown it.
  if (can(viewer.accessLevel, 'admin.manage_roles')) {
    const colleagues = users.filter(
      (candidate) => candidate.userId !== viewer.userId && candidate.status === 'active',
    )
    steps.push({
      key: 'people',
      title:
        colleagues.length > 0
          ? `${colleagues.length} colleague${colleagues.length === 1 ? '' : 's'} can sign in`
          : 'Add the people who will do the work',
      detail:
        colleagues.length > 0
          ? colleagues.map((person) => person.name).join(', ')
          : 'A workflow hands work to a person. On your own there is nobody for it to reach.',
      done: colleagues.length > 0,
      href: '/admin',
      because: 'Every later step depends on there being somebody to send work to.',
    })

    const activeHolders = (roleId: string) =>
      users.filter(
        (candidate) => candidate.status === 'active' && candidate.roleIds.includes(roleId as never),
      ).length

    const usedRoleIds = new Set(
      templates
        .filter((template) => template.status === 'active')
        .flatMap((template) =>
          template.stages.flatMap((stage) =>
            stage.assignees.flatMap((source) =>
              source.mode === 'role' ? [source.roleId as string] : [],
            ),
          ),
        ),
    )
    const uncovered = roles.filter(
      (role) => usedRoleIds.has(role.roleId) && activeHolders(role.roleId) === 0,
    )

    // `uncovered` only counts roles a published workflow already uses, so on
    // an organisation with no roles at all it is empty — which used to read
    // as "every role has somebody", the most misleading thing to say to
    // somebody setting up from nothing. Requiring a held role instead states
    // the real condition, and covers the empty case on the way.
    const held = roles.filter((role) => activeHolders(role.roleId) > 0)
    const rolesReady = held.length > 0 && uncovered.length === 0

    steps.push({
      key: 'roles',
      title:
        roles.length === 0
          ? 'Create the roles your processes assign work to'
          : rolesReady
            ? 'Every role a workflow uses has somebody in it'
            : `${uncovered.length || roles.length - held.length} role${
                (uncovered.length || roles.length - held.length) === 1 ? '' : 's'
              } has nobody in it`,
      detail:
        roles.length === 0
          ? 'A stage is assigned to a role — Proposal Designer, QC Owner — not to a person.'
          : rolesReady
            ? 'Work can reach a person at every stage.'
            : `${(uncovered.length > 0 ? uncovered : roles.filter((role) => activeHolders(role.roleId) === 0)).map((role) => role.name).join(', ')} — a workflow routing here will refuse to move.`,
      done: rolesReady,
      blocked: colleagues.length === 0,
      href: '/admin',
      because: 'Workflows send work to roles, and a role with nobody in it stops the work.',
    })

    const published = templates.filter(
      (template) => template.status === 'active' && template.name !== input.practiceWorkflowName,
    )
    steps.push({
      key: 'workflow',
      title:
        published.length > 0
          ? `${published.length} workflow${published.length === 1 ? '' : 's'} published`
          : 'Publish your first workflow',
      detail:
        published.length > 0
          ? published.map((template) => template.name).join(', ')
          : 'Build a process in the Workflow Builder, then publish it so work can start.',
      done: published.length > 0,
      blocked: !rolesReady,
      href: '/workflows',
      because: 'Nothing can run until a workflow is published.',
    })

    const real = instances.filter(
      (instance) =>
        !practiceTemplate || instance.workflowId !== practiceTemplate.workflowId,
    )
    steps.push({
      key: 'first-run',
      title: real.length > 0 ? 'Real work is running' : 'Start your first real piece of work',
      detail:
        real.length > 0
          ? `${real.length} started so far.`
          : 'Once a workflow is published, starting one puts it on somebody’s My Work.',
      done: real.length > 0,
      blocked: published.length === 0,
      because: 'This is the point at which the platform starts replacing the chasing.',
    })
  }

  return { steps, practiceDone }
}
