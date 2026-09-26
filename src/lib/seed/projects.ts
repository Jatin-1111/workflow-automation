/** Seed definitions for Major Projects (spec §54). */

import type { LabelColor } from '@/lib/types/label'

export interface ProjectSeed {
  key: string
  name: string
  description: string
  ownerKey: string
  memberKeys: string[]
  /** Chosen apart so the demo reads clearly on My Work, which mixes them. */
  color: LabelColor
}

export const PROJECT_SEEDS: ProjectSeed[] = [
  {
    key: 'startup_mela_2027',
    color: 'blue',
    name: 'Startup Mela 2027',
    description: 'Flagship startup event for 2027',
    ownerKey: 'tanu',
    memberKeys: ['tanu', 'harnoor', 'ananya', 'nitin'],
  },
  {
    key: 'ai_summit',
    color: 'purple',
    name: 'AI Summit',
    description: 'AI Summit conference initiative',
    ownerKey: 'nitin',
    memberKeys: ['nitin', 'tanu', 'harnoor'],
  },
  {
    key: 'podcast',
    color: 'amber',
    name: 'Podcast',
    description: 'Business Orbit podcast production',
    ownerKey: 'ananya',
    memberKeys: ['ananya', 'tanu', 'nitin'],
  },
  {
    key: 'sandbox',
    color: 'slate',
    name: 'Sandbox',
    description: 'Somewhere to practise. Nothing here is real work.',
    ownerKey: 'nitin',
    memberKeys: ['nitin', 'tanu', 'harnoor', 'ananya'],
  },
  {
    key: 'general_operations',
    color: 'teal',
    name: 'Business Orbit General Operations',
    description: 'Hiring, onboarding, finance, HR and other standing processes',
    ownerKey: 'nitin',
    memberKeys: ['nitin', 'tanu', 'harnoor', 'ananya'],
  },
]
