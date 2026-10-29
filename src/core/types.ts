export type Element =
  | 'fire'
  | 'ice'
  | 'thunder'
  | 'water'
  | 'earth'
  | 'wind'
  | 'radiance'
  | 'umbra'
  | 'physical'

export type Side = 'player' | 'enemy'
export type Row = 'front' | 'back'
export type Lane = 0 | 1 | 2

export interface Position {
  lane: Lane
  row: Row
}

export interface Stats {
  lifeforce: number
  might: number
  resonance: number
  guard: number
  ward: number
  swiftness: number
  /** Maximum Essence. */
  essence: number
}

/**
 * The shared Status Effects. Debuffs: Burn, Chill, Shock, Sunder, Hex. Buffs: Regen, Haste, Barrier, Taunt.
 * Rules live in core/statuses.ts.
 */
export type StatusId = 'burn' | 'chill' | 'shock' | 'sunder' | 'hex' | 'regen' | 'haste' | 'barrier' | 'taunt'

/** Single: one unit. Pierce: front and back of one Lane. Sweep: one whole Row. All: whole side. */
export type TargetPattern = 'single' | 'pierce' | 'sweep' | 'all'

export interface SkillDef {
  id: string
  name: string
  element: Element
  /** Damage hits enemies, Heal restores allies, Buff only applies its status to allies. */
  effect: 'damage' | 'heal' | 'buff'
  /** Attacking stat. Might is defended by Guard, Resonance by Ward. Heals always scale with Resonance. */
  stat: 'might' | 'resonance'
  power: number
  cost: number
  pattern: TargetPattern
  /** Can pick Back Row targets even while the Front Row is occupied. */
  ignoresProtection?: boolean
  /** Status put on each target (enemies for damage, allies for heal and buff). */
  inflicts?: { status: StatusId; chance: number; turns: number }
  /** Status the user puts on itself after acting, e.g. Taunt on a Guardian's strike. */
  selfStatus?: { status: StatusId; turns: number }
  /** Only ever targets the user (buffs like Taunt or Barrier on oneself). */
  selfOnly?: boolean
  /** Share of the damage dealt that heals the user. */
  drain?: number
  /** Extra damage against targets that have this status. */
  bonusVsStatus?: { status: StatusId; percent: number }
  /** Heals only: brings a defeated ally back with `power` as the share of its Lifeforce. */
  revive?: boolean
  /** Ignores the target's Guard or Ward. */
  piercesDefense?: boolean
  /** Refills this share (0-1) of the user's Essence after acting. */
  essenceGain?: number
  description?: string
}

export interface CreatureDef {
  id: string
  name: string
  /** Paragon epithet, e.g. "the Ember Wall". */
  title?: string
  kind: 'paragon' | 'acolyte'
  element: Element
  role: string
  stats: Stats
  /** Skills known from the start. Paragons learn more in their Skill Tree. */
  skills: string[]
  /** Free fallback skill when no Tactic matches. */
  basicAttack: string
  /** Paragons only: the Ascension (overdrive) fired automatically when the gauge is full. */
  ascension?: string
  lore?: string
}

/** Runtime traits from Skill Trees, Oath Ranks or boss rules. Attribute boni are baked into Loadout.stats instead. */
export type Passive =
  | { type: 'elementPower'; percent: number }
  | { type: 'healPower'; percent: number }
  | { type: 'bonusVsStatus'; status: StatusId; percent: number }
  | { type: 'statusDuration'; turns: number }
  | { type: 'startEssence'; amount: number }
  | { type: 'essenceRegen'; amount: number }
  | { type: 'ascensionGain'; percent: number }
  | { type: 'damageTaken'; percent: number }
  | { type: 'lastStand' }
  | { type: 'startStatus'; status: StatusId; turns: number }
  // Vows (src/game/vows.ts). `label` is the Vow's name, shown when it fires.
  | { type: 'immune'; status: StatusId; label: string }
  | { type: 'damageDealt'; percent: number }
  | { type: 'startLifeforce'; percent: number }
  | { type: 'startAscension'; label: string }
  | { type: 'actFirst'; label: string }
  | { type: 'firstHit'; percent: number; label: string }
  | { type: 'onFaintBurst'; percent: number; label: string }
  | { type: 'lowLifeBarrier'; turns: number; label: string }
  | { type: 'avenger'; percent: number; label: string }
  | { type: 'shatterBarrier'; label: string }
  | { type: 'undying'; percent: number; label: string }
  | { type: 'splash'; percent: number; label: string }
  | { type: 'burnSpread'; turns: number; label: string }
  | { type: 'steamBurst'; percent: number; label: string }
  // Position Vows: Shieldwall (less damage with an ally behind), Lane Lock (forces attackers in its Lane), Phalanx.
  | { type: 'shieldwall'; percent: number; label: string }
  | { type: 'laneLock'; label: string }
  | { type: 'phalanx'; label: string }

export type Condition =
  | { type: 'always' }
  | { type: 'enemyWeakTo'; element: Element }
  | { type: 'allyLifeforceBelow'; percent: number }
  | { type: 'selfLifeforceBelow'; percent: number }
  | { type: 'enemyLifeforceBelow'; percent: number }
  | { type: 'selfEssenceAtLeast'; amount: number }
  | { type: 'enemyWithoutStatus'; status: StatusId }
  | { type: 'enemyHasStatus'; status: StatusId }
  | { type: 'allyWithoutStatus'; status: StatusId }
  | { type: 'enemiesAtLeast'; count: number }

export type TargetPriority =
  | 'lowestLifeforce'
  | 'highestLifeforce'
  | 'highestMight'
  | 'highestResonance'
  | 'highestSwiftness'
  | 'weakToSkill'
  | 'sameLane'
  | 'self'

export interface Tactic {
  condition: Condition
  skill: string
  target: TargetPriority
}

/** What progression makes of a creature for one battle. Missing fields fall back to the CreatureDef. */
export interface Loadout {
  stats?: Stats
  /** Skills the creature may use in Tactics. */
  skills?: string[]
  /** Per-creature skill versions (e.g. improved by Mastery), by skill id. */
  skillDefs?: Record<string, SkillDef>
  passives?: Passive[]
  /** null removes the Ascension. */
  ascension?: string | null
}

export interface BossRules {
  /** Tactics that replace the normal ones once Lifeforce first drops below 50%. */
  phase2?: Tactic[]
}

export interface TeamMember {
  creature: string
  position: Position
  tactics: Tactic[]
  loadout?: Loadout
  boss?: BossRules
}

export interface Team {
  members: TeamMember[]
}

export interface Content {
  creatures: Record<string, CreatureDef>
  skills: Record<string, SkillDef>
}

export interface BattleSetup {
  player: Team
  enemy: Team
  seed: number
}

export type UnitId = string

export interface UnitSnapshot {
  id: UnitId
  side: Side
  creature: string
  name: string
  element: Element
  position: Position
  maxLifeforce: number
  maxEssence: number
  lifeforce: number
  essence: number
  boss: boolean
  hasAscension: boolean
}

export type BattleEvent =
  | { type: 'battleStarted'; units: UnitSnapshot[] }
  | { type: 'turnStarted'; turn: number; actor: UnitId; essence: number; upcoming: UnitId[] }
  | { type: 'statusTicked'; unit: UnitId; status: StatusId; amount: number; heal: boolean; lifeforce: number }
  | { type: 'statusExpired'; unit: UnitId; status: StatusId }
  | { type: 'turnLost'; unit: UnitId; status: StatusId }
  | {
      type: 'actionChosen'
      actor: UnitId
      skill: string
      skillName: string
      /** Index into the actor's Tactics, or null for the Basic Attack fallback or an Ascension. */
      tactic: number | null
      condition: Condition | null
      ascension: boolean
      targets: UnitId[]
      essence: number
    }
  | { type: 'damageDealt'; source: UnitId; target: UnitId; amount: number; weakness: boolean; lifeforce: number }
  | { type: 'healed'; source: UnitId; target: UnitId; amount: number; lifeforce: number }
  | { type: 'statusApplied'; target: UnitId; status: StatusId; turns: number }
  | { type: 'ascensionGauge'; unit: UnitId; value: number }
  | { type: 'phaseShift'; unit: UnitId }
  | { type: 'surge'; turn: number }
  | { type: 'lastStand'; unit: UnitId }
  /** A Vow on this creature fired (shown as a banner). */
  | { type: 'vowTriggered'; unit: UnitId; vow: string }
  | { type: 'defeated'; unit: UnitId }
  | { type: 'revived'; source: UnitId; target: UnitId; lifeforce: number }
  | { type: 'battleEnded'; winner: Side | 'draw'; turns: number }

export interface BattleResult {
  winner: Side | 'draw'
  turns: number
  events: BattleEvent[]
}
