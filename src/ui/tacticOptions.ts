import type { Condition, Element, TargetPriority } from '../core/types'

type ConditionType = Condition['type']

/** Condition types in menu order, each with the value it starts with when picked. */
export const CONDITION_DEFAULTS: Record<ConditionType, Condition> = {
  always: { type: 'always' },
  enemyWeakTo: { type: 'enemyWeakTo', element: 'fire' },
  enemiesAtLeast: { type: 'enemiesAtLeast', count: 2 },
  allyLifeforceBelow: { type: 'allyLifeforceBelow', percent: 50 },
  selfLifeforceBelow: { type: 'selfLifeforceBelow', percent: 30 },
  selfEssenceAtLeast: { type: 'selfEssenceAtLeast', amount: 30 },
  enemyWithoutStatus: { type: 'enemyWithoutStatus', status: 'burn' },
  enemyHasStatus: { type: 'enemyHasStatus', status: 'burn' },
}

export const CONDITION_LABELS: Record<ConditionType, string> = {
  always: 'Always',
  enemyWeakTo: 'Enemy is Weak to …',
  enemiesAtLeast: 'Enemies ≥ …',
  allyLifeforceBelow: 'Ally Lifeforce < …',
  selfLifeforceBelow: 'Self Lifeforce < …',
  selfEssenceAtLeast: 'Self Essence ≥ …',
  enemyWithoutStatus: 'Enemy without Burn',
  enemyHasStatus: 'Enemy has Burn',
}

/** Spike 1 only has Fire and Ice creatures that can be Weak to something. */
export const WEAKNESS_ELEMENTS: Element[] = ['fire', 'ice']
export const PERCENT_OPTIONS = [25, 50, 75]
export const ESSENCE_OPTIONS = [20, 30, 40, 50]
export const COUNT_OPTIONS = [2, 3]

export const TARGET_OPTIONS: TargetPriority[] = [
  'sameLane',
  'lowestLifeforce',
  'highestLifeforce',
  'weakToSkill',
  'highestMight',
  'highestResonance',
  'self',
]
