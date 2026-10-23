import { RULES } from './rules'
import { effectiveStat, isAlive, type Unit } from './unit'

export const actionDelay = (unit: Unit) => Math.round(RULES.turnScale / effectiveStat(unit, 'swiftness'))

/** Earlier time first; ties go to higher Swiftness, then the player side, then team order. */
function compare(a: Unit, aAt: number, b: Unit, bAt: number): number {
  return (
    aAt - bAt ||
    b.stats.swiftness - a.stats.swiftness ||
    (a.side === b.side ? 0 : a.side === 'player' ? -1 : 1) ||
    a.index - b.index
  )
}

export function nextActor(units: Unit[]): Unit | undefined {
  let best: Unit | undefined
  for (const unit of units) {
    if (isAlive(unit) && (!best || compare(unit, unit.nextAt, best, best.nextAt) < 0)) best = unit
  }
  return best
}

/** Predicts the next `count` actors without changing any unit (for the visible Turn Order). */
export function previewTurnOrder(units: Unit[], count: number): Unit[] {
  const clock = new Map(units.filter(isAlive).map((u) => [u, u.nextAt]))
  const order: Unit[] = []
  while (order.length < count && clock.size > 0) {
    let best: Unit | undefined
    for (const [unit, at] of clock) {
      if (!best || compare(unit, at, best, clock.get(best)!) < 0) best = unit
    }
    order.push(best!)
    clock.set(best!, clock.get(best!)! + actionDelay(best!))
  }
  return order
}
