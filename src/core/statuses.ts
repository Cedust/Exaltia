import type { StatusId } from './types'

export interface StatusRule {
  name: string
  kind: 'buff' | 'debuff'
  description: string
}

/** The shared Status Effect list. Numbers are applied in unit.ts (attributes) and battle.ts (ticks). */
export const STATUS_RULES: Record<StatusId, StatusRule> = {
  burn: { name: 'Burn', kind: 'debuff', description: 'Loses 6% Lifeforce at the start of each turn.' },
  chill: { name: 'Chill', kind: 'debuff', description: 'Swiftness -30%: acts less often.' },
  shock: { name: 'Shock', kind: 'debuff', description: '30% chance to lose each turn.' },
  sunder: { name: 'Sunder', kind: 'debuff', description: 'Guard and Ward -30%.' },
  hex: { name: 'Hex', kind: 'debuff', description: 'Might and Resonance -25%.' },
  regen: { name: 'Regen', kind: 'buff', description: 'Recovers 7% Lifeforce at the start of each turn.' },
  haste: { name: 'Haste', kind: 'buff', description: 'Swiftness +35%: acts more often.' },
  barrier: { name: 'Barrier', kind: 'buff', description: 'Takes 30% less damage.' },
  taunt: { name: 'Taunt', kind: 'buff', description: 'Enemies must aim their attacks at this creature when they can reach it.' },
}

export const STATUS_IDS = Object.keys(STATUS_RULES) as StatusId[]

export const STATUS_NUMBERS = {
  burnPercent: 0.06,
  regenPercent: 0.07,
  chillSwiftness: 0.7,
  hasteSwiftness: 1.35,
  shockChance: 0.3,
  sunderDefense: 0.7,
  hexAttack: 0.75,
  barrierDamage: 0.7,
}

export const statusName = (status: StatusId) => STATUS_RULES[status].name
export const isBuff = (status: StatusId) => STATUS_RULES[status].kind === 'buff'
