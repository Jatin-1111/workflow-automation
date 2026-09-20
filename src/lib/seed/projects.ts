/** Seed definitions for Major Projects (spec §54). */

export interface ProjectSeed {
  key: string
  name: string
  description: string
  ownerKey: string
  memberKeys: string[]
}

export const PROJECT_SEEDS: ProjectSeed[] = [
  {
    key: 'startup_mela_2027',
    name: 'Startup Mela 2027',
    description: 'Flagship startup event for 2027',
    ownerKey: 'tanu',
    memberKeys: ['tanu', 'harnoor', 'ananya', 'nitin'],
  },
  {
    key: 'ai_summit',
    name: 'AI Summit',
    description: 'AI Summit conference initiative',
    ownerKey: 'nitin',
    memberKeys: ['nitin', 'tanu', 'harnoor'],
  },
  {
    key: 'podcast',
    name: 'Podcast',
    description: 'Business Orbit podcast production',
    ownerKey: 'ananya',
    memberKeys: ['ananya', 'tanu', 'nitin'],
  },
  {
    key: 'general_operations',
    name: 'Business Orbit General Operations',
    description: 'Hiring, onboarding, finance, HR and other standing processes',
    ownerKey: 'nitin',
    memberKeys: ['nitin', 'tanu', 'harnoor', 'ananya'],
  },
]
