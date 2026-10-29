import { isBuff } from '../core/statuses'
import type { Condition, SkillDef, Tactic } from '../core/types'

type ConditionType = Condition['type']

interface Candidate {
  tactic: Tactic
  priority: number
}

const damageValue = (s: SkillDef) =>
  s.power * (s.pattern === 'all' ? 2 : s.pattern === 'sweep' || s.pattern === 'pierce' ? 1.6 : 1) * (s.bonusVsStatus ? 1.1 : 1)

/**
 * A sensible Battle Plan built from a creature's skills: revive and heal when needed, keep buffs and
 * debuffs up, use area skills on groups, otherwise the strongest attack. Used for every CPU opponent
 * and for the "Suggest" button. Only uses Conditions in `allowed`.
 */
export function autoPlan(skills: SkillDef[], slots: number, allowed: readonly ConditionType[]): Tactic[] {
  const can = (type: ConditionType) => allowed.includes(type)
  const candidates: Candidate[] = []
  const add = (priority: number, condition: Condition, skill: SkillDef, target: Tactic['target']) => {
    if (condition.type !== 'always' && !can(condition.type)) condition = { type: 'always' }
    candidates.push({ priority, tactic: { condition, skill: skill.id, target } })
  }

  for (const skill of skills) {
    if (skill.cost === 0) continue
    if (skill.revive) {
      add(100, { type: 'always' }, skill, 'highestLifeforce')
    } else if (skill.effect === 'heal') {
      const threshold = skill.pattern === 'all' ? 60 : 50
      if (can('allyLifeforceBelow')) add(skill.pattern === 'all' ? 90 : 88, { type: 'allyLifeforceBelow', percent: threshold }, skill, 'lowestLifeforce')
      else add(20, { type: 'always' }, skill, 'lowestLifeforce')
    } else if (skill.effect === 'buff') {
      const status = skill.inflicts!.status
      const priority = status === 'taunt' ? 80 : status === 'barrier' ? 60 : 55
      // Buffs never land on someone who already has them, so Always is safe even without the status Condition.
      const condition: Condition = can('allyWithoutStatus') ? { type: 'allyWithoutStatus', status } : { type: 'always' }
      add(priority, condition, skill, skill.selfOnly ? 'self' : status === 'haste' ? 'highestMight' : 'lowestLifeforce')
    } else {
      const status = skill.inflicts && skill.inflicts.chance >= 0.5 && !isBuff(skill.inflicts.status) ? skill.inflicts.status : null
      // Attacks follow the Lane Rule, so the formation decides who gets hit.
      if (status && can('enemyWithoutStatus')) add(70, { type: 'enemyWithoutStatus', status }, skill, 'sameLane')
      if (skill.pattern !== 'single' && can('enemiesAtLeast')) add(50 + damageValue(skill) * 5, { type: 'enemiesAtLeast', count: 2 }, skill, 'sameLane')
      if (skill.bonusVsStatus && can('enemyHasStatus')) add(45 + damageValue(skill) * 5, { type: 'enemyHasStatus', status: skill.bonusVsStatus.status }, skill, 'sameLane')
      add(30 + damageValue(skill) * 10, { type: 'always' }, skill, 'sameLane')
    }
  }

  candidates.sort((a, b) => b.priority - a.priority)
  const plan: Tactic[] = []
  const used = new Set<string>()
  for (const c of candidates) {
    if (plan.length >= slots) break
    const key = `${c.tactic.skill}:${c.tactic.condition.type}`
    if (used.has(key) || (c.tactic.condition.type === 'always' && plan.some((t) => t.skill === c.tactic.skill))) continue
    used.add(key)
    plan.push(c.tactic)
  }
  // With room left, an unconditional attack at the end beats falling back to the Basic Attack.
  const hasAttack = plan.some((t) => t.condition.type === 'always' && skills.find((s) => s.id === t.skill)?.effect === 'damage')
  if (!hasAttack) {
    const best = skills.filter((s) => s.effect === 'damage' && s.cost > 0).sort((a, b) => damageValue(b) - damageValue(a))[0]
    if (best) {
      const attack: Tactic = { condition: { type: 'always' }, skill: best.id, target: 'sameLane' }
      if (plan.length < slots) plan.push(attack)
    }
  }
  return plan
}
