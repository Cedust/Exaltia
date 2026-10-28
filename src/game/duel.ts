import { createRng, type Rng } from '../core/rng'
import type { Position, Row, Side, SkillDef, StatusId, Team, TeamMember } from '../core/types'
import { CONTENT } from '../data'
import { autoPlan } from './autoPlan'
import { enemyLoadout } from './loadout'
import { CONDITION_UNLOCKS, STARTING_CONDITIONS } from './rules'
import { RARITY_RANK, RARITY_WEIGHT, VOWS, VOW_BY_ID, type Rarity, type VowContext, type VowDef, type VowMember } from './vows'

/**
 * Vow Duels prototype: a best-of-X match of short auto fights. Teams are locked before the match; before every
 * round both sides swear one Vow. The opponent always picks and reveals first.
 */

export const DUEL_TEAM_SIZE = 3
const TACTIC_SLOTS = 4
/** Duels hit harder than campaign battles, so a round lasts about 30-45 seconds. */
export const DUEL_DAMAGE_BONUS = 80
const ALL_CONDITIONS = [...STARTING_CONDITIONS, ...CONDITION_UNLOCKS]

/** Creatures the player may bring to the prototype. */
export const DUEL_POOL = ['basaltor', 'pyrelle', 'kyrael', 'nivaris', 'fenric', 'maressa', 'spire-golem', 'spire-mender']
/** World strength used for both sides (like the third Tournament of a journey). */
export const PLAYER_TIER = 2

export interface DuelOpponent {
  id: string
  name: string
  theme: string
  description: string
  backdrop: string
  tier: number
  members: { creature: string; row: Row }[]
  /** Vows this opponent likes to swear. */
  prefers: string[]
}

export const DUEL_OPPONENTS: DuelOpponent[] = [
  {
    id: 'ashen-twins',
    name: 'The Ashen Twins',
    theme: 'Burn and Bargains',
    description: 'Two fire scholars and their knight. They set everything ablaze and gladly pay in blood for more power.',
    backdrop: 'fire',
    tier: 7,
    members: [
      { creature: 'cinder-knight', row: 'front' },
      { creature: 'ember-sage', row: 'back' },
      { creature: 'ember-sage', row: 'back' },
    ],
    prefers: ['kindling', 'lingering-wound', 'ember-covenant', 'blood-price', 'wildfire', 'glass-vanguard'],
  },
  {
    id: 'huntress-sigrun',
    name: 'Huntress Sigrun',
    theme: 'Chill and Endurance',
    description: 'A hunter of the Frostmere. Her pack is slow to fall and slows you down until you cannot run.',
    backdrop: 'ice',
    tier: 5,
    members: [
      { creature: 'frostguard', row: 'front' },
      { creature: 'duskblade', row: 'front' },
      { creature: 'rime-mystic', row: 'back' },
    ],
    prefers: ['frostbite', 'stoneskin', 'vigil', 'anchor', 'last-breath', 'undying-oath'],
  },
  {
    id: 'stormcrew',
    name: "Captain Brannoc's Stormcrew",
    theme: 'Speed and Strikes',
    description: 'Sky-sailors who hit first and hit hard. If they win the first exchange, they rarely lose the round.',
    backdrop: 'thunder',
    tier: 4,
    members: [
      { creature: 'spark-monk', row: 'front' },
      { creature: 'gale-dancer', row: 'front' },
      { creature: 'storm-chanter', row: 'back' },
    ],
    prefers: ['quickened-step', 'opening-gambit', 'split-the-flame', 'avenger', 'keen-edge', 'shatter-ward'],
  },
]

export const OPPONENT_BY_ID: Record<string, DuelOpponent> = Object.fromEntries(DUEL_OPPONENTS.map((o) => [o.id, o]))

// ── Teams ──

/** A creature as the match locks it: which creature and the row it stands in this round. */
export interface DuelSlot {
  creature: string
  row: Row
}

/** Lanes are filled from the middle out, so a row of up to three always looks tidy. */
export function positions(slots: DuelSlot[]): Position[] {
  const order: (0 | 1 | 2)[] = [1, 0, 2]
  const used: Record<Row, number> = { front: 0, back: 0 }
  return slots.map((s) => ({ lane: order[used[s.row]++], row: s.row }))
}

export const rowFull = (slots: DuelSlot[], row: Row, except = -1) => slots.filter((s, i) => i !== except && s.row === row).length >= 3

export const defaultRow = (id: string): Row => (/Front|Guardian|Striker|Bulwark|Brawler/.test(CONTENT.creatures[id].role) ? 'front' : 'back')

/** A sworn Vow: which one and, for creature Vows, which team member (by index) carries it. */
export interface SwornVow {
  vow: string
  target?: number
}

function baseMember(slot: DuelSlot, tier: number): VowMember {
  const creature = CONTENT.creatures[slot.creature]
  const loadout = enemyLoadout(slot.creature, { tier, teamSize: DUEL_TEAM_SIZE })
  const ids = [...(loadout.skills ?? creature.skills), creature.basicAttack, ...(creature.ascension ? [creature.ascension] : [])]
  return {
    creature,
    row: slot.row,
    stats: { ...loadout.stats! },
    passives: [...(loadout.passives ?? []), { type: 'damageDealt', percent: DUEL_DAMAGE_BONUS }],
    skillDefs: Object.fromEntries(ids.map((id) => [id, CONTENT.skills[id]])),
  }
}

/** Members that would receive a Vow sworn on `target` (creature Vows: one, team Vows: all, front: the Front Row). */
function receivers(vow: VowDef, members: VowMember[], target?: number): VowMember[] {
  if (vow.scope === 'team') return members
  if (vow.scope === 'front') return members.filter((m) => m.row === 'front')
  return target === undefined ? [] : [members[target]]
}

/** The team for one round: base strength, then every sworn Vow in order, then the role behaviour (auto plan). */
export function buildTeam(slots: DuelSlot[], vows: SwornVow[], tier: number): Team {
  const members = slots.map((s) => baseMember(s, tier))
  for (const sworn of vows) {
    const vow = VOW_BY_ID[sworn.vow]
    for (const m of receivers(vow, members, sworn.target)) vow.apply(m)
  }
  const places = positions(slots)
  return {
    members: members.map((m, i): TeamMember => {
      const usable = Object.keys(m.skillDefs).filter((id) => id !== m.creature.basicAttack && id !== m.creature.ascension)
      const skills = usable.map((id) => m.skillDefs[id])
      return {
        creature: m.creature.id,
        position: places[i],
        tactics: autoPlan(skills, TACTIC_SLOTS, ALL_CONDITIONS),
        loadout: { stats: m.stats, skills: usable, skillDefs: m.skillDefs, passives: m.passives },
      }
    }),
  }
}

// ── Offers ──

const contextOf = (slots: DuelSlot[], vows: SwornVow[]): VowContext => ({
  creatures: slots.map((s) => CONTENT.creatures[s.creature]),
  vows: vows.map((v) => v.vow),
})

/** Team members (by index) that may still carry this creature Vow. */
export function eligibleTargets(vow: VowDef, slots: DuelSlot[], vows: SwornVow[], tier: number): number[] {
  if (vow.scope !== 'creature') return []
  const members = slots.map((s) => baseMember(s, tier))
  return members
    .map((m, i) => ({ m, i }))
    .filter(({ m, i }) => (!vow.canTarget || vow.canTarget(m)) && !vows.some((v) => v.vow === vow.id && v.target === i))
    .map(({ i }) => i)
}

function available(vow: VowDef, slots: DuelSlot[], vows: SwornVow[], tier: number, opponentVows: SwornVow[]): boolean {
  if (vow.requires && !vow.requires(contextOf(slots, vows))) return false
  if (vow.id === 'mirror-oath') {
    const last = opponentVows[opponentVows.length - 1]
    if (!last || last.vow === 'mirror-oath') return false
    return available(VOW_BY_ID[last.vow], slots, vows, tier, [])
  }
  if (vow.scope !== 'creature') return !vows.some((v) => v.vow === vow.id)
  return eligibleTargets(vow, slots, vows, tier).length > 0
}

export interface OfferRules {
  count: number
  /** At least one offer is of this rarity or better. */
  atLeast?: Rarity
}

function weighted<T>(items: T[], weight: (item: T) => number, rng: Rng): T {
  const total = items.reduce((sum, item) => sum + weight(item), 0)
  let roll = rng() * total
  for (const item of items) {
    roll -= weight(item)
    if (roll <= 0) return item
  }
  return items[items.length - 1]
}

/** Draws distinct Vows for an offer. Covenants show up more often once their combo is in reach. */
export function makeOffer(rules: OfferRules, slots: DuelSlot[], vows: SwornVow[], opponentVows: SwornVow[], tier: number, rng: Rng, allowMirror: boolean): string[] {
  const pool = VOWS.filter((v) => (allowMirror || v.id !== 'mirror-oath') && available(v, slots, vows, tier, opponentVows))
  const weight = (v: VowDef) => (v.kind === 'covenant' ? 25 : RARITY_WEIGHT[v.rarity])
  const offer: VowDef[] = []
  while (offer.length < rules.count) {
    const rest = pool.filter((v) => !offer.includes(v))
    if (rest.length === 0) break
    offer.push(weighted(rest, weight, rng))
  }
  if (rules.atLeast && !offer.some((v) => RARITY_RANK[v.rarity] >= RARITY_RANK[rules.atLeast!])) {
    const better = pool.filter((v) => !offer.includes(v) && RARITY_RANK[v.rarity] >= RARITY_RANK[rules.atLeast!])
    if (better.length > 0) offer[offer.length - 1] = weighted(better, weight, rng)
  }
  return offer.map((v) => v.id)
}

// ── CPU choice ──

/** Statuses a team can inflict on its opponents, plus Barrier and Taunt if it uses them. */
function threats(slots: DuelSlot[]): Set<StatusId> {
  const out = new Set<StatusId>()
  for (const s of slots) {
    const creature = CONTENT.creatures[s.creature]
    for (const id of [...creature.skills, ...(creature.ascension ? [creature.ascension] : [])]) {
      const skill = CONTENT.skills[id]
      if (skill.inflicts) out.add(skill.inflicts.status)
      if (skill.selfStatus) out.add(skill.selfStatus.status)
    }
  }
  return out
}

const attackOf = (m: VowMember) => Math.max(m.stats.might, m.stats.resonance)
const healer = (m: VowMember) => Object.values(m.skillDefs).some((s: SkillDef) => s.effect === 'heal')

/** Who the CPU (and Auto-pick) puts a creature Vow on. */
export function aimTarget(vow: VowDef, slots: DuelSlot[], vows: SwornVow[], tier: number): number | undefined {
  const options = eligibleTargets(vow, slots, vows, tier)
  if (options.length === 0) return undefined
  const members = slots.map((s) => baseMember(s, tier))
  const score = (i: number) => {
    const m = members[i]
    switch (vow.aim) {
      case 'tank':
        return (m.row === 'front' ? 10_000 : 0) + m.stats.lifeforce
      case 'support':
        return (healer(m) ? 10_000 : 0) + m.stats.resonance
      case 'paragon':
        return (m.creature.kind === 'paragon' ? 10_000 : 0) + attackOf(m)
      default:
        return (m.creature.kind === 'paragon' ? 50 : 0) + attackOf(m) + (healer(m) ? -40 : 0)
    }
  }
  return [...options].sort((a, b) => score(b) - score(a))[0]
}

/** The CPU's pick from an offer: rarity first, then its theme, then answers to what the opponent inflicts. */
export function chooseVow(offer: string[], prefers: string[], opponentSlots: DuelSlot[]): string {
  const danger = threats(opponentSlots)
  const value = (id: string) => {
    const vow = VOW_BY_ID[id]
    let v = RARITY_RANK[vow.rarity] * 3
    if (prefers.includes(id)) v += 4
    if (vow.counters?.some((s) => danger.has(s))) v += 3
    if (vow.kind === 'covenant') v += 2
    if (id === 'mirror-oath') v -= 2
    return v
  }
  return [...offer].sort((a, b) => value(b) - value(a))[0]
}

// ── Match ──

export interface DuelMatch {
  opponent: string
  bestOf: number
  seed: number
  player: DuelSlot[]
  enemy: DuelSlot[]
  vows: Record<Side, SwornVow[]>
  wins: Record<Side, number>
  /** Winner of each round played so far. */
  rounds: (Side | 'draw')[]
  rerollsLeft: number
  /** How often the player rerolled this round (changes the offer seed). */
  rerolls: number
}

export const winsNeeded = (match: DuelMatch) => Math.ceil(match.bestOf / 2)
export const roundNumber = (match: DuelMatch) => match.rounds.length + 1

export function matchWinner(match: DuelMatch): Side | null {
  if (match.wins.player >= winsNeeded(match)) return 'player'
  if (match.wins.enemy >= winsNeeded(match)) return 'enemy'
  return null
}

export function newMatch(opponentId: string, player: DuelSlot[], seed: number, bestOf = 5): DuelMatch {
  const opponent = OPPONENT_BY_ID[opponentId]
  return {
    opponent: opponentId,
    bestOf,
    seed,
    player,
    enemy: opponent.members.map((m) => ({ ...m })),
    vows: { player: [], enemy: [] },
    wins: { player: 0, enemy: 0 },
    rounds: [],
    rerollsLeft: 1,
    rerolls: 0,
  }
}

/** Offer rules for one side this round: the last round's loser sees 4 Vows, a side at match point gets an Exalted. */
export function offerRules(match: DuelMatch, side: Side): OfferRules {
  const other: Side = side === 'player' ? 'enemy' : 'player'
  const last = match.rounds[match.rounds.length - 1]
  const lostLast = last === other
  const atMatchPoint = match.wins[other] === winsNeeded(match) - 1
  return { count: lostLast ? 4 : 3, atLeast: atMatchPoint ? 'exalted' : lostLast ? 'rare' : undefined }
}

const tierOf = (match: DuelMatch, side: Side) => (side === 'player' ? PLAYER_TIER : OPPONENT_BY_ID[match.opponent].tier)

const offerRng = (match: DuelMatch, side: Side) => createRng(match.seed + roundNumber(match) * 7919 + (side === 'enemy' ? 104_729 : match.rerolls * 613))

export function offerFor(match: DuelMatch, side: Side): string[] {
  const other: Side = side === 'player' ? 'enemy' : 'player'
  const slots = side === 'player' ? match.player : match.enemy
  return makeOffer(offerRules(match, side), slots, match.vows[side], match.vows[other], tierOf(match, side), offerRng(match, side), side === 'player')
}

/** Turns a pick into a sworn Vow; Mirror Oath becomes a copy of the opponent's last Vow. */
export function resolveVow(match: DuelMatch, side: Side, vowId: string, target?: number): SwornVow {
  const other: Side = side === 'player' ? 'enemy' : 'player'
  const id = vowId === 'mirror-oath' ? match.vows[other][match.vows[other].length - 1].vow : vowId
  const vow = VOW_BY_ID[id]
  if (vow.scope !== 'creature') return { vow: id }
  const slots = side === 'player' ? match.player : match.enemy
  const options = eligibleTargets(vow, slots, match.vows[side], tierOf(match, side))
  const chosen = target !== undefined && options.includes(target) ? target : aimTarget(vow, slots, match.vows[side], tierOf(match, side))
  return { vow: id, target: chosen }
}

export const swear = (match: DuelMatch, side: Side, sworn: SwornVow): DuelMatch => ({
  ...match,
  vows: { ...match.vows, [side]: [...match.vows[side], sworn] },
})

/** The opponent's turn at the start of a round: it picks from its own offer and reveals the Vow. */
export function enemySwears(match: DuelMatch): DuelMatch {
  const opponent = OPPONENT_BY_ID[match.opponent]
  const offer = offerFor(match, 'enemy')
  if (offer.length === 0) return match
  const pick = chooseVow(offer, opponent.prefers, match.player)
  return swear(match, 'enemy', resolveVow(match, 'enemy', pick))
}

/** Auto-pick for the player: the same rule the CPU uses, without a theme. */
export function autoPick(match: DuelMatch, offer: string[]): SwornVow {
  const pick = chooseVow(offer, [], match.enemy)
  return resolveVow(match, 'player', pick)
}

export function roundTeams(match: DuelMatch): { player: Team; enemy: Team } {
  return {
    player: buildTeam(match.player, match.vows.player, PLAYER_TIER),
    enemy: buildTeam(match.enemy, match.vows.enemy, OPPONENT_BY_ID[match.opponent].tier),
  }
}

export const roundSeed = (match: DuelMatch) => match.seed * 31 + roundNumber(match)

export function recordRound(match: DuelMatch, winner: Side | 'draw'): DuelMatch {
  const wins = { ...match.wins }
  if (winner !== 'draw') wins[winner]++
  return { ...match, wins, rounds: [...match.rounds, winner], rerolls: 0 }
}

/** Describes who carries a sworn Vow, e.g. "Ember Sage" or "Front Row". */
export function carrierName(sworn: SwornVow, slots: DuelSlot[]): string {
  const vow = VOW_BY_ID[sworn.vow]
  if (vow.scope === 'team') return 'Team'
  if (vow.scope === 'front') return 'Front Row'
  return sworn.target === undefined ? '' : CONTENT.creatures[slots[sworn.target].creature].name
}
