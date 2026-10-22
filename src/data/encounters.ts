import type { Team } from '../core/types'

export interface Encounter {
  id: string
  name: string
  description: string
  enemy: Team
}

export const ENCOUNTERS: Encounter[] = [
  {
    id: 'frost-wardens',
    name: 'Frost Wardens',
    description: 'A sturdy Frostguard shields a Rime Mystic. Ice is Weak to Fire, and Fire is Weak to Ice.',
    enemy: {
      members: [
        {
          creature: 'frostguard',
          position: { lane: 1, row: 'front' },
          tactics: [{ condition: { type: 'always' }, skill: 'ice-bash', target: 'sameLane' }],
        },
        {
          creature: 'rime-mystic',
          position: { lane: 1, row: 'back' },
          tactics: [
            { condition: { type: 'enemiesAtLeast', count: 2 }, skill: 'hail', target: 'lowestLifeforce' },
            { condition: { type: 'enemyWeakTo', element: 'ice' }, skill: 'frost-bolt', target: 'weakToSkill' },
          ],
        },
      ],
    },
  },
  {
    id: 'storm-and-arrow',
    name: 'Storm and Arrow',
    description: 'A fast Spark Monk rushes down a Lane while a Relic Archer snipes the Back Row.',
    enemy: {
      members: [
        {
          creature: 'spark-monk',
          position: { lane: 0, row: 'front' },
          tactics: [
            { condition: { type: 'selfEssenceAtLeast', amount: 30 }, skill: 'spark-rush', target: 'sameLane' },
            { condition: { type: 'always' }, skill: 'thunder-palm', target: 'lowestLifeforce' },
          ],
        },
        {
          creature: 'relic-archer',
          position: { lane: 2, row: 'back' },
          tactics: [
            { condition: { type: 'always' }, skill: 'snipe', target: 'lowestLifeforce' },
            { condition: { type: 'always' }, skill: 'piercing-shot', target: 'highestResonance' },
          ],
        },
      ],
    },
  },
  {
    id: 'winter-court',
    name: 'The Winter Court',
    description: 'Kyrael pounces on the Back Row while Nivaris heals and freezes everything. A naive plan will not do.',
    enemy: {
      members: [
        {
          creature: 'kyrael',
          position: { lane: 1, row: 'front' },
          tactics: [
            { condition: { type: 'enemyWeakTo', element: 'ice' }, skill: 'glacial-pounce', target: 'highestResonance' },
            { condition: { type: 'enemiesAtLeast', count: 2 }, skill: 'rending-claws', target: 'lowestLifeforce' },
            { condition: { type: 'always' }, skill: 'frost-fang', target: 'lowestLifeforce' },
          ],
        },
        {
          creature: 'nivaris',
          position: { lane: 1, row: 'back' },
          tactics: [
            { condition: { type: 'allyLifeforceBelow', percent: 50 }, skill: 'winter-mend', target: 'lowestLifeforce' },
            { condition: { type: 'selfEssenceAtLeast', amount: 50 }, skill: 'blizzard', target: 'lowestLifeforce' },
            { condition: { type: 'always' }, skill: 'hoarfrost', target: 'weakToSkill' },
          ],
        },
      ],
    },
  },
]

export const findEncounter = (id: string) => ENCOUNTERS.find((e) => e.id === id)
