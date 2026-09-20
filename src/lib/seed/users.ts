/** Seed definitions for the initial Business Orbit users (spec §54). */

import type { AccessLevel } from '@/lib/types/status'

export interface UserSeed {
  key: string
  name: string
  email: string
  phone: string
  departmentKey: string
  teamKey?: string
  /** Workflow roles held at setup. The admin can remap these at any time. */
  roleKeys: string[]
  accessLevel: AccessLevel
  joiningDate: string
}

export const USER_SEEDS: UserSeed[] = [
  {
    key: 'nitin',
    name: 'Nitin',
    email: 'nitin@businessorbit.in',
    phone: '+91 90000 00001',
    departmentKey: 'management',
    roleKeys: ['administrator', 'management'],
    accessLevel: 'admin',
    joiningDate: '2024-01-15',
  },
  {
    key: 'tanu',
    name: 'Tanu',
    email: 'tanu@businessorbit.in',
    phone: '+91 90000 00002',
    departmentKey: 'management',
    teamKey: 'proposal_team',
    roleKeys: ['management', 'proposal_content_owner', 'final_proposal_approver'],
    accessLevel: 'manager',
    joiningDate: '2024-02-01',
  },
  {
    key: 'harnoor',
    name: 'Harnoor',
    email: 'harnoor@businessorbit.in',
    phone: '+91 90000 00003',
    departmentKey: 'sales',
    teamKey: 'growth_team',
    roleKeys: ['sales'],
    accessLevel: 'employee',
    joiningDate: '2024-03-10',
  },
  {
    key: 'ananya',
    name: 'Ananya',
    email: 'ananya@businessorbit.in',
    phone: '+91 90000 00004',
    departmentKey: 'design',
    teamKey: 'proposal_team',
    // Design and QC are separate stages even though one person holds both (spec §26).
    roleKeys: ['proposal_designer', 'proposal_qc_owner', 'video_editor'],
    accessLevel: 'employee',
    joiningDate: '2024-04-05',
  },
]
