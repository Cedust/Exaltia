import { elementName } from '../core/log'
import { statusName } from '../core/statuses'
import type { SkillDef } from '../core/types'

const PATTERN_LABELS = { single: 'Single', pierce: 'Pierce (Lane)', sweep: 'Sweep (Row)', all: 'All' }

/** The Reach of a skill: Single, Snipe (reaches the Back Row and aims there first), Pierce, Sweep or All. */
export const reachOf = (skill: SkillDef) => (skill.pattern === 'single' && skill.ignoresProtection && skill.effect === 'damage' ? 'Snipe' : PATTERN_LABELS[skill.pattern])

function kindLabel(skill: SkillDef): string {
  const element = skill.element === 'physical' ? '' : `${elementName(skill.element)} `
  if (skill.revive) return 'Revive'
  if (skill.effect === 'heal') return `${element}Heal`
  if (skill.effect === 'buff') return `${element}Buff`
  if (skill.element === 'physical') return 'Physical'
  return `${element}${skill.stat === 'might' ? 'strike' : 'spell'}`
}

/** One line such as "Fire spell · Sweep · Power 0.9 · 22 ESS · 50% Burn". */
export function describeSkill(skill: SkillDef): string {
  const parts = [kindLabel(skill)]
  if (skill.selfOnly) parts.push('Self')
  else parts.push(reachOf(skill))
  if (skill.revive) parts.push(`${Math.round(skill.power * 100)}% Lifeforce`)
  else if (skill.effect !== 'buff') parts.push(`Power ${skill.power}`)
  parts.push(skill.cost > 0 ? `${skill.cost} ESS` : 'free')
  if (skill.ignoresProtection && skill.pattern !== 'single') parts.push('reaches Back Row')
  if (skill.piercesDefense) parts.push('ignores defense')
  if (skill.inflicts) {
    const chance = skill.inflicts.chance >= 1 ? '' : `${Math.round(skill.inflicts.chance * 100)}% `
    parts.push(`${chance}${statusName(skill.inflicts.status)} ${skill.inflicts.turns}t`)
  }
  if (skill.selfStatus) parts.push(`self ${statusName(skill.selfStatus.status)} ${skill.selfStatus.turns}t`)
  if (skill.drain) parts.push(`drains ${Math.round(skill.drain * 100)}%`)
  if (skill.bonusVsStatus) parts.push(`+${skill.bonusVsStatus.percent}% vs ${statusName(skill.bonusVsStatus.status)}`)
  return parts.join(' · ')
}
