/**
 * What each permission means, in words somebody would use.
 *
 * The profile page listed the codes themselves — `instance.view_authorized`,
 * `admin.manage_roles` — which are names for the programmer, not for the
 * person they describe. This is the one place those become sentences.
 *
 * Typed as a record over every capability, so adding a permission does not
 * compile until it has a label here: it cannot reach a screen as a code.
 *
 * Pure.
 */

import { CAPABILITIES, type Capability } from './permissions'

export const CAPABILITY_LABELS: Record<Capability, string> = {
  'work.view_own': 'See the work assigned to you',
  'task.complete_assigned': 'Complete the stages assigned to you',
  'file.upload': 'Upload files to your work',
  'comment.write': 'Comment on work you can see',
  'instance.view_authorized': 'Open work you take part in',

  'management.view_dashboard': 'See the Overview and the Board',
  'team.view_workload': 'See what each person is carrying',
  'project.view_dashboard': 'See how each project is going',
  'task.reassign': 'Move a stage to somebody else',
  'instance.cancel': 'Call off a workflow that is running',
  'instance.view_all': 'Open any workflow, not only your own',

  'admin.manage_users': 'Add, edit and remove people',
  'admin.manage_roles': 'Create and change workflow roles',
  'admin.manage_projects': 'Create and change projects',
  'admin.manage_workflows': 'Build and publish workflows',
}

/** The same three tiers the permission model is written in. */
export const CAPABILITY_GROUPS: { title: string; capabilities: Capability[] }[] = [
  {
    title: 'Everyday work',
    capabilities: [
      'work.view_own',
      'task.complete_assigned',
      'file.upload',
      'comment.write',
      'instance.view_authorized',
    ],
  },
  {
    title: 'Oversight',
    capabilities: [
      'management.view_dashboard',
      'team.view_workload',
      'project.view_dashboard',
      'task.reassign',
      'instance.cancel',
      'instance.view_all',
    ],
  },
  {
    title: 'Administration',
    capabilities: [
      'admin.manage_users',
      'admin.manage_roles',
      'admin.manage_projects',
      'admin.manage_workflows',
    ],
  },
]

/** Groups reduced to what somebody can actually do, dropping empty ones. */
export function groupedCapabilities(
  held: readonly Capability[],
): { title: string; items: { capability: Capability; label: string }[] }[] {
  const has = new Set(held)
  return CAPABILITY_GROUPS.map((group) => ({
    title: group.title,
    items: group.capabilities
      .filter((capability) => has.has(capability))
      .map((capability) => ({ capability, label: CAPABILITY_LABELS[capability] })),
  })).filter((group) => group.items.length > 0)
}

/** Every capability appears in exactly one group, so none can go unlisted. */
export const UNGROUPED: Capability[] = CAPABILITIES.filter(
  (capability) => !CAPABILITY_GROUPS.some((group) => group.capabilities.includes(capability)),
)
