import { isWeakTo } from './rules'
import type { Condition, SkillDef, TargetPriority } from './types'
import { hasStatus, isAlive, lifeforceRatio, type Unit } from './unit'

/** Units a skill may pick as its primary target, before the Target Priority chooses one. */
export function candidates(skill: SkillDef, actor: Unit, units: Unit[]): Unit[] {
  // Buffs never target someone who already has their status, so "Always → Taunt" recasts only when it runs out.
  const lacksBuff = (u: Unit) => skill.effect !== 'buff' || !skill.inflicts || !hasStatus(u, skill.inflicts.status)
  if (skill.selfOnly) return isAlive(actor) && lacksBuff(actor) ? [actor] : []
  if (skill.revive) return units.filter((u) => u.side === actor.side && !isAlive(u))
  if (skill.effect === 'heal') {
    return units.filter((u) => u.side === actor.side && isAlive(u) && lifeforceRatio(u) < 1)
  }
  if (skill.effect === 'buff') return units.filter((u) => u.side === actor.side && isAlive(u) && lacksBuff(u))
  const enemies = units.filter((u) => u.side !== actor.side && isAlive(u))
  // The Back Row is protected while anyone stands in the Front Row.
  const front = enemies.filter((u) => u.position.row === 'front')
  const reachable = skill.ignoresProtection || front.length === 0 ? enemies : front
  // Taunt: attacks must aim at a taunting creature when they can reach one.
  const taunting = reachable.filter((u) => hasStatus(u, 'taunt'))
  return taunting.length > 0 ? taunting : reachable
}

/**
 * Conditions about enemies or allies also narrow who the Tactic may target, so
 * "If Enemy is Weak to Fire → Flame Burst" only ever hits an enemy that is Weak to Fire.
 */
export function conditionFilter(condition: Condition, skill: SkillDef): (unit: Unit) => boolean {
  const damage = skill.effect === 'damage'
  switch (condition.type) {
    case 'enemyWeakTo':
      return (u) => !damage || isWeakTo(u.creature.element, condition.element)
    case 'enemyWithoutStatus':
      return (u) => !damage || !hasStatus(u, condition.status)
    case 'enemyHasStatus':
      return (u) => !damage || hasStatus(u, condition.status)
    case 'enemyLifeforceBelow':
      return (u) => !damage || lifeforceRatio(u) * 100 < condition.percent
    case 'allyLifeforceBelow':
      return (u) => damage || lifeforceRatio(u) * 100 < condition.percent
    case 'allyWithoutStatus':
      return (u) => damage || !hasStatus(u, condition.status)
    default:
      return () => true
  }
}

const byPosition = (a: Unit, b: Unit) =>
  a.position.lane - b.position.lane || (a.position.row === b.position.row ? 0 : a.position.row === 'front' ? -1 : 1)

function score(priority: TargetPriority, unit: Unit, actor: Unit, skill: SkillDef): number {
  switch (priority) {
    case 'lowestLifeforce':
      return lifeforceRatio(unit)
    case 'highestLifeforce':
      return -lifeforceRatio(unit)
    case 'highestMight':
      return -unit.stats.might
    case 'highestResonance':
      return -unit.stats.resonance
    case 'highestSwiftness':
      return -unit.stats.swiftness
    case 'weakToSkill':
      return (isWeakTo(unit.creature.element, skill.element) ? 0 : 1) + lifeforceRatio(unit) / 2
    case 'sameLane':
      return Math.abs(unit.position.lane - actor.position.lane)
    case 'self':
      return unit === actor ? 0 : Infinity
  }
}

/** Applies the Target Priority, then expands the primary target by the skill's Target Pattern. */
export function selectTargets(
  skill: SkillDef,
  priority: TargetPriority,
  actor: Unit,
  units: Unit[],
  allowed: (unit: Unit) => boolean = () => true,
): Unit[] {
  // Self only makes sense for skills that may target allies; for attacks it falls back to the nearest Lane.
  const effective = priority === 'self' && skill.effect === 'damage' ? 'sameLane' : priority
  const pool = candidates(skill, actor, units)
    .filter(allowed)
    .map((unit) => ({ unit, score: score(effective, unit, actor, skill) }))
    .filter((c) => c.score !== Infinity)
    .sort((a, b) => a.score - b.score || byPosition(a.unit, b.unit))
  const primary = pool[0]?.unit
  if (!primary) return []
  if (skill.selfOnly) return [primary]

  if (skill.revive) return [primary]
  const side = units.filter((u) => u.side === primary.side && isAlive(u))
  switch (skill.pattern) {
    case 'single':
      return [primary]
    case 'pierce':
      return side.filter((u) => u.position.lane === primary.position.lane).sort(byPosition)
    case 'sweep':
      return side.filter((u) => u.position.row === primary.position.row).sort(byPosition)
    case 'all':
      return side.sort(byPosition)
  }
}
