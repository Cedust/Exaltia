import type { Element, TargetPriority } from './types'

/** Tuning constants for the battle simulation. */
export const RULES = {
  tacticSlots: 3,
  maxTeamSize: 4,
  /** Action delay is turnScale / Swiftness, so higher Swiftness acts more often. */
  turnScale: 10000,
  /** Actions after which a battle ends as a draw. */
  maxTurns: 200,
  startingEssenceRatio: 0.5,
  essenceRegen: 10,
  /** Damage = power * attack * defenseScale / (defenseScale + defense). */
  defenseScale: 100,
  weaknessMultiplier: 1.5,
  /** +/- spread applied to damage and heals. */
  variance: 0.05,
  burnPercent: 0.06,
  /** Target Priority for the Basic Attack fallback. */
  fallbackTarget: 'sameLane' as TargetPriority,
  upcomingTurns: 8,
}

const OPPOSITES: Partial<Record<Element, Element>> = {
  fire: 'ice',
  ice: 'fire',
  thunder: 'water',
  water: 'thunder',
  earth: 'wind',
  wind: 'earth',
  radiance: 'umbra',
  umbra: 'radiance',
}

/** A creature is Weak to the element opposing its own. Physical has no opposite. */
export function isWeakTo(defender: Element, attack: Element): boolean {
  return OPPOSITES[defender] === attack
}
