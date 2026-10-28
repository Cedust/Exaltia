import type { Stats } from '../core/types'

/**
 * Progression and campaign tuning in one place (concept doc "Paragon Progression" and "Progression").
 * Every number here was checked with `npm run campaign` (tools/campaign.ts).
 */

export type Act = 'prologue' | 'act1' | 'act2' | 'act3' | 'act4'

export const ACT_NAMES: Record<Act, string> = {
  prologue: 'Prologue · The Shattered Spire',
  act1: 'Act I · The Unsworn',
  act2: 'Act II · Broken Oaths',
  act3: 'Act III · The Spire Reforged',
  act4: 'Act IV · Beyond the Oath',
}

/** Default team size by Tournaments won: 2v2 at the start, 3v3 from the third, 4v4 in the late game. */
export function teamSizeFor(tournamentsWon: number): number {
  if (tournamentsWon >= 6) return 4
  if (tournamentsWon >= 2) return 3
  return 2
}

// ── Awakening (1-10): XP only gives Awakening Points ──
/** Total XP needed for each Awakening stage (index = stage). */
export const AWAKENING_XP = [0, 0, 120, 300, 550, 900, 1350, 1900, 2600, 3500, 4600]
export const MAX_AWAKENING = 10

export function awakeningOf(xp: number): number {
  let level = 1
  for (let l = 2; l <= MAX_AWAKENING; l++) if (xp >= AWAKENING_XP[l]) level = l
  return level
}

export const XP = {
  base: 40,
  perTier: 12,
  kind: { trial: 1, match: 1, final: 1.5, challenge: 1, duel: 1.5, finale: 2, rematch: 2 } as Record<string, number>,
  lossShare: 0.3,
  /** Paragons that sat out the battle still learn a little. */
  benchShare: 0.5,
  /** A newly bound Paragon starts with this share of your strongest Paragon's XP. */
  catchUp: 0.6,
}

// ── Mastery (1-5) by use ──
export const MASTERY_USES = [0, 0, 5, 18, 45, 100]
export const MAX_MASTERY = 5

export function masteryOf(uses: number): number {
  let stars = 1
  for (let s = 2; s <= MAX_MASTERY; s++) if (uses >= MASTERY_USES[s]) stars = s
  return stars
}

export const MASTERY_EFFECTS = [
  '',
  'Base skill',
  '+10% Power',
  'Essence cost -20%',
  '+20% Power',
  '+30% Power, statuses last 1 turn longer and land more often',
]

// ── Oath Rank (I-V in the story; VI-X with Sigil Shards in the endgame) ──
export const SHARDS_PER_RANK = 10
export const MAX_OATH_RANK = 5

export type RoleGroup = 'tank' | 'physical' | 'caster' | 'support'

export function roleGroup(role: string): RoleGroup {
  if (/Guardian|Bulwark/.test(role)) return 'tank'
  if (/Caster|Hexer|Controller/.test(role)) return 'caster'
  if (/Healer|Support|Enchanter|Purifier/.test(role)) return 'support'
  return 'physical'
}

/** Attributes that grow faster with Oath Shards, weighted by role. */
export const OATH_PRIMARY: Record<RoleGroup, (keyof Stats)[]> = {
  tank: ['lifeforce', 'guard', 'ward'],
  physical: ['might', 'lifeforce', 'guard'],
  caster: ['resonance', 'ward', 'lifeforce'],
  support: ['resonance', 'lifeforce', 'ward'],
}
export const OATH_PER_SHARD = { primary: 0.009, secondary: 0.005, swiftness: 0.002 }
export const ATTUNEMENT_BONUS = 0.08

export const OATH_PERKS: Record<number, { name: string; description: string }> = {
  1: { name: 'Kindled Sigil', description: 'Starts every battle with +10 Essence.' },
  2: { name: 'Attunement', description: 'Choose: +8% Might and Resonance, or +8% Guard and Ward.' },
  3: { name: 'Sigil Resonance', description: '+10% damage with its own element.' },
  4: { name: 'Attunement', description: 'Choose again: offense or defense.' },
  5: { name: 'Exalted', description: 'Ascension gauge fills 25% faster.' },
}

// ── Acolytes ──
/** Acolytes keep their fixed kits but grow with every Tournament you win, at the same pace as the world. */
export const ACOLYTE_GROWTH_PER_TOURNAMENT = 0.085

// ── Enemies ──
/** Enemy strength scales with Tournaments won, so every region order stays fair. */
export const ENEMY_GROWTH_PER_TIER = 0.085
export const ENEMY_SWIFTNESS_PER_TIER = 0.012
/**
 * Boss Lifeforce = growth * (lifeforceBase + lifeforcePerTier * tier + lifeforcePerExtraMember * (team size - 2)).
 * Other attributes = growth * min(attributeMax, attributeBase + attributePerTier * tier): early Paragons hold back.
 */
export const BOSS = {
  lifeforceBase: 1.1,
  lifeforcePerTier: 0.06,
  lifeforcePerExtraMember: 0.25,
  attributeBase: 0.56,
  attributePerTier: 0.06,
  attributeMax: 1,
  /** Bosses fight several rounds in a match, so each round they bring less Lifeforce than a single long battle. */
  matchLifeforce: 0.5,
}
/** Enemy Lifeforce by encounter kind: Cassian's 1v1 duels get more; the finale (four tier-8 Paragons, best of 7) and the First Trial less. */
export const ENEMY_LIFEFORCE: Record<string, number> = { duel: 1.25, finale: 0.5, trial: 0.55 }
export const FINALE_TIER = 8
export const REMATCH_TIER = 10

// ── Oath Shards ──
export const SHARD_REWARDS = { trial: 5, match: 4, final: 8, tournament: 12, challenge: 6, challengeRepeat: 2, duel: 10, finale: 20, rematch: 15 }

/** Conditions the automatic role behaviour (auto plan) may use. */
export const ALL_CONDITIONS = [
  'always',
  'enemyWeakTo',
  'allyLifeforceBelow',
  'selfEssenceAtLeast',
  'enemiesAtLeast',
  'enemyWithoutStatus',
  'allyWithoutStatus',
  'selfLifeforceBelow',
  'enemyHasStatus',
  'enemyLifeforceBelow',
] as const

// ── Vow Duels ──

/** Best of X by encounter kind (Challenges: Bo1, 1v1 Challenges Bo3). */
export const BEST_OF = { trial: 3, match: 5, final: 5, challenge: 1, challenge1v1: 3, duel: 3, finale: 7, rematch: 5 }
/** Boss Vows the opponent already holds when the match begins. */
export const BOSS_VOWS: Record<string, number> = { final: 1, finale: 2, rematch: 2 }

/** Vows the player knows from the start. */
export const STARTING_VOWS = [
  'stoneskin',
  'quickened-step',
  'keen-edge',
  'vigil',
  'second-wind',
  'mending-light',
  'fireproof',
  'blood-price',
  'opening-gambit',
  'undying-oath',
]
export const TRIAL_VOW = 'dawnbreak'
/** Each region's Challenges teach a Vow that fits the region (first win only). */
export const CHALLENGE_VOWS: Record<string, string> = {
  'radiance-c1': 'shatter-ward',
  'radiance-c2': 'cleansing-oath',
  'wind-c1': 'split-the-flame',
  'wind-c2': 'deep-well',
  'thunder-c1': 'anchor',
  'thunder-c2': 'avenger',
  'fire-c1': 'kindling',
  'fire-c2': 'ember-covenant',
  'umbra-c1': 'lingering-wound',
  'umbra-c2': 'mirror-oath',
  'earth-c1': 'last-breath',
  'earth-c2': 'glass-vanguard',
  'water-c1': 'turned-tide',
  'water-c2': 'wildfire',
  'ice-c1': 'frostbite',
  'ice-c2': 'steam-burst',
}

/** What each opponent likes to swear, by backdrop (region, the Spire constructs, or Cassian). */
export const OPPONENT_THEMES: Record<string, { theme: string; prefers: string[] }> = {
  radiance: { theme: 'Light and Renewal', prefers: ['mending-light', 'cleansing-oath', 'shatter-ward', 'dawnbreak', 'vigil', 'second-wind'] },
  wind: { theme: 'Speed and Reach', prefers: ['quickened-step', 'split-the-flame', 'opening-gambit', 'keen-edge', 'deep-well', 'dawnbreak'] },
  thunder: { theme: 'Speed and Strikes', prefers: ['quickened-step', 'opening-gambit', 'split-the-flame', 'avenger', 'keen-edge', 'shatter-ward'] },
  fire: { theme: 'Burn and Bargains', prefers: ['kindling', 'lingering-wound', 'ember-covenant', 'blood-price', 'wildfire', 'glass-vanguard'] },
  umbra: { theme: 'Wounds and Tricks', prefers: ['lingering-wound', 'blood-price', 'avenger', 'last-breath', 'keen-edge', 'turned-tide'] },
  earth: { theme: 'Walls and Retribution', prefers: ['stoneskin', 'anchor', 'glass-vanguard', 'last-breath', 'vigil', 'avenger'] },
  water: { theme: 'Tides and Healing', prefers: ['mending-light', 'second-wind', 'turned-tide', 'cleansing-oath', 'deep-well', 'undying-oath'] },
  ice: { theme: 'Chill and Endurance', prefers: ['frostbite', 'stoneskin', 'vigil', 'anchor', 'last-breath', 'undying-oath'] },
  spire: { theme: 'Stone and Patience', prefers: ['stoneskin', 'vigil', 'second-wind'] },
  cassian: { theme: 'Chains and Bargains', prefers: ['blood-price', 'glass-vanguard', 'keen-edge', 'opening-gambit', 'dawnbreak', 'undying-oath'] },
}
