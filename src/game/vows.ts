import type { CreatureDef, Lane, Passive, SkillDef, Stats, StatusId } from '../core/types'

/**
 * Vows: the upgrades both sides swear between the rounds of a Vow Duel (design doc "Exaltia – Vow Duels Design").
 * A Vow lasts until the end of the match. Most go on one creature, some on the whole team or the Front Row.
 */

export type VowKind = 'empower' | 'transform' | 'trigger' | 'counter' | 'bargain' | 'rule' | 'covenant'
export type Rarity = 'common' | 'rare' | 'exalted'
export type VowScope = 'creature' | 'team' | 'front'
/** Who the CPU puts a creature Vow on. */
export type VowAim = 'attacker' | 'tank' | 'support' | 'paragon'

/** A team member while its Vows are applied; the result becomes the member's Loadout. */
export interface VowMember {
  creature: CreatureDef
  lane: Lane
  row: 'front' | 'back'
  stats: Stats
  passives: Passive[]
  /** Every skill the member can use (incl. Basic Attack and Ascension), by id. */
  skillDefs: Record<string, SkillDef>
}

export interface VowContext {
  /** Creatures of the side that would swear the Vow. */
  creatures: CreatureDef[]
  /** Vows that side already holds. */
  vows: string[]
}

export interface VowDef {
  id: string
  name: string
  kind: VowKind
  rarity: Rarity
  scope: VowScope
  text: string
  /** Applied to each receiver; `team` is the whole side, for Vows that depend on the formation. */
  apply: (member: VowMember, team: VowMember[]) => void
  /** Who it works on, when that is not simply the scope (e.g. "Front Middle"). */
  carrier?: string
  /** Creature Vows only: who may carry it. */
  canTarget?: (member: VowMember) => boolean
  /** The Vow only shows up in offers when this holds (Covenants). */
  requires?: (ctx: VowContext) => boolean
  aim?: VowAim
  /** The CPU likes this Vow against teams that inflict this status. */
  counters?: StatusId[]
}

const scale = (stats: Stats, keys: (keyof Stats)[], factor: number) => {
  for (const key of keys) stats[key] = Math.round(stats[key] * factor)
}

const damageSkills = (m: VowMember) => Object.values(m.skillDefs).filter((s) => s.effect === 'damage')

const patchDamage = (m: VowMember, patch: (s: SkillDef) => SkillDef | null) => {
  for (const skill of damageSkills(m)) {
    const next = patch(skill)
    if (next) m.skillDefs[skill.id] = next
  }
}

const hasElement = (ctx: VowContext, element: string) => ctx.creatures.some((c) => c.element === element)
const hasHeal = (m: VowMember) => Object.values(m.skillDefs).some((s) => s.effect === 'heal')

export const VOWS: VowDef[] = [
  // ── Common ──
  {
    id: 'stoneskin', name: 'Stoneskin', kind: 'empower', rarity: 'common', scope: 'creature', aim: 'tank',
    text: '+25% Guard and Ward.',
    apply: (m) => scale(m.stats, ['guard', 'ward'], 1.25),
  },
  {
    id: 'quickened-step', name: 'Quickened Step', kind: 'empower', rarity: 'common', scope: 'creature', aim: 'attacker',
    text: '+20% Swiftness.',
    apply: (m) => scale(m.stats, ['swiftness'], 1.2),
  },
  {
    id: 'keen-edge', name: 'Keen Edge', kind: 'empower', rarity: 'common', scope: 'creature', aim: 'attacker',
    text: '+20% Might and Resonance.',
    apply: (m) => scale(m.stats, ['might', 'resonance'], 1.2),
  },
  {
    id: 'deep-well', name: 'Deep Well', kind: 'empower', rarity: 'common', scope: 'creature', aim: 'attacker',
    text: 'Starts every round with full Essence.',
    apply: (m) => m.passives.push({ type: 'startEssence', amount: m.stats.essence }),
  },
  {
    id: 'mending-light', name: 'Mending Light', kind: 'empower', rarity: 'common', scope: 'creature', aim: 'support',
    text: 'Heals +35%.',
    canTarget: hasHeal,
    apply: (m) => m.passives.push({ type: 'healPower', percent: 35 }),
  },
  {
    id: 'second-wind', name: 'Second Wind', kind: 'empower', rarity: 'common', scope: 'creature', aim: 'tank',
    text: 'Starts every round with Regen for 4 turns.',
    apply: (m) => m.passives.push({ type: 'startStatus', status: 'regen', turns: 4 }),
  },
  {
    id: 'kindling', name: 'Kindling', kind: 'transform', rarity: 'common', scope: 'creature', aim: 'attacker',
    text: 'Attacks without a status now inflict Burn (40%, 3 turns).',
    apply: (m) => patchDamage(m, (s) => (s.inflicts ? null : { ...s, inflicts: { status: 'burn', chance: 0.4, turns: 3 } })),
  },
  {
    id: 'frostbite', name: 'Frostbite', kind: 'transform', rarity: 'common', scope: 'creature', aim: 'attacker',
    text: 'Attacks without a status now inflict Chill (40%, 2 turns).',
    apply: (m) => patchDamage(m, (s) => (s.inflicts ? null : { ...s, inflicts: { status: 'chill', chance: 0.4, turns: 2 } })),
  },
  {
    id: 'vigil', name: 'Vigil', kind: 'trigger', rarity: 'common', scope: 'creature', aim: 'tank',
    text: 'The first time it drops below 50% Lifeforce: Barrier for 3 turns.',
    apply: (m) => m.passives.push({ type: 'lowLifeBarrier', turns: 3, label: 'Vigil' }),
  },
  {
    id: 'fireproof', name: 'Fireproof', kind: 'counter', rarity: 'common', scope: 'team', counters: ['burn'],
    text: 'Team: immune to Burn.',
    apply: (m) => m.passives.push({ type: 'immune', status: 'burn', label: 'Fireproof' }),
  },
  {
    id: 'anchor', name: 'Anchor', kind: 'counter', rarity: 'common', scope: 'team', counters: ['chill', 'shock'],
    text: 'Team: immune to Chill and Shock.',
    apply: (m) => {
      m.passives.push({ type: 'immune', status: 'chill', label: 'Anchor' })
      m.passives.push({ type: 'immune', status: 'shock', label: 'Anchor' })
    },
  },
  {
    id: 'cleansing-oath', name: 'Cleansing Oath', kind: 'counter', rarity: 'common', scope: 'team', counters: ['hex', 'sunder'],
    text: 'Team: immune to Hex and Sunder.',
    apply: (m) => {
      m.passives.push({ type: 'immune', status: 'hex', label: 'Cleansing Oath' })
      m.passives.push({ type: 'immune', status: 'sunder', label: 'Cleansing Oath' })
    },
  },
  {
    id: 'shatter-ward', name: 'Shatter Ward', kind: 'counter', rarity: 'common', scope: 'team', counters: ['barrier', 'taunt'],
    text: 'Team: every hit removes Barrier from its target first.',
    apply: (m) => m.passives.push({ type: 'shatterBarrier', label: 'Shatter Ward' }),
  },

  {
    id: 'vanguard', name: 'Vanguard', kind: 'empower', rarity: 'common', scope: 'team', carrier: 'Front Middle',
    text: 'The creature in the Front Middle cell: +25% Guard and Ward.',
    apply: (m) => {
      if (m.row === 'front' && m.lane === 1) scale(m.stats, ['guard', 'ward'], 1.25)
    },
  },
  {
    id: 'shieldwall', name: 'Shieldwall', kind: 'counter', rarity: 'common', scope: 'team',
    text: 'Team: a Front creature with an ally behind it in its Lane takes −20% damage.',
    apply: (m) => m.passives.push({ type: 'shieldwall', percent: 20, label: 'Shieldwall' }),
  },

  // ── Rare ──
  {
    id: 'flanker', name: 'Flanker', kind: 'transform', rarity: 'rare', scope: 'creature', aim: 'attacker',
    text: 'While it stands in the Top or Bottom Lane, its single-target attacks become Snipes (reach the Back Row, aim there first).',
    apply: (m) => {
      if (m.lane !== 1) patchDamage(m, (s) => (s.pattern === 'single' && !s.ignoresProtection ? { ...s, ignoresProtection: true } : null))
    },
  },
  {
    id: 'lane-lock', name: 'Lane Lock', kind: 'rule', rarity: 'rare', scope: 'creature', aim: 'tank',
    text: 'Enemies in its Lane must attack it whenever they can reach it.',
    apply: (m) => m.passives.push({ type: 'laneLock', label: 'Lane Lock' }),
  },
  {
    id: 'open-lane', name: 'Open Lane', kind: 'bargain', rarity: 'rare', scope: 'team', carrier: 'Back Row',
    text: 'Back creatures without a Front ally in their Lane deal +30% damage (they stand unprotected).',
    apply: (m, team) => {
      const open = !team.some((t) => t.row === 'front' && t.lane === m.lane)
      if (m.row === 'back' && open) m.passives.push({ type: 'damageDealt', percent: 30 })
    },
  },
  {
    id: 'split-the-flame', name: 'Split the Flame', kind: 'transform', rarity: 'rare', scope: 'creature', aim: 'attacker',
    text: 'Single-target hits also strike the weakest other enemy for 50%.',
    apply: (m) => m.passives.push({ type: 'splash', percent: 50, label: 'Split the Flame' }),
  },
  {
    id: 'wildfire', name: 'Wildfire', kind: 'transform', rarity: 'rare', scope: 'creature', aim: 'attacker',
    text: 'Single-target skills hit all enemies at 55% power.',
    apply: (m) =>
      patchDamage(m, (s) =>
        s.pattern === 'single' && s.id !== m.creature.basicAttack && s.id !== m.creature.ascension ? { ...s, pattern: 'all', power: Math.round(s.power * 55) / 100 } : null,
      ),
  },
  {
    id: 'turned-tide', name: 'Turned Tide', kind: 'transform', rarity: 'rare', scope: 'creature', aim: 'attacker',
    text: 'All its attacks become Water (Thunder creatures are Weak to it).',
    apply: (m) => patchDamage(m, (s) => ({ ...s, element: 'water' })),
  },
  {
    id: 'lingering-wound', name: 'Lingering Wound', kind: 'transform', rarity: 'rare', scope: 'creature', aim: 'attacker',
    text: 'Statuses it applies last 2 turns longer.',
    apply: (m) => m.passives.push({ type: 'statusDuration', turns: 2 }),
  },
  {
    id: 'last-breath', name: 'Last Breath', kind: 'trigger', rarity: 'rare', scope: 'creature', aim: 'tank',
    text: 'When it falls: deals 30% of its Lifeforce to every enemy.',
    apply: (m) => m.passives.push({ type: 'onFaintBurst', percent: 30, label: 'Last Breath' }),
  },
  {
    id: 'opening-gambit', name: 'Opening Gambit', kind: 'trigger', rarity: 'rare', scope: 'creature', aim: 'attacker',
    text: 'Acts first every round; its first attack deals +60%.',
    apply: (m) => {
      m.passives.push({ type: 'actFirst', label: 'Opening Gambit' })
      m.passives.push({ type: 'firstHit', percent: 60, label: 'Opening Gambit' })
    },
  },
  {
    id: 'avenger', name: 'Avenger', kind: 'trigger', rarity: 'rare', scope: 'creature', aim: 'attacker',
    text: 'Each time an ally falls: +35% damage for the rest of the round.',
    apply: (m) => m.passives.push({ type: 'avenger', percent: 35, label: 'Avenger' }),
  },
  {
    id: 'blood-price', name: 'Blood Price', kind: 'bargain', rarity: 'rare', scope: 'creature', aim: 'attacker',
    text: '+45% damage, but starts every round at 70% Lifeforce.',
    apply: (m) => {
      m.passives.push({ type: 'damageDealt', percent: 45 })
      m.passives.push({ type: 'startLifeforce', percent: 70 })
    },
  },
  {
    id: 'glass-vanguard', name: 'Glass Vanguard', kind: 'bargain', rarity: 'rare', scope: 'front',
    text: 'Front Row: +40% damage, −30% Guard and Ward.',
    apply: (m) => {
      m.passives.push({ type: 'damageDealt', percent: 40 })
      scale(m.stats, ['guard', 'ward'], 0.7)
    },
  },
  {
    id: 'mirror-oath', name: 'Mirror Oath', kind: 'counter', rarity: 'rare', scope: 'creature', aim: 'attacker',
    text: "Swear the opponent's last Vow as your own (on the creature you choose).",
    // Resolved when sworn (see duel.ts): it turns into a copy of the opponent's last Vow.
    apply: () => {},
  },

  // ── Exalted ──
  {
    id: 'dawnbreak', name: 'Dawnbreak', kind: 'rule', rarity: 'exalted', scope: 'creature', aim: 'paragon',
    text: 'Its Ascension is ready at the start of every round.',
    canTarget: (m) => Object.values(m.skillDefs).some((s) => s.id === m.creature.ascension),
    apply: (m) => m.passives.push({ type: 'startAscension', label: 'Dawnbreak' }),
  },
  {
    id: 'undying-oath', name: 'Undying Oath', kind: 'rule', rarity: 'exalted', scope: 'team',
    text: 'Once per round, the first of your creatures to fall returns with 40% Lifeforce.',
    apply: (m) => m.passives.push({ type: 'undying', percent: 40, label: 'Undying Oath' }),
  },
  {
    id: 'phalanx', name: 'Phalanx', kind: 'rule', rarity: 'exalted', scope: 'team',
    text: 'Team: your Front Row also protects the Back Row of the neighbouring Lanes.',
    apply: (m) => {
      if (m.row === 'front') m.passives.push({ type: 'phalanx', label: 'Phalanx' })
    },
  },
  {
    id: 'ember-covenant', name: 'Ember Covenant', kind: 'covenant', rarity: 'exalted', scope: 'team',
    text: 'When a Burning enemy falls, Burn spreads to its weakest ally (3 turns).',
    requires: (ctx) => hasElement(ctx, 'fire') || ctx.vows.includes('kindling'),
    apply: (m) => m.passives.push({ type: 'burnSpread', turns: 3, label: 'Ember Covenant' }),
  },
  {
    id: 'steam-burst', name: 'Steam Burst', kind: 'covenant', rarity: 'exalted', scope: 'team',
    text: 'Fire hits on Chilled enemies and Ice hits on Burning enemies splash 40% to all other enemies.',
    requires: (ctx) =>
      (hasElement(ctx, 'fire') || ctx.vows.includes('kindling')) && (hasElement(ctx, 'ice') || ctx.vows.includes('frostbite')),
    apply: (m) => m.passives.push({ type: 'steamBurst', percent: 40, label: 'Steam Burst' }),
  },
]

export const VOW_BY_ID: Record<string, VowDef> = Object.fromEntries(VOWS.map((v) => [v.id, v]))

export const RARITY_WEIGHT: Record<Rarity, number> = { common: 60, rare: 30, exalted: 10 }
export const RARITY_RANK: Record<Rarity, number> = { common: 0, rare: 1, exalted: 2 }

export const KIND_NAMES: Record<VowKind, string> = {
  empower: 'Empower',
  transform: 'Transform',
  trigger: 'Trigger',
  counter: 'Counter',
  bargain: 'Bargain',
  rule: 'Rule',
  covenant: 'Covenant',
}
