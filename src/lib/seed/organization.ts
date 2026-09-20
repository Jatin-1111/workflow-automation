/**
 * Seed definitions for Business Orbit's org chart.
 *
 * Ids are allocated at seed time, so these definitions reference each other by
 * stable machine keys only.
 */

export interface DepartmentSeed {
  key: string
  name: string
  description: string
}

export interface TeamSeed {
  key: string
  name: string
  departmentKey: string
}

export interface RoleSeed {
  key: string
  name: string
  description: string
}

export const DEPARTMENT_SEEDS: DepartmentSeed[] = [
  { key: 'management', name: 'Management', description: 'Leadership and approvals' },
  { key: 'sales', name: 'Sales', description: 'Client acquisition and dispatch' },
  { key: 'content', name: 'Content', description: 'Written content and research' },
  { key: 'design', name: 'Design', description: 'Design, formatting and quality check' },
  { key: 'operations', name: 'Operations', description: 'Event and production operations' },
]

export const TEAM_SEEDS: TeamSeed[] = [
  { key: 'proposal_team', name: 'Proposal Team', departmentKey: 'content' },
  { key: 'events_team', name: 'Events Team', departmentKey: 'operations' },
  { key: 'growth_team', name: 'Growth Team', departmentKey: 'sales' },
]

/**
 * Workflow responsibilities (spec §5). A role is what a stage names; the
 * role-to-person mapping lives on the user, so replacing a person is an admin
 * action rather than a workflow edit (spec §6).
 */
export const ROLE_SEEDS: RoleSeed[] = [
  { key: 'administrator', name: 'Administrator', description: 'Full system administration' },
  { key: 'management', name: 'Management', description: 'Organisation-wide oversight' },
  { key: 'sales', name: 'Sales', description: 'Client relationships and proposal requests' },
  { key: 'proposal_content_owner', name: 'Proposal Content Owner', description: 'Writes proposal content' },
  { key: 'proposal_designer', name: 'Proposal Designer', description: 'Designs and formats proposals' },
  { key: 'proposal_qc_owner', name: 'Proposal QC Owner', description: 'Runs the proposal quality check' },
  { key: 'final_proposal_approver', name: 'Final Proposal Approver', description: 'Grants final proposal approval' },
  { key: 'project_manager', name: 'Project Manager', description: 'Runs a major project' },
  { key: 'content_writer', name: 'Content Writer', description: 'General content production' },
  { key: 'video_editor', name: 'Video Editor', description: 'Video and podcast editing' },
]
