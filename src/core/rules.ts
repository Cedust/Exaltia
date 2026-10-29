import type { Element, TargetPriority } from './types'

/** Tuning constants for the battle simulation. */
export const RULES = {
  /** Hard cap; how many a creature may use comes from the current Act (see data/progression). */
  maxTacticSlots: 5,
  maxTeamSize: 4,
  /** Action delay is turnScale / Swiftness, so higher Swiftness acts more often. */
  turnScale: 10000,
  /** Actions after which a battle ends as a draw. */
  maxTurns: 240,
  startingEssenceRatio: 0.5,
  essenceRegen: 10,
  /** Damage = power * attack * defenseScale / (defenseScale + defense) * damageScale. Heals scale the same. */
  defenseScale: 100,
  damageScale: 1.5,
  /** Against stalemates: from this turn on, the arena surges. Damage rises and healing falls every turn. */
  surgeTurn: 50,
  surgeDamagePerTurn: 0.05,
  surgeHealingPerTurn: 0.02,
  weaknessMultiplier: 1.5,
  /** +/- spread applied to damage and heals. */
  variance: 0.05,
  /** Target Priority for the Basic Attack fallback. */
  fallbackTarget: 'sameLane' as TargetPriority,
  upcomingTurns: 8,
  /** Ascension gauge (0-100): gained from damage taken (share of max Lifeforce), hits landed and fallen allies. */
  ascensionPerLifeforceLost: 90,
  ascensionPerHit: 7,
  ascensionPerFallenAlly: 25,
  ascensionMax: 100,
  /** Boss phase 2 starts below this share of Lifeforce. */
  bossPhaseThreshold: 0.5,
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

export const opposite = (element: Element) => OPPOSITES[element]

/** Lanes run top to bottom on every screen. */
export const LANE_NAMES = ['Top', 'Middle', 'Bottom'] as const
