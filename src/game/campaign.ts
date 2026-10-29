import type { BattleResult } from '../core/types'
import { CONTENT } from '../data'
import { PARAGON_IDS } from '../data/creatures'
import { FIRST_TRIAL, REGIONS, REGION_BY_ID, neighbours, type Encounter } from '../data/world'
import { DUELS } from './battles'
import type { DuelMatch } from './duel'
import { CHALLENGE_VOWS, SHARD_REWARDS, TOURNAMENT_VOWS, TRIAL_VOW, XP, awakeningOf, masteryOf } from './rules'
import { newOwned, tournamentsWon, type SaveState } from './save'

// ── Availability on the map ──

/** The first region is free to choose; afterwards ring neighbours of won regions open up. */
export function regionOpen(save: SaveState, regionId: string): boolean {
  if (!save.firstTrialWon) return false
  const won = save.tournamentOrder
  if (won.length === 0) return true
  return won.includes(regionId) || won.some((r) => neighbours(r).includes(regionId))
}

export const tournamentStage = (save: SaveState, regionId: string) => save.tournaments[regionId]?.stage ?? 0
export const tournamentWon = (save: SaveState, regionId: string) => !!save.tournaments[regionId]?.chosen

export function openDuel(save: SaveState) {
  return DUELS.find((d) => tournamentsWon(save) >= d.after && !save.duels.includes(d.id) && save.cassian.length > 0)
}

export const finaleOpen = (save: SaveState) => tournamentsWon(save) >= REGIONS.length && !save.finale.won

export type SpireAction = 'trial' | 'duel' | 'finale' | null

/** What waits at the Spire in the center of the map right now. */
export function spireAction(save: SaveState): SpireAction {
  if (!save.firstTrialWon) return 'trial'
  if (finaleOpen(save)) return 'finale'
  if (openDuel(save)) return 'duel'
  return null
}

export function addCreature(save: SaveState, id: string): SaveState {
  if (save.creatures[id]) return save
  const owned = newOwned(id)
  if (CONTENT.creatures[id].kind === 'paragon') {
    // Oath Resonance: a new Paragon catches up with part of your strongest Paragon's experience.
    const best = Math.max(0, ...Object.values(save.creatures).filter((c) => CONTENT.creatures[c.id].kind === 'paragon').map((c) => c.xp))
    owned.xp = Math.round(best * XP.catchUp)
  }
  return { ...save, creatures: { ...save.creatures, [id]: owned }, order: [...save.order, id] }
}

/** After a Tournament final: the player picks one Paragon, Cassian takes the other. */
export function chooseParagon(save: SaveState, regionId: string, paragonId: string): SaveState {
  const region = REGION_BY_ID[regionId]
  const other = region.paragons.find((p) => p !== paragonId)!
  let next: SaveState = {
    ...save,
    tournaments: { ...save.tournaments, [regionId]: { stage: 3, chosen: paragonId } },
    tournamentOrder: [...save.tournamentOrder, regionId],
    cassian: [...save.cassian, other],
  }
  next = addCreature(next, paragonId)
  return next
}

// ── Battle rewards ──

export interface CreatureGain {
  id: string
  xp: number
  awakeningBefore: number
  awakeningAfter: number
  masteryUps: { skill: string; stars: number }[]
}

export interface BattleReport {
  won: boolean
  shards: number
  gains: CreatureGain[]
  /** Rounds won and lost in the match. */
  score: { player: number; enemy: number }
  recruited?: string
  /** A new Vow joins the player's pool. */
  unlockedVow?: string
  /** A Tournament final was won: the player must now choose a Paragon. */
  chooseParagonIn?: string
  rematchReward?: string
  finaleWon?: boolean
}

function xpFor(encounter: Encounter, tier: number) {
  return Math.round((XP.base + XP.perTier * tier) * (XP.kind[encounter.kind] ?? 1))
}

/** Rewards for a finished match: XP once per match, Mastery for every skill used in any round. */
export function applyMatch(save: SaveState, encounter: Encounter, match: DuelMatch, results: BattleResult[], tier: number): { save: SaveState; report: BattleReport } {
  const won = match.wins.player > match.wins.enemy
  const report: BattleReport = { won, shards: 0, gains: [], score: { ...match.wins } }
  const creatures = { ...save.creatures }

  // Mastery: every use of a skill (not the Basic Attack or Ascension) counts.
  const uses = new Map<string, Map<string, number>>()
  for (const result of results) {
    const start = result.events[0]
    const playerUnits = new Map<string, string>()
    if (start.type === 'battleStarted') for (const u of start.units) if (u.side === 'player') playerUnits.set(u.id, u.creature)
    for (const e of result.events) {
      if (e.type !== 'actionChosen' || e.ascension || e.tactic === null) continue
      const creature = playerUnits.get(e.actor)
      if (!creature) continue
      const perSkill = uses.get(creature) ?? new Map<string, number>()
      perSkill.set(e.skill, (perSkill.get(e.skill) ?? 0) + 1)
      uses.set(creature, perSkill)
    }
  }

  const baseXp = xpFor(encounter, tier) * (won ? 1 : XP.lossShare)
  const participants = new Set(match.player.map((m) => m.creature))
  for (const owned of Object.values(save.creatures)) {
    if (CONTENT.creatures[owned.id].kind !== 'paragon') continue
    const gained = Math.round(baseXp * (participants.has(owned.id) ? 1 : XP.benchShare))
    const mastery = { ...owned.mastery }
    const masteryUps: CreatureGain['masteryUps'] = []
    for (const [skill, count] of uses.get(owned.id) ?? []) {
      const before = masteryOf(mastery[skill] ?? 0)
      mastery[skill] = (mastery[skill] ?? 0) + count
      const after = masteryOf(mastery[skill])
      if (after > before) masteryUps.push({ skill, stars: after })
    }
    const xp = owned.xp + gained
    creatures[owned.id] = { ...owned, xp, mastery }
    report.gains.push({ id: owned.id, xp: gained, awakeningBefore: awakeningOf(owned.xp), awakeningAfter: awakeningOf(xp), masteryUps })
  }

  let next: SaveState = { ...save, creatures, stats: { battles: save.stats.battles + 1, wins: save.stats.wins + (won ? 1 : 0) } }
  if (!won) return { save: next, report }

  const unlockVow = (vow: string | undefined) => {
    if (vow && !next.vows.includes(vow)) {
      next = { ...next, vows: [...next.vows, vow] }
      report.unlockedVow = vow
    }
  }

  switch (encounter.kind) {
    case 'trial':
      report.shards = SHARD_REWARDS.trial
      if (!next.firstTrialWon) {
        next = { ...next, firstTrialWon: true }
        unlockVow(TRIAL_VOW)
      }
      break
    case 'match':
    case 'final': {
      const regionId = encounter.id.split('-')[0]
      const stage = tournamentStage(next, regionId)
      next = { ...next, tournaments: { ...next.tournaments, [regionId]: { stage: stage + 1 } } }
      report.shards = encounter.kind === 'final' ? SHARD_REWARDS.final + SHARD_REWARDS.tournament : SHARD_REWARDS.match
      if (encounter.kind === 'final') {
        report.chooseParagonIn = regionId
        unlockVow(TOURNAMENT_VOWS[tournamentsWon(save)])
      }
      break
    }
    case 'challenge': {
      const first = !next.challenges.includes(encounter.id)
      report.shards = first ? SHARD_REWARDS.challenge : SHARD_REWARDS.challengeRepeat
      if (first) {
        next = { ...next, challenges: [...next.challenges, encounter.id] }
        const [regionId, index] = encounter.id.split('-c')
        const recruit = REGION_BY_ID[regionId].acolytes[Number(index) - 1]
        if (!next.creatures[recruit]) {
          next = addCreature(next, recruit)
          report.recruited = recruit
        }
        unlockVow(CHALLENGE_VOWS[encounter.id])
      }
      break
    }
    case 'duel':
      report.shards = SHARD_REWARDS.duel
      if (!next.duels.includes(encounter.id)) next = { ...next, duels: [...next.duels, encounter.id] }
      break
    case 'finale':
      report.shards = SHARD_REWARDS.finale
      next = { ...next, finale: { ...next.finale, won: true } }
      report.finaleWon = true
      break
    case 'rematch': {
      const regionId = encounter.id.slice('rematch-'.length)
      report.shards = SHARD_REWARDS.rematch
      const other = REGION_BY_ID[regionId].paragons.find((p) => !next.creatures[p])
      if (!next.rematches.includes(regionId)) next = { ...next, rematches: [...next.rematches, regionId] }
      if (other) {
        next = addCreature(next, other)
        report.rematchReward = other
      }
      break
    }
  }
  next = { ...next, shards: next.shards + report.shards }
  return { save: next, report }
}

export const paragonsOwned = (save: SaveState) => PARAGON_IDS.filter((id) => save.creatures[id])

export { FIRST_TRIAL }
