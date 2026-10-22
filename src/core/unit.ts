import type { CreatureDef, Position, Side, StatusId, Tactic, UnitId, UnitSnapshot } from './types'

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
  position: Position
  tactics: Tactic[]
  lifeforce: number
  essence: number
  statuses: ActiveStatus[]
  /** Time on the CTB clock at which this unit acts next. */
  nextAt: number
}

export const isAlive = (unit: Unit) => unit.lifeforce > 0

export const lifeforceRatio = (unit: Unit) => unit.lifeforce / unit.creature.stats.lifeforce

export const hasStatus = (unit: Unit, status: StatusId) => unit.statuses.some((s) => s.id === status)

export function snapshot(unit: Unit): UnitSnapshot {
  return {
    id: unit.id,
    side: unit.side,
    creature: unit.creature.id,
    name: unit.creature.name,
    element: unit.creature.element,
    position: { ...unit.position },
    maxLifeforce: unit.creature.stats.lifeforce,
    maxEssence: unit.creature.stats.essence,
    lifeforce: unit.lifeforce,
    essence: unit.essence,
  }
}
