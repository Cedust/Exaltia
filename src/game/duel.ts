import { createUnits } from '../core/battle'
import { createRng, type Rng } from '../core/rng'
import { LANE_NAMES } from '../core/rules'
import { isProtected, selectTargets } from '../core/targeting'
import type { BattleResult, Lane, Loadout, Row, Side, SkillDef, StatusId, Team, TeamMember } from '../core/types'
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

// ── Teams ──

/** A creature as the match locks it: which creature and the cell (Lane and Row) it stands in this round. */
export interface DuelSlot {
  creature: string
  lane: Lane
  row: Row
}

/** A team member of a match: its slot plus the strength it brings (player progress or enemy tier). */
export interface MatchMember extends DuelSlot {
  loadout: Loadout
  boss?: boolean
}

export const LANES: Lane[] = [0, 1, 2]
export { LANE_NAMES }
/** New creatures fill a row from the middle out. */
const FILL_ORDER: Lane[] = [1, 0, 2]

export const occupant = <T extends DuelSlot>(slots: T[], lane: Lane, row: Row) => slots.findIndex((s) => s.lane === lane && s.row === row)

export const isFrontLiner = (id: string) => /^Front|Guardian|Striker|Bulwark|Brawler/.test(CONTENT.creatures[id].role)
export const defaultRow = (id: string): Row => (isFrontLiner(id) ? 'front' : 'back')

/** The cell a creature joins a formation in: its preferred row from the middle out, else the other row. */
export function placeFor(slots: DuelSlot[], id: string): { lane: Lane; row: Row } {
  const preferred = defaultRow(id)
  for (const row of [preferred, preferred === 'front' ? 'back' : 'front'] as Row[]) {
    const lane = FILL_ORDER.find((l) => occupant(slots, l, row) < 0)
    if (lane !== undefined) return { lane, row }
  }
  return { lane: 1, row: preferred }
}

/** Moves a creature to a cell; whoever stands there swaps into its old cell. */
export function moveTo<T extends DuelSlot>(slots: T[], index: number, lane: Lane, row: Row): T[] {
  const other = occupant(slots, lane, row)
  const from = slots[index]
  return slots.map((s, i) => (i === index ? { ...s, lane, row } : i === other ? { ...s, lane: from.lane, row: from.row } : s))
}

/** Gives every slot without a free Lane of its own (older saves) a free cell in its row, from the middle out. */
export function withLanes<T extends { row: Row; lane?: Lane }>(slots: T[]): (T & { lane: Lane })[] {
  const out: (T & { lane: Lane })[] = []
  const taken = (lane: Lane, row: Row) => out.some((o) => o.lane === lane && o.row === row)
  for (const s of slots) {
    if (s.lane !== undefined && !taken(s.lane, s.row)) {
      out.push(s as T & { lane: Lane })
      continue
    }
    const row: Row = FILL_ORDER.every((l) => taken(l, s.row)) ? (s.row === 'front' ? 'back' : 'front') : s.row
    out.push({ ...s, lane: FILL_ORDER.find((l) => !taken(l, row)) ?? 1, row })
  }
  return out
}

/** A Back creature is protected while a Front ally stands in its Lane (Phalanx: also the neighbouring Lanes). */
export function isGuarded(slots: DuelSlot[], index: number, phalanx = false): boolean {
  const s = slots[index]
  if (s.row !== 'back') return false
  return slots.some((f) => f.row === 'front' && (f.lane === s.lane || (phalanx && Math.abs(f.lane - s.lane) === 1)))
}

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
    lane: member.lane,
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
    for (const m of receivers(vow, members, sworn.target)) vow.apply(m, members)
  }
  return {
    members: members.map((m, i): TeamMember => {
      const usable = Object.keys(m.skillDefs).filter((id) => id !== m.creature.basicAttack && id !== m.creature.ascension)
      const skills = usable.map((id) => m.skillDefs[id])
      const boss = team[i].boss
      const member: TeamMember = {
        creature: m.creature.id,
        position: { lane: team[i].lane, row: team[i].row },
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
  /** The opponent changed its formation at the start of this round. */
  reformed?: boolean
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

/**
 * The CPU re-forms only after a lost round: its sturdiest Front creature steps into the Lane of the player's
 * strongest attacker, then unprotected Back creatures move behind a Front ally where a cell is free.
 */
export function reform(match: DuelMatch): DuelMatch {
  if (match.rounds[match.rounds.length - 1] !== 'player') return match
  let enemy = match.enemy
  const threat = (m: VowMember) => attackOf(m) - (healer(m) ? 40 : 0)
  const attacker = match.player.map(baseMember).sort((a, b) => threat(b) - threat(a))[0]
  const tank = enemy
    .map((m, i) => ({ i, m: baseMember(m) }))
    .filter(({ m }) => m.row === 'front')
    .sort((a, b) => b.m.stats.lifeforce - a.m.stats.lifeforce)[0]
  if (attacker && tank && tank.m.lane !== attacker.lane) enemy = moveTo(enemy, tank.i, attacker.lane, 'front')
  enemy.forEach((_, i) => {
    if (enemy[i].row !== 'back' || isGuarded(enemy, i)) return
    const cover = enemy.find((f) => f.row === 'front' && occupant(enemy, f.lane, 'back') < 0)
    if (cover) enemy = moveTo(enemy, i, cover.lane, 'back')
  })
  const moved = enemy.some((m, i) => m.lane !== match.enemy[i].lane || m.row !== match.enemy[i].row)
  return { ...match, enemy, reformed: moved }
}

/** The opponent's turn at the start of a round: it re-forms if it lost, then picks from its own offer and reveals the Vow. */
export function enemySwears(start: DuelMatch): DuelMatch {
  const match = reform({ ...start, reformed: false })
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
  if (vow.carrier) return vow.carrier
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

// ── Targeting Preview ──

export interface TargetArrow {
  side: Side
  /** Team index of the attacker and of its first target. */
  from: number
  to: number
  /** The arrow of a Snipe skill (reaches the Back Row). */
  snipe: boolean
}

export interface TargetPreview {
  arrows: TargetArrow[]
  /** Per side and team index: a Back creature without protection. */
  open: Record<Side, boolean[]>
}

/** Who each creature would attack first at the start of the round, by the Lane Rule (with every Vow applied). */
export function previewTargets(player: MatchMember[], enemy: MatchMember[], vows: Record<Side, SwornVow[]>): TargetPreview {
  const units = createUnits({ player: buildTeam(player, vows.player), enemy: buildTeam(enemy, vows.enemy), seed: 0 }, CONTENT)
  const indexOf = (id: string) => Number(id.split('-')[1])
  const arrows: TargetArrow[] = []
  for (const unit of units) {
    const basic = unit.skills[unit.creature.basicAttack]
    const first = selectTargets(basic, 'sameLane', unit, units)[0]
    if (first) arrows.push({ side: unit.side, from: indexOf(unit.id), to: indexOf(first.id), snipe: !!basic.ignoresProtection })
    const sniper = Object.values(unit.skills).find((s) => s.effect === 'damage' && s.pattern === 'single' && s.ignoresProtection)
    if (sniper && !basic.ignoresProtection) {
      const aimed = selectTargets(sniper, 'sameLane', unit, units)[0]
      if (aimed && aimed !== first) arrows.push({ side: unit.side, from: indexOf(unit.id), to: indexOf(aimed.id), snipe: true })
    }
  }
  const open = (side: Side) => units.filter((u) => u.side === side).map((u) => u.position.row === 'back' && !isProtected(u, units))
  return { arrows, open: { player: open('player'), enemy: open('enemy') } }
}
