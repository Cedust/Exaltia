import { STATUS_IDS } from '../core/statuses'
import type { Condition, Element, TargetPriority } from '../core/types'

type ConditionType = Condition['type']

/** Condition types in menu order, each with the value it starts with when picked. */
export const CONDITION_DEFAULTS: Record<ConditionType, Condition> = {
  always: { type: 'always' },
  enemyWeakTo: { type: 'enemyWeakTo', element: 'fire' },
  enemiesAtLeast: { type: 'enemiesAtLeast', count: 2 },
  allyLifeforceBelow: { type: 'allyLifeforceBelow', percent: 50 },
  selfLifeforceBelow: { type: 'selfLifeforceBelow', percent: 30 },
  enemyLifeforceBelow: { type: 'enemyLifeforceBelow', percent: 30 },
  selfEssenceAtLeast: { type: 'selfEssenceAtLeast', amount: 30 },
  enemyWithoutStatus: { type: 'enemyWithoutStatus', status: 'burn' },
  enemyHasStatus: { type: 'enemyHasStatus', status: 'burn' },
  allyWithoutStatus: { type: 'allyWithoutStatus', status: 'barrier' },
}

export const CONDITION_LABELS: Record<ConditionType, string> = {
  always: 'Always',
  enemyWeakTo: 'Enemy is Weak to …',
  enemiesAtLeast: 'Enemies ≥ …',
  allyLifeforceBelow: 'Ally Lifeforce < …',
  selfLifeforceBelow: 'Self Lifeforce < …',
  enemyLifeforceBelow: 'Enemy Lifeforce < …',
  selfEssenceAtLeast: 'Self Essence ≥ …',
  enemyWithoutStatus: 'Enemy without …',
  enemyHasStatus: 'Enemy has …',
  allyWithoutStatus: 'Ally without …',
}

export const CONDITION_HELP: Record<ConditionType, string> = {
  always: 'Fires whenever the skill is affordable and has a target.',
  enemyWeakTo: 'Only targets enemies Weak to that element.',
  enemiesAtLeast: 'Only while at least that many enemies stand. Good for area skills.',
  allyLifeforceBelow: 'Only targets allies below that Lifeforce. Good for heals.',
  selfLifeforceBelow: 'Only while this creature is below that Lifeforce.',
  enemyLifeforceBelow: 'Only targets enemies below that Lifeforce. Good for finishers.',
  selfEssenceAtLeast: 'Only while this creature has that much Essence. Saves up for big skills.',
  enemyWithoutStatus: 'Only targets enemies that lack the status. Keeps debuffs up.',
  enemyHasStatus: 'Only targets enemies that have the status. Combos with "+% vs" skills.',
  allyWithoutStatus: 'Only targets allies that lack the status. Keeps buffs up.',
}

export const WEAKNESS_ELEMENTS: Element[] = ['fire', 'ice', 'thunder', 'water', 'earth', 'wind', 'radiance', 'umbra']
export const PERCENT_OPTIONS = [25, 40, 50, 60, 75]
export const ESSENCE_OPTIONS = [20, 30, 40, 50, 60]
export const COUNT_OPTIONS = [2, 3, 4]
export { STATUS_IDS }

export const TARGET_OPTIONS: TargetPriority[] = [
  'sameLane',
  'lowestLifeforce',
  'highestLifeforce',
  'weakToSkill',
  'highestMight',
  'highestResonance',
  'highestSwiftness',
  'self',
]
