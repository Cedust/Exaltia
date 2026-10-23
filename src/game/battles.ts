import { RULES } from '../core/rules'
import type { Position, StatusId, Team, TeamMember } from '../core/types'
import { CONTENT } from '../data'
import { FIRST_TRIAL, REGIONS, REGION_BY_ID, type Encounter, type EnemySpec, type Modifier } from '../data/world'
import { autoPlan } from './autoPlan'
import { enemyLoadout, playerLoadout } from './loadout'
import { ACOLYTE_MAX_SLOTS, CONDITION_UNLOCKS, FINALE_TIER, REMATCH_TIER, STARTING_CONDITIONS, TACTIC_SLOTS, teamSizeFor } from './rules'
import { actOf, tournamentsWon, type SaveState } from './save'

const ALL_CONDITIONS = [...STARTING_CONDITIONS, ...CONDITION_UNLOCKS]

/** Tactic Slots a creature of the player gets right now. */
export function slotsFor(save: SaveState, creatureId: string): number {
  const slots = TACTIC_SLOTS[actOf(save)]
  return CONTENT.creatures[creatureId].kind === 'acolyte' ? Math.min(slots, ACOLYTE_MAX_SLOTS) : slots
}

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

/** The CPU team for an encounter: trimmed to the team size, scaled to the tier, with auto plans. */
export function enemyTeam(save: SaveState, encounter: Encounter): Team {
  const rules = battleRules(save, encounter)
  const slots = Math.min(RULES.maxTacticSlots, Math.max(1, TACTIC_SLOTS[actOf(save)] + (encounter.kind === 'final' || encounter.kind === 'finale' || encounter.kind === 'rematch' ? 1 : 0)))
  const size = encounter.kind === 'trial' ? 2 : rules.teamSize
  const specs = encounter.members.slice(0, size)
  const isMirror = encounter.kind === 'duel' || encounter.kind === 'finale'
  return {
    members: specs.map((spec): TeamMember => {
      const loadout = enemyLoadout(spec.creature, {
        tier: rules.tier,
        boss: spec.boss,
        teamSize: size,
        lifeforceFactor: isMirror ? 1.25 : encounter.kind === 'trial' ? 0.7 : undefined,
      })
      if (encounter.kind === 'trial') loadout.stats = { ...loadout.stats!, might: Math.round(loadout.stats!.might * 0.75) }
      if (rules.enemyStatus) loadout.passives = [...(loadout.passives ?? []), { type: 'startStatus', ...rules.enemyStatus }]
      const skills = (loadout.skills ?? CONTENT.creatures[spec.creature].skills).map((id) => CONTENT.skills[id])
      const tactics = spec.tactics ?? autoPlan(skills, spec.boss ? Math.max(2, slots - 1) : slots, ALL_CONDITIONS)
      const member: TeamMember = { creature: spec.creature, position: spec.position, tactics, loadout }
      if (spec.boss) member.boss = { phase2: autoPlan(skills, slots, ALL_CONDITIONS) }
      return member
    }),
  }
}

/** Problems that keep the current formation from entering this battle, in plain words. */
export function formationProblems(save: SaveState, encounter: Encounter): string[] {
  const rules = battleRules(save, encounter)
  const problems: string[] = []
  const members = save.formation
  if (members.length !== rules.teamSize) problems.push(`Place exactly ${rules.teamSize} creature${rules.teamSize > 1 ? 's' : ''} (${members.length} placed).`)
  for (const m of members) {
    const c = CONTENT.creatures[m.creature]
    if (rules.onlyAcolytes && c.kind === 'paragon') problems.push(`${c.name} is a Paragon: this Challenge allows Acolytes only.`)
    if (rules.banned.includes(c.element)) problems.push(`${c.name} is ${c.element}: not allowed here.`)
  }
  return problems
}

export const isFrontLiner = (id: string) => /^Front|Guardian|Striker|Bulwark|Brawler/.test(CONTENT.creatures[id].role)

/**
 * Fits the saved formation to an encounter before the pre-battle screen opens: drops creatures the rules forbid,
 * trims to the team size (Paragons first) and fills empty places with the strongest allowed creatures.
 */
export function fitFormation(save: SaveState, encounter: Encounter): SaveState['formation'] {
  const rules = battleRules(save, encounter)
  const allowed = (id: string) => {
    const c = CONTENT.creatures[id]
    return !(rules.onlyAcolytes && c.kind === 'paragon') && !rules.banned.includes(c.element)
  }
  const rank = (id: string) => (CONTENT.creatures[id].kind === 'paragon' ? 1_000_000 + save.creatures[id].xp : 0)
  let formation = save.formation.filter((f) => save.creatures[f.creature] && allowed(f.creature))
  if (formation.length > rules.teamSize) {
    const keep = [...formation].sort((a, b) => rank(b.creature) - rank(a.creature)).slice(0, rules.teamSize)
    formation = formation.filter((f) => keep.includes(f))
  }
  const candidates = save.order.filter((id) => allowed(id) && !formation.some((f) => f.creature === id)).sort((a, b) => rank(b) - rank(a))
  const free = (row: 'front' | 'back') =>
    ([1, 0, 2] as const).map((lane) => ({ lane, row })).find((p) => !formation.some((f) => f.position.lane === p.lane && f.position.row === p.row))
  for (const id of candidates) {
    if (formation.length >= rules.teamSize) break
    const position = free(isFrontLiner(id) ? 'front' : 'back') ?? free(isFrontLiner(id) ? 'back' : 'front')
    if (position) formation = [...formation, { creature: id, position }]
  }
  return formation
}

export function playerTeam(save: SaveState): Team {
  const won = tournamentsWon(save)
  return {
    members: save.formation.map((f) => {
      const owned = save.creatures[f.creature]
      const loadout = playerLoadout(owned, won)
      const usable = loadout.skills ?? CONTENT.creatures[f.creature].skills
      const tactics = (save.tactics[f.creature] ?? []).filter((t) => usable.includes(t.skill)).slice(0, slotsFor(save, f.creature))
      return { creature: f.creature, position: f.position, tactics, loadout }
    }),
  }
}

/** Suggested Battle Plan for a creature of the player, from its current skills and unlocked Conditions. */
export function suggestPlan(save: SaveState, creatureId: string) {
  const loadout = playerLoadout(save.creatures[creatureId], tournamentsWon(save))
  const skills = (loadout.skills ?? CONTENT.creatures[creatureId].skills).map((id) => loadout.skillDefs?.[id] ?? CONTENT.skills[id])
  return autoPlan(skills, slotsFor(save, creatureId), save.conditions)
}
