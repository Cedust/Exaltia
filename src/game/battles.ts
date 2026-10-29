import type { Position, StatusId } from '../core/types'
import { CONTENT } from '../data'
import { FIRST_TRIAL, REGIONS, REGION_BY_ID, type Encounter, type EnemySpec, type Modifier } from '../data/world'
import { isFrontLiner, newMatch, placeFor, pickBossVows, type DuelMatch, type MatchMember, type SwornVow } from './duel'
import { enemyLoadout, playerLoadout } from './loadout'
import { BEST_OF, BOSS, BOSS_VOWS, ENEMY_LIFEFORCE, FINALE_TIER, OPPONENT_THEMES, REMATCH_TIER, teamSizeFor } from './rules'
import { tournamentsWon, type SaveState } from './save'

export const F = (lane: 0 | 1 | 2): Position => ({ lane, row: 'front' })
export const B = (lane: 0 | 1 | 2): Position => ({ lane, row: 'back' })

// ── Cassian's encounters (built from the Paragons he took) ──

const front = (id: string) => CONTENT.creatures[id].role.startsWith('Front')

function cassianTeam(save: SaveState, count: number): EnemySpec[] {
  const taken = [...save.cassian].reverse()
  const fronts = taken.filter(front)
  const backs = taken.filter((id) => !front(id))
  const picks: string[] = []
  // Alternate Front and Back so his team has a shape, newest Paragons first.
  while (picks.length < count && (fronts.length || backs.length)) {
    const next = (picks.length % 2 === 0 ? fronts : backs).shift() ?? fronts.shift() ?? backs.shift()
    if (next) picks.push(next)
  }
  const frontLanes: (0 | 1 | 2)[] = [1, 0, 2]
  const backLanes: (0 | 1 | 2)[] = [1, 2, 0]
  return picks.map((creature) => ({ creature, position: front(creature) ? F(frontLanes.shift()!) : B(backLanes.shift()!) }))
}

export const DUELS = [
  { id: 'duel-1', after: 2, name: 'A Rival Appears', description: 'Cassian blocks the road and sneers: "One Paragon each. Let us see what your Oath is worth."' },
  { id: 'duel-2', after: 5, name: 'The Chain Tightens', description: 'Cassian is stronger now, and the chain on his coat glows. Another 1v1, and he does not intend to lose twice.' },
]

export function duelEncounter(save: SaveState, id: string): Encounter {
  const duel = DUELS.find((d) => d.id === id)!
  return {
    id,
    kind: 'duel',
    name: duel.name,
    opponent: 'Cassian',
    description: duel.description,
    backdrop: 'spire',
    members: cassianTeam(save, 1),
    modifiers: [{ type: 'teamSize', size: 1 }],
  }
}

export function finaleEncounter(save: SaveState): Encounter {
  return {
    id: 'finale',
    kind: 'finale',
    name: 'The Spire Reforged',
    opponent: 'Cassian, the Chainbinder',
    description: 'At the heart of the shattered Spire, Cassian has chained the Paragons you left behind. Four against four, for the fate of every Oath.',
    backdrop: 'spire',
    members: cassianTeam(save, 4),
    modifiers: [{ type: 'teamSize', size: 4 }],
  }
}

export function rematchEncounter(regionId: string): Encounter {
  const region = REGION_BY_ID[regionId]
  return {
    id: `rematch-${regionId}`,
    kind: 'rematch',
    name: `${region.tournament.name} Rematch`,
    opponent: 'The Paragons, unchained',
    description: 'Freed from Cassian, both Paragons return home. Win once more, at full strength, and the second one will swear the Oath as well.',
    backdrop: regionId,
    members: region.tournament.matches[2].members,
    modifiers: [{ type: 'teamSize', size: 4 }],
  }
}

export function findAnyEncounter(save: SaveState, id: string): Encounter | undefined {
  if (id === FIRST_TRIAL.id) return FIRST_TRIAL
  if (id.startsWith('duel-')) return duelEncounter(save, id)
  if (id === 'finale') return finaleEncounter(save)
  if (id.startsWith('rematch-')) return rematchEncounter(id.slice('rematch-'.length))
  for (const r of REGIONS) {
    const found = r.tournament.matches.find((m) => m.id === id) ?? r.challengeSite.challenges.find((c) => c.id === id)
    if (found) return found
  }
  return undefined
}

// ── Battle setup ──

export interface BattleRules {
  teamSize: number
  tier: number
  onlyAcolytes: boolean
  banned: string[]
  enemyStatus?: { status: StatusId; turns: number }
}

export function battleRules(save: SaveState, encounter: Encounter): BattleRules {
  const won = tournamentsWon(save)
  const tier = encounter.kind === 'finale' ? FINALE_TIER : encounter.kind === 'rematch' ? REMATCH_TIER : encounter.kind === 'trial' ? 0 : won
  const rules: BattleRules = { teamSize: teamSizeFor(won), tier, onlyAcolytes: false, banned: [] }
  for (const m of encounter.modifiers ?? []) applyModifier(rules, m)
  return rules
}

function applyModifier(rules: BattleRules, m: Modifier) {
  if (m.type === 'teamSize') rules.teamSize = m.size
  if (m.type === 'onlyAcolytes') rules.onlyAcolytes = true
  if (m.type === 'bannedElement') rules.banned.push(m.element)
  if (m.type === 'enemyStartStatus') rules.enemyStatus = { status: m.status, turns: m.turns }
}

export function describeModifier(m: Modifier): string {
  switch (m.type) {
    case 'teamSize':
      return m.size === 1 ? '1v1 only' : `${m.size}v${m.size}`
    case 'onlyAcolytes':
      return 'Acolytes only'
    case 'bannedElement':
      return `No ${m.element[0].toUpperCase()}${m.element.slice(1)} creatures`
    case 'enemyStartStatus':
      return `Enemies start with ${m.status[0].toUpperCase()}${m.status.slice(1)}`
  }
}

/** The CPU team for an encounter: trimmed to the team size and scaled to the tier. */
export function enemyMembers(save: SaveState, encounter: Encounter): MatchMember[] {
  const rules = battleRules(save, encounter)
  const size = encounter.kind === 'trial' ? 2 : rules.teamSize
  const specs = encounter.members.slice(0, size)
  return specs.map((spec): MatchMember => {
    const loadout = enemyLoadout(spec.creature, {
      tier: rules.tier,
      boss: spec.boss,
      teamSize: size,
      lifeforceFactor: (ENEMY_LIFEFORCE[encounter.kind] ?? 1) * (spec.boss ? BOSS.matchLifeforce : 1),
    })
    if (encounter.kind === 'trial') loadout.stats = { ...loadout.stats!, might: Math.round(loadout.stats!.might * 0.75) }
    if (rules.enemyStatus) loadout.passives = [...(loadout.passives ?? []), { type: 'startStatus', ...rules.enemyStatus }]
    return { creature: spec.creature, lane: spec.position.lane, row: spec.position.row, loadout, boss: spec.boss }
  })
}

/** Problems that keep the current formation from entering this battle, in plain words. */
export function formationProblems(save: SaveState, encounter: Encounter): string[] {
  const rules = battleRules(save, encounter)
  const problems: string[] = []
  const members = save.formation
  if (members.length !== rules.teamSize) problems.push(`Choose exactly ${rules.teamSize} creature${rules.teamSize > 1 ? 's' : ''} (${members.length} chosen).`)
  for (const m of members) {
    const c = CONTENT.creatures[m.creature]
    if (rules.onlyAcolytes && c.kind === 'paragon') problems.push(`${c.name} is a Paragon: this Challenge allows Acolytes only.`)
    if (rules.banned.includes(c.element)) problems.push(`${c.name} is ${c.element}: not allowed here.`)
  }
  return problems
}

export { isFrontLiner }

/** Whether a creature may enter this encounter. */
export function allowedIn(rules: BattleRules, id: string): boolean {
  const c = CONTENT.creatures[id]
  return !(rules.onlyAcolytes && c.kind === 'paragon') && !rules.banned.includes(c.element)
}

/** Adds a creature to the formation in its preferred row, from the middle out. */
export const joinFormation = (formation: SaveState['formation'], id: string): SaveState['formation'] => [...formation, { creature: id, ...placeFor(formation, id) }]

/**
 * Fits the saved formation to an encounter before the pre-battle screen opens: drops creatures the rules forbid,
 * trims to the team size (Paragons first) and fills empty places with the strongest allowed creatures.
 */
export function fitFormation(save: SaveState, encounter: Encounter): SaveState['formation'] {
  const rules = battleRules(save, encounter)
  const rank = (id: string) => (CONTENT.creatures[id].kind === 'paragon' ? 1_000_000 + save.creatures[id].xp : 0)
  let formation = save.formation.filter((f) => save.creatures[f.creature] && allowedIn(rules, f.creature))
  if (formation.length > rules.teamSize) {
    const keep = [...formation].sort((a, b) => rank(b.creature) - rank(a.creature)).slice(0, rules.teamSize)
    formation = formation.filter((f) => keep.includes(f))
  }
  const candidates = save.order.filter((id) => allowedIn(rules, id) && !formation.some((f) => f.creature === id)).sort((a, b) => rank(b) - rank(a))
  for (const id of candidates) {
    if (formation.length >= rules.teamSize) break
    formation = joinFormation(formation, id)
  }
  return formation
}

/** The player's team for a match: the saved formation with each creature's current strength. */
export function playerMembers(save: SaveState): MatchMember[] {
  const won = tournamentsWon(save)
  return save.formation.map((f) => ({ creature: f.creature, lane: f.lane, row: f.row, loadout: playerLoadout(save.creatures[f.creature], won) }))
}

// ── Matches ──

export function bestOfFor(encounter: Encounter): number {
  if (encounter.kind === 'challenge') return encounter.modifiers?.some((m) => m.type === 'teamSize' && m.size === 1) ? BEST_OF.challenge1v1 : BEST_OF.challenge
  return BEST_OF[encounter.kind]
}

/** The opponent's Vow theme: Cassian has his own, everyone else follows their home. */
export function themeOf(encounter: Encounter) {
  const key = encounter.opponent.startsWith('Cassian') ? 'cassian' : encounter.backdrop
  return OPPONENT_THEMES[key] ?? OPPONENT_THEMES.spire
}

/** Vows the opponent holds before round 1 (Tournament finals, the finale and Rematches). */
export function bossVowsFor(save: SaveState, encounter: Encounter): SwornVow[] {
  const count = BOSS_VOWS[encounter.kind] ?? 0
  return count > 0 ? pickBossVows(enemyMembers(save, encounter), themeOf(encounter).prefers, count) : []
}

export function startMatch(save: SaveState, encounter: Encounter, seed: number): DuelMatch {
  return newMatch({
    name: encounter.name,
    opponent: encounter.opponent,
    backdrop: encounter.backdrop,
    bestOf: bestOfFor(encounter),
    seed,
    player: playerMembers(save),
    enemy: enemyMembers(save, encounter),
    playerPool: save.vows,
    prefers: themeOf(encounter).prefers,
    bossVows: bossVowsFor(save, encounter),
  })
}
