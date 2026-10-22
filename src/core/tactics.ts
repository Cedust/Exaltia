import { RULES, isWeakTo } from './rules'
import { conditionFilter, selectTargets } from './targeting'
import type { Condition, Content, SkillDef } from './types'
import { hasStatus, isAlive, lifeforceRatio, type Unit } from './unit'

export function conditionMet(condition: Condition, actor: Unit, units: Unit[]): boolean {
  const allies = units.filter((u) => u.side === actor.side && isAlive(u))
  const enemies = units.filter((u) => u.side !== actor.side && isAlive(u))
  switch (condition.type) {
    case 'always':
      return true
    case 'enemyWeakTo':
      return enemies.some((u) => isWeakTo(u.creature.element, condition.element))
    case 'allyLifeforceBelow':
      return allies.some((u) => lifeforceRatio(u) * 100 < condition.percent)
    case 'selfLifeforceBelow':
      return lifeforceRatio(actor) * 100 < condition.percent
    case 'selfEssenceAtLeast':
      return actor.essence >= condition.amount
    case 'enemyWithoutStatus':
      return enemies.some((u) => !hasStatus(u, condition.status))
    case 'enemyHasStatus':
      return enemies.some((u) => hasStatus(u, condition.status))
    case 'enemiesAtLeast':
      return enemies.length >= condition.count
  }
}

export interface Action {
  skill: SkillDef
  /** Index of the Tactic that fired, or null for the Basic Attack fallback. */
  tactic: number | null
  targets: Unit[]
}

/**
 * Checks Tactics top-down; the first affordable one whose Condition holds and that finds a target fires.
 * Targets must match the Condition where it names enemies or allies (see conditionFilter).
 */
export function chooseAction(actor: Unit, units: Unit[], content: Content): Action | null {
  for (const [index, tactic] of actor.tactics.entries()) {
    const skill = content.skills[tactic.skill]
    if (actor.essence < skill.cost) continue
    if (!conditionMet(tactic.condition, actor, units)) continue
    const targets = selectTargets(skill, tactic.target, actor, units, conditionFilter(tactic.condition, skill))
    if (targets.length > 0) return { skill, tactic: index, targets }
  }
  const basic = content.skills[actor.creature.basicAttack]
  const targets = selectTargets(basic, RULES.fallbackTarget, actor, units)
  return targets.length > 0 ? { skill: basic, tactic: null, targets } : null
}
