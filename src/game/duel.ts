import { createRng, type Rng } from '../core/rng'
import type { BattleResult, Loadout, Position, Row, Side, SkillDef, StatusId, Team, TeamMember } from '../core/types'
import { CONTENT } from '../data'
import { autoPlan } from './autoPlan'
import { ALL_CONDITIONS } from './rules'
import { RARITY_RANK, RARITY_WEIGHT, VOWS, VOW_BY_ID, type Rarity, type VowContext, type VowDef, type VowMember } from './vows'

/**
 * Vow Duels: every battle is a best-of-X match of short auto fights. Teams are locked before the match; before
 * every round both sides swear one Vow. The opponent always picks and reveals first.
 */

/** Role behaviour is automatic: every creature gets an auto plan of this size. */
const PLAN_SLOTS = 4
/** Duels hit harder than the old long battles, so a round lasts about 30-45 seconds. */
export const DUEL_DAMAGE_BONUS = 80
export const MAX_PER_ROW = 3

// ── Teams ──

/** A creature as the match locks it: which creature and the row it stands in this round. */
export interface DuelSlot {
  creature: string
  row: Row
}

/** A team member of a match: its slot plus the strength it brings (player progress or enemy tier). */
export interface MatchMember extends DuelSlot {
  loadout: Loadout
  boss?: boolean
}

/** Lanes are filled from the middle out, so a row of up to three always looks tidy. */
export function positions(slots: DuelSlot[]): Position[] {
  const order: (0 | 1 | 2)[] = [1, 0, 2]
  const used: Record<Row, number> = { front: 0, back: 0 }
  return slots.map((s) => ({ lane: order[used[s.row]++], row: s.row }))
}

export const rowFull = (slots: DuelSlot[], row: Row, except = -1) => slots.filter((s, i) => i !== except && s.row === row).length >= MAX_PER_ROW

export const isFrontLiner = (id: string) => /^Front|Guardian|Striker|Bulwark|Brawler/.test(CONTENT.creatures[id].role)
export const defaultRow = (id: string): Row => (isFrontLiner(id) ? 'front' : 'back')

/** A sworn Vow: which one and, for creature Vows, which team member (by index) carries it. */
export interface SwornVow {
  vow: string
  target?: number
}

function baseMember(member: MatchMember): VowMember {
  const creature = CONTENT.creatures[member.creature]
  const { loadout } = member
  const ids = [...(loadout.skills ?? creature.skills), creature.basicAttack, ...(creature.ascension ? [creature.ascension] : [])]
  return {
    creature,
    row: member.row,
    stats: { ...(loadout.stats ?? creature.stats) },
    passives: [...(loadout.passives ?? []), { type: 'damageDealt', percent: DUEL_DAMAGE_BONUS }],
    skillDefs: Object.fromEntries(ids.map((id) => [id, loadout.skillDefs?.[id] ?? CONTENT.skills[id]])),
  }
}

/** Members that would receive a Vow sworn on `target` (creature Vows: one, team Vows: all, front: the Front Row). */
function receivers(vow: VowDef, members: VowMember[], target?: number): VowMember[] {
  if (vow.scope === 'team') return members
  if (vow.scope === 'front') return members.filter((m) => m.row === 'front')
  return target === undefined ? [] : [members[target]]
}

/** The team for one round: base strength, then every sworn Vow in order, then the role behaviour (auto plan). */
export function buildTeam(team: MatchMember[], vows: SwornVow[]): Team {
  const members = team.map(baseMember)
  for (const sworn of vows) {
    const vow = VOW_BY_ID[sworn.vow]
    for (const m of receivers(vow, members, sworn.target)) vow.apply(m)
  }
  const places = positions(team)
  return {
    members: members.map((m, i): TeamMember => {
      const usable = Object.keys(m.skillDefs).filter((id) => id !== m.creature.basicAttack && id !== m.creature.ascension)
      const skills = usable.map((id) => m.skillDefs[id])
      const boss = team[i].boss
      const member: TeamMember = {
        creature: m.creature.id,
        position: places[i],
        tactics: autoPlan(skills, boss ? PLAN_SLOTS - 1 : PLAN_SLOTS, ALL_CONDITIONS),
        loadout: { stats: m.stats, skills: usable, skillDefs: m.skillDefs, passives: m.passives },
      }
      if (boss) member.boss = { phase2: autoPlan(skills, PLAN_SLOTS + 1, ALL_CONDITIONS) }
      return member
    }),
  }
}

// ── Offers ──

const contextOf = (team: MatchMember[], vows: SwornVow[]): VowContext => ({
  creatures: team.map((s) => CONTENT.creatures[s.creature]),
  vows: vows.map((v) => v.vow),
})

/** Team members (by index) that may still carry this creature Vow. */
export function eligibleTargets(vow: VowDef, team: MatchMember[], vows: SwornVow[]): number[] {
  if (vow.scope !== 'creature') return []
  return team
    .map((m, i) => ({ m: baseMember(m), i }))
    .filter(({ m, i }) => (!vow.canTarget || vow.canTarget(m)) && !vows.some((v) => v.vow === vow.id && v.target === i))
    .map(({ i }) => i)
}

function available(vow: VowDef, team: MatchMember[], vows: SwornVow[], opponentVows: SwornVow[]): boolean {
  if (vow.requires && !vow.requires(contextOf(team, vows))) return false
  if (vow.id === 'mirror-oath') {
    const last = opponentVows[opponentVows.length - 1]
    if (!last || last.vow === 'mirror-oath') return false
    return available(VOW_BY_ID[last.vow], team, vows, [])
  }
  if (vow.scope !== 'creature') return !vows.some((v) => v.vow === vow.id)
  return eligibleTargets(vow, team, vows).length > 0
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

/** Draws distinct Vows from a pool. Covenants show up more often once their combo is in reach. */
export function makeOffer(rules: OfferRules, pool: string[], team: MatchMember[], vows: SwornVow[], opponentVows: SwornVow[], rng: Rng): string[] {
  const candidates = VOWS.filter((v) => pool.includes(v.id) && available(v, team, vows, opponentVows))
  const weight = (v: VowDef) => (v.kind === 'covenant' ? 25 : RARITY_WEIGHT[v.rarity])
  const offer: VowDef[] = []
  while (offer.length < rules.count) {
    const rest = candidates.filter((v) => !offer.includes(v))
    if (rest.length === 0) break
    offer.push(weighted(rest, weight, rng))
  }
  if (rules.atLeast && !offer.some((v) => RARITY_RANK[v.rarity] >= RARITY_RANK[rules.atLeast!])) {
    const better = candidates.filter((v) => !offer.includes(v) && RARITY_RANK[v.rarity] >= RARITY_RANK[rules.atLeast!])
    if (better.length > 0) offer[offer.length - 1] = weighted(better, weight, rng)
  }
  return offer.map((v) => v.id)
}

// ── CPU choice ──

/** Statuses a team can inflict on its opponents, plus Barrier and Taunt if it uses them. */
function threats(team: MatchMember[]): Set<StatusId> {
  const out = new Set<StatusId>()
  for (const s of team) {
    const creature = CONTENT.creatures[s.creature]
    for (const id of [...(s.loadout.skills ?? creature.skills), ...(creature.ascension ? [creature.ascension] : [])]) {
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
export function aimTarget(vow: VowDef, team: MatchMember[], vows: SwornVow[]): number | undefined {
  const options = eligibleTargets(vow, team, vows)
  if (options.length === 0) return undefined
  const members = team.map(baseMember)
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
export function chooseVow(offer: string[], prefers: string[], opponent: MatchMember[]): string {
  const danger = threats(opponent)
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
  /** Encounter name, e.g. "Dawnreach Tournament · Final". */
  name: string
  /** Who the player faces, shown on the score. */
  opponent: string
  backdrop: string
  bestOf: number
  seed: number
  player: MatchMember[]
  enemy: MatchMember[]
  /** Vows each side may be offered. */
  pools: Record<Side, string[]>
  /** Vows the opponent likes to swear. */
  prefers: string[]
  vows: Record<Side, SwornVow[]>
  wins: Record<Side, number>
  /** Winner of each round played so far. */
  rounds: (Side | 'draw')[]
  rerollsLeft: number
  /** How often the player rerolled this round (changes the offer seed). */
  rerolls: number
}

export interface MatchSetup {
  name: string
  opponent: string
  backdrop: string
  bestOf: number
  seed: number
  player: MatchMember[]
  enemy: MatchMember[]
  playerPool: string[]
  enemyPool?: string[]
  prefers: string[]
  /** Vows the opponent already holds when the match begins (Boss Vows). */
  bossVows?: SwornVow[]
}

/** Draws after this many rounds no longer replay: the side with more wins takes the match, a tie goes to the opponent. */
const ROUND_LIMIT_EXTRA = 3

export const winsNeeded = (match: DuelMatch) => Math.ceil(match.bestOf / 2)
export const roundNumber = (match: DuelMatch) => match.rounds.length + 1

export function matchWinner(match: DuelMatch): Side | null {
  if (match.wins.player >= winsNeeded(match)) return 'player'
  if (match.wins.enemy >= winsNeeded(match)) return 'enemy'
  if (match.rounds.length >= match.bestOf + ROUND_LIMIT_EXTRA) return match.wins.player > match.wins.enemy ? 'player' : 'enemy'
  return null
}

export function newMatch(setup: MatchSetup): DuelMatch {
  return {
    name: setup.name,
    opponent: setup.opponent,
    backdrop: setup.backdrop,
    bestOf: setup.bestOf,
    seed: setup.seed,
    player: setup.player.map((m) => ({ ...m })),
    enemy: setup.enemy.map((m) => ({ ...m })),
    pools: { player: setup.playerPool, enemy: setup.enemyPool ?? VOWS.map((v) => v.id) },
    prefers: setup.prefers,
    vows: { player: [], enemy: [...(setup.bossVows ?? [])] },
    wins: { player: 0, enemy: 0 },
    rounds: [],
    rerollsLeft: 1,
    rerolls: 0,
  }
}

/**
 * Boss Vows: the opponent's favourite Vows it can carry, sworn before the match and shown when scouting.
 * Mirror Oath is left out because there is nothing to copy yet.
 */
export function pickBossVows(team: MatchMember[], prefers: string[], count: number): SwornVow[] {
  const sworn: SwornVow[] = []
  const order = [...prefers, ...[...VOWS].sort((a, b) => RARITY_RANK[b.rarity] - RARITY_RANK[a.rarity]).map((v) => v.id)]
  for (const id of order) {
    if (sworn.length >= count) break
    const vow = VOW_BY_ID[id]
    if (id === 'mirror-oath' || sworn.some((s) => s.vow === id) || !available(vow, team, sworn, [])) continue
    sworn.push(vow.scope === 'creature' ? { vow: id, target: aimTarget(vow, team, sworn) } : { vow: id })
  }
  return sworn
}

/** Offer rules for one side this round: the last round's loser sees 4 Vows, a side at match point gets an Exalted. */
export function offerRules(match: DuelMatch, side: Side): OfferRules {
  const other: Side = side === 'player' ? 'enemy' : 'player'
  const last = match.rounds[match.rounds.length - 1]
  const lostLast = last === other
  const atMatchPoint = match.wins[other] === winsNeeded(match) - 1
  return { count: lostLast ? 4 : 3, atLeast: atMatchPoint ? 'exalted' : lostLast ? 'rare' : undefined }
}

const offerRng = (match: DuelMatch, side: Side) => createRng(match.seed + roundNumber(match) * 7919 + (side === 'enemy' ? 104_729 : match.rerolls * 613))

export function offerFor(match: DuelMatch, side: Side): string[] {
  const other: Side = side === 'player' ? 'enemy' : 'player'
  // Mirror Oath is a player Vow: the CPU never copies.
  const pool = side === 'enemy' ? match.pools.enemy.filter((id) => id !== 'mirror-oath') : match.pools.player
  return makeOffer(offerRules(match, side), pool, match[side], match.vows[side], match.vows[other], offerRng(match, side))
}

/** Turns a pick into a sworn Vow; Mirror Oath becomes a copy of the opponent's last Vow. */
export function resolveVow(match: DuelMatch, side: Side, vowId: string, target?: number): SwornVow {
  const other: Side = side === 'player' ? 'enemy' : 'player'
  const id = vowId === 'mirror-oath' ? match.vows[other][match.vows[other].length - 1].vow : vowId
  const vow = VOW_BY_ID[id]
  if (vow.scope !== 'creature') return { vow: id }
  const options = eligibleTargets(vow, match[side], match.vows[side])
  const chosen = target !== undefined && options.includes(target) ? target : aimTarget(vow, match[side], match.vows[side])
  return { vow: id, target: chosen }
}

export const swear = (match: DuelMatch, side: Side, sworn: SwornVow): DuelMatch => ({
  ...match,
  vows: { ...match.vows, [side]: [...match.vows[side], sworn] },
})

/** The opponent's turn at the start of a round: it picks from its own offer and reveals the Vow. */
export function enemySwears(match: DuelMatch): DuelMatch {
  const offer = offerFor(match, 'enemy')
  if (offer.length === 0) return match
  const pick = chooseVow(offer, match.prefers, match.player)
  return swear(match, 'enemy', resolveVow(match, 'enemy', pick))
}

/** Auto-pick for the player: the same rule the CPU uses, without a theme. */
export function autoPick(match: DuelMatch, offer: string[]): SwornVow | null {
  if (offer.length === 0) return null
  return resolveVow(match, 'player', chooseVow(offer, [], match.enemy))
}

export function roundTeams(match: DuelMatch): { player: Team; enemy: Team } {
  return { player: buildTeam(match.player, match.vows.player), enemy: buildTeam(match.enemy, match.vows.enemy) }
}

export const roundSeed = (match: DuelMatch) => match.seed * 31 + roundNumber(match)

export function recordRound(match: DuelMatch, winner: Side | 'draw'): DuelMatch {
  const wins = { ...match.wins }
  if (winner !== 'draw') wins[winner]++
  return { ...match, wins, rounds: [...match.rounds, winner], rerolls: 0 }
}

/** Describes who carries a sworn Vow, e.g. "Ember Sage" or "Front Row". */
export function carrierName(sworn: SwornVow, team: DuelSlot[]): string {
  const vow = VOW_BY_ID[sworn.vow]
  if (vow.scope === 'team') return 'Team'
  if (vow.scope === 'front') return 'Front Row'
  return sworn.target === undefined ? '' : CONTENT.creatures[team[sworn.target].creature].name
}

/** Plays a whole match with Auto-pick for the player (tests and the balance tools). */
export function autoPlay(start: DuelMatch, run: (setup: { player: Team; enemy: Team; seed: number }) => BattleResult): { match: DuelMatch; results: BattleResult[] } {
  let match = start
  const results: BattleResult[] = []
  while (!matchWinner(match)) {
    match = enemySwears(match)
    const pick = autoPick(match, offerFor(match, 'player'))
    if (pick) match = swear(match, 'player', pick)
    const result = run({ ...roundTeams(match), seed: roundSeed(match) })
    results.push(result)
    match = recordRound(match, result.winner)
  }
  return { match, results }
}
