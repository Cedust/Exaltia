import { elementName } from '../core/log'
import type { SkillDef } from '../core/types'

const PATTERN_LABELS = { single: 'Single', pierce: 'Pierce', sweep: 'Sweep', all: 'All' }

function kindLabel(skill: SkillDef): string {
  const element = skill.element === 'physical' ? '' : `${elementName(skill.element)} `
  if (skill.effect === 'heal') return `${element}Heal`
  if (skill.element === 'physical') return 'Physical'
  return `${element}${skill.stat === 'might' ? '(Might)' : '(Resonance)'}`
}

export function describeSkill(skill: SkillDef): string {
  const parts = [
    kindLabel(skill),
    PATTERN_LABELS[skill.pattern],
    `Power ${skill.power}`,
    skill.cost > 0 ? `${skill.cost} ESS` : 'free',
  ]
  if (skill.ignoresProtection) parts.push('reaches Back Row')
  if (skill.inflicts) parts.push(`${Math.round(skill.inflicts.chance * 100)}% Burn`)
  return parts.join(' · ')
}
