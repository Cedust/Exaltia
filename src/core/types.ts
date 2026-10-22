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

export type StatusId = 'burn'

/** Single: one unit. Pierce: front and back of one Lane. Sweep: one whole Row. All: whole side. */
export type TargetPattern = 'single' | 'pierce' | 'sweep' | 'all'

export interface SkillDef {
  id: string
  name: string
  element: Element
  effect: 'damage' | 'heal'
  /** Attacking stat. Might is defended by Guard, Resonance by Ward. Heals always scale with Resonance. */
  stat: 'might' | 'resonance'
  power: number
  cost: number
  pattern: TargetPattern
  /** Can pick Back Row targets even while the Front Row is occupied. */
  ignoresProtection?: boolean
  inflicts?: { status: StatusId; chance: number; turns: number }
}

export interface CreatureDef {
  id: string
  name: string
  kind: 'paragon' | 'acolyte'
  element: Element
  role: string
  stats: Stats
  skills: string[]
  /** Free fallback skill when no Tactic matches. */
  basicAttack: string
}

export type Condition =
  | { type: 'always' }
  | { type: 'enemyWeakTo'; element: Element }
  | { type: 'allyLifeforceBelow'; percent: number }
  | { type: 'selfLifeforceBelow'; percent: number }
  | { type: 'selfEssenceAtLeast'; amount: number }
  | { type: 'enemyWithoutStatus'; status: StatusId }
  | { type: 'enemyHasStatus'; status: StatusId }
  | { type: 'enemiesAtLeast'; count: number }

export type TargetPriority =
  | 'lowestLifeforce'
  | 'highestLifeforce'
  | 'highestMight'
  | 'highestResonance'
  | 'weakToSkill'
  | 'sameLane'
  | 'self'

export interface Tactic {
  condition: Condition
  skill: string
  target: TargetPriority
}

export interface TeamMember {
  creature: string
  position: Position
  tactics: Tactic[]
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
}

export type BattleEvent =
  | { type: 'battleStarted'; units: UnitSnapshot[] }
  | { type: 'turnStarted'; turn: number; actor: UnitId; essence: number; upcoming: UnitId[] }
  | { type: 'statusTicked'; unit: UnitId; status: StatusId; amount: number; lifeforce: number }
  | { type: 'statusExpired'; unit: UnitId; status: StatusId }
  | {
      type: 'actionChosen'
      actor: UnitId
      skill: string
      skillName: string
      /** Index into the actor's Tactics, or null for the Basic Attack fallback. */
      tactic: number | null
      condition: Condition | null
      targets: UnitId[]
      essence: number
    }
  | { type: 'damageDealt'; source: UnitId; target: UnitId; amount: number; weakness: boolean; lifeforce: number }
  | { type: 'healed'; source: UnitId; target: UnitId; amount: number; lifeforce: number }
  | { type: 'statusApplied'; target: UnitId; status: StatusId; turns: number }
  | { type: 'defeated'; unit: UnitId }
  | { type: 'battleEnded'; winner: Side | 'draw'; turns: number }

export interface BattleResult {
  winner: Side | 'draw'
  turns: number
  events: BattleEvent[]
}
