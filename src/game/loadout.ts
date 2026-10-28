import type { CreatureDef, Loadout, Passive, SkillDef, Stats } from '../core/types'
import { CONTENT } from '../data'
import { CAPSTONE_COST, NODE_COST, SKILL_TREES, capstoneId, nodeId, type SkillTree } from '../data/skillTrees'
import {
  ACOLYTE_GROWTH_PER_TOURNAMENT,
  ATTUNEMENT_BONUS,
  BOSS,
  ENEMY_GROWTH_PER_TIER,
  ENEMY_SWIFTNESS_PER_TIER,
  OATH_PER_SHARD,
  OATH_PRIMARY,
  SHARDS_PER_RANK,
  awakeningOf,
  masteryOf,
  roleGroup,
} from './rules'
import type { OwnedCreature } from './save'

const GROWING: (keyof Stats)[] = ['lifeforce', 'might', 'resonance', 'guard', 'ward']

export function multiplyStats(stats: Stats, factor: Partial<Record<keyof Stats, number>>): Stats {
  const out = { ...stats }
  for (const key of Object.keys(factor) as (keyof Stats)[]) out[key] = Math.round(out[key] * factor[key]!)
  return out
}

const uniform = (factor: number, keys = GROWING) => Object.fromEntries(keys.map((k) => [k, factor])) as Partial<Record<keyof Stats, number>>

// ── Skill Tree ──

export interface TreeState {
  points: number
  spent: number
  available: number
}

export function treeState(owned: OwnedCreature): TreeState {
  const points = awakeningOf(owned.xp)
  const spent = owned.tree.reduce((sum, id) => sum + (id.endsWith('.cap') ? CAPSTONE_COST : NODE_COST), 0)
  return { points, spent, available: points - spent }
}

/** A node can be bought when the previous node of its Path is owned and enough points are left. */
export function canBuy(owned: OwnedCreature, id: string): boolean {
  if (owned.tree.includes(id)) return false
  const [, pathIndex, node] = id.split('.')
  const cost = node === 'cap' ? CAPSTONE_COST : NODE_COST
  if (treeState(owned).available < cost) return false
  const previous = node === 'cap' ? nodeId(owned.id, Number(pathIndex), 3) : Number(node) > 0 ? nodeId(owned.id, Number(pathIndex), Number(node) - 1) : null
  return !previous || owned.tree.includes(previous)
}

interface TreeEffects {
  skills: string[]
  statPercent: Partial<Record<keyof Stats, number>>
  passives: Passive[]
  ascensionPatch: Partial<SkillDef>
}

function treeEffects(owned: OwnedCreature, tree: SkillTree | undefined): TreeEffects {
  const effects: TreeEffects = { skills: [], statPercent: {}, passives: [], ascensionPatch: {} }
  if (!tree) return effects
  tree.forEach((path, p) => {
    path.nodes.forEach((node, n) => {
      if (!owned.tree.includes(nodeId(owned.id, p, n))) return
      if (node.kind === 'skill') effects.skills.push(node.skill)
      if (node.kind === 'stat') effects.statPercent[node.stat] = (effects.statPercent[node.stat] ?? 0) + node.percent
      if (node.kind === 'passive') effects.passives.push(node.passive)
    })
    if (owned.tree.includes(capstoneId(owned.id, p))) Object.assign(effects.ascensionPatch, path.capstone.patch)
  })
  return effects
}

// ── Mastery ──

export function masteredSkill(skill: SkillDef, uses: number): SkillDef {
  const stars = masteryOf(uses)
  if (stars <= 1) return skill
  const powerFactor = stars >= 5 ? 1.3 : stars >= 4 ? 1.2 : 1.1
  const out: SkillDef = { ...skill, power: Math.round(skill.power * powerFactor * 100) / 100 }
  if (stars >= 3) out.cost = Math.round(skill.cost * 0.8)
  if (stars >= 5 && skill.inflicts) {
    out.inflicts = { ...skill.inflicts, chance: Math.min(1, skill.inflicts.chance + 0.25), turns: skill.inflicts.turns + 1 }
  }
  return out
}

// ── Oath Rank ──

export const oathRank = (owned: OwnedCreature) => Math.floor(owned.oath / SHARDS_PER_RANK)

export function oathFactors(creature: CreatureDef, owned: OwnedCreature): Partial<Record<keyof Stats, number>> {
  const primary = OATH_PRIMARY[roleGroup(creature.role)]
  const factors: Partial<Record<keyof Stats, number>> = {}
  for (const key of GROWING) {
    factors[key] = 1 + owned.oath * (primary.includes(key) ? OATH_PER_SHARD.primary : OATH_PER_SHARD.secondary)
  }
  factors.swiftness = 1 + owned.oath * OATH_PER_SHARD.swiftness
  const rank = oathRank(owned)
  owned.attunements.slice(0, rank >= 4 ? 2 : rank >= 2 ? 1 : 0).forEach((choice) => {
    for (const key of choice === 'offense' ? (['might', 'resonance'] as const) : (['guard', 'ward'] as const)) {
      factors[key] = factors[key]! + ATTUNEMENT_BONUS
    }
  })
  return factors
}

function oathPassives(owned: OwnedCreature): Passive[] {
  const rank = oathRank(owned)
  const passives: Passive[] = []
  if (rank >= 1) passives.push({ type: 'startEssence', amount: 10 })
  if (rank >= 3) passives.push({ type: 'elementPower', percent: 10 })
  if (rank >= 5) passives.push({ type: 'ascensionGain', percent: 25 })
  return passives
}

// ── Loadouts ──

/** What a Paragon or Acolyte of the player brings into battle. */
export function playerLoadout(owned: OwnedCreature, tournamentsWon: number): Loadout {
  const creature = CONTENT.creatures[owned.id]
  if (creature.kind === 'acolyte') {
    return { stats: multiplyStats(creature.stats, uniform(1 + ACOLYTE_GROWTH_PER_TOURNAMENT * tournamentsWon)) }
  }
  const tree = treeEffects(owned, SKILL_TREES[owned.id])
  const factors = oathFactors(creature, owned)
  for (const [key, percent] of Object.entries(tree.statPercent) as [keyof Stats, number][]) {
    factors[key] = (factors[key] ?? 1) + percent / 100
  }
  const skills = [...creature.skills, ...tree.skills]
  const skillDefs: Record<string, SkillDef> = {}
  for (const id of skills) skillDefs[id] = masteredSkill(CONTENT.skills[id], owned.mastery[id] ?? 0)
  if (creature.ascension) skillDefs[creature.ascension] = { ...CONTENT.skills[creature.ascension], ...tree.ascensionPatch }
  return {
    stats: multiplyStats(creature.stats, factors),
    skills,
    skillDefs,
    passives: [...tree.passives, ...oathPassives(owned)],
  }
}

/** Skills an enemy Paragon knows at a tier: its Signature plus Path skills, more the stronger the world gets. */
export function enemyParagonSkills(id: string, tier: number, boss: boolean): string[] {
  const creature = CONTENT.creatures[id]
  const tree = SKILL_TREES[id]
  if (!tree) return creature.skills
  const pathSkills: string[] = []
  for (const n of [0, 2]) {
    for (const path of tree) {
      const node = path.nodes[n]
      if (node.kind === 'skill') pathSkills.push(node.skill)
    }
  }
  const count = Math.min(pathSkills.length, (boss ? 2 : 1) + Math.floor(tier / 2))
  return [...creature.skills, ...pathSkills.slice(0, count)]
}

export interface EnemyOptions {
  tier: number
  boss?: boolean
  teamSize: number
  /** Extra Lifeforce for mirror fights (Cassian). */
  lifeforceFactor?: number
}

export function enemyLoadout(id: string, options: EnemyOptions): Loadout {
  const creature = CONTENT.creatures[id]
  const growth = 1 + ENEMY_GROWTH_PER_TIER * options.tier
  const factors: Partial<Record<keyof Stats, number>> = { ...uniform(growth), swiftness: 1 + ENEMY_SWIFTNESS_PER_TIER * options.tier }
  if (options.boss) {
    const attributes = Math.min(BOSS.attributeMax, BOSS.attributeBase + BOSS.attributePerTier * options.tier)
    for (const key of GROWING) factors[key] = factors[key]! * attributes
    factors.lifeforce =
      growth * (BOSS.lifeforceBase + BOSS.lifeforcePerTier * options.tier + BOSS.lifeforcePerExtraMember * Math.max(0, options.teamSize - 2))
  }
  if (options.lifeforceFactor) factors.lifeforce = factors.lifeforce! * options.lifeforceFactor
  const loadout: Loadout = { stats: multiplyStats(creature.stats, factors) }
  if (creature.kind === 'paragon') {
    loadout.skills = enemyParagonSkills(id, options.tier, !!options.boss)
    const passives: Passive[] = []
    if (options.tier >= 3) passives.push({ type: 'elementPower', percent: 10 })
    if (options.tier >= 6) passives.push({ type: 'startEssence', amount: 10 })
    loadout.passives = passives
  }
  return loadout
}
