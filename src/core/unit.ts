import { STATUS_NUMBERS } from './statuses'
import type { CreatureDef, Passive, Position, Side, SkillDef, Stats, StatusId, Tactic, UnitId, UnitSnapshot } from './types'

export interface ActiveStatus {
  id: StatusId
  turnsLeft: number
}

/** Mutable per-battle state of one creature. Only the simulation touches it. */
export interface Unit {
  id: UnitId
  /** Stable order for tie-breaks: player members first, then enemies, in team order. */
  index: number
  side: Side
  creature: CreatureDef
  /** Attributes for this battle (creature base plus progression). */
  stats: Stats
  /** Skill definitions this unit uses, by id (Mastery may change them). */
  skills: Record<string, SkillDef>
  passives: Passive[]
  ascensionSkill: SkillDef | null
  position: Position
  tactics: Tactic[]
  phase2: Tactic[] | null
  boss: boolean
  lifeforce: number
  essence: number
  ascension: number
  statuses: ActiveStatus[]
  lastStandUsed: boolean
  /** Vow state: extra damage in percent (Avenger), whether the first hit and Vigil were used. */
  attackBonus: number
  firstHitUsed: boolean
  vigilUsed: boolean
  /** Time on the CTB clock at which this unit acts next. */
  nextAt: number
}

export const isAlive = (unit: Unit) => unit.lifeforce > 0

export const lifeforceRatio = (unit: Unit) => unit.lifeforce / unit.stats.lifeforce

export const hasStatus = (unit: Unit, status: StatusId) => unit.statuses.some((s) => s.id === status)

const passiveValue = (p: Passive) => ('percent' in p ? p.percent : 'amount' in p ? p.amount : 'turns' in p ? p.turns : 1)

/** Sum of a unit's passives of one type, e.g. all its elementPower percents. */
export function passiveSum<T extends Passive['type']>(unit: Unit, type: T, match: (p: Extract<Passive, { type: T }>) => boolean = () => true) {
  let sum = 0
  for (const p of unit.passives) {
    if (p.type === type && match(p as Extract<Passive, { type: T }>)) sum += passiveValue(p)
  }
  return sum
}

/** An attribute with Status Effects applied. */
export function effectiveStat(unit: Unit, key: keyof Stats): number {
  let value = unit.stats[key]
  if (key === 'swiftness') {
    if (hasStatus(unit, 'chill')) value *= STATUS_NUMBERS.chillSwiftness
    if (hasStatus(unit, 'haste')) value *= STATUS_NUMBERS.hasteSwiftness
  }
  if ((key === 'guard' || key === 'ward') && hasStatus(unit, 'sunder')) value *= STATUS_NUMBERS.sunderDefense
  if ((key === 'might' || key === 'resonance') && hasStatus(unit, 'hex')) value *= STATUS_NUMBERS.hexAttack
  return value
}

export function snapshot(unit: Unit): UnitSnapshot {
  return {
    id: unit.id,
    side: unit.side,
    creature: unit.creature.id,
    name: unit.creature.name,
    element: unit.creature.element,
    position: { ...unit.position },
    maxLifeforce: unit.stats.lifeforce,
    maxEssence: unit.stats.essence,
    lifeforce: unit.lifeforce,
    essence: unit.essence,
    boss: unit.boss,
    hasAscension: !!unit.ascensionSkill,
  }
}
