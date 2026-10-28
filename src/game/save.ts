import type { Row } from '../core/types'
import { CHALLENGE_VOWS, STARTING_VOWS, TRIAL_VOW, type Act } from './rules'

export interface OwnedCreature {
  id: string
  /** Paragons: total XP (Awakening). Acolytes keep 0. */
  xp: number
  /** Bought Skill Tree node ids (see data/skillTrees). */
  tree: string[]
  /** Uses per skill id, for Mastery. */
  mastery: Record<string, number>
  /** Oath Shards invested (10 per Oath Rank). */
  oath: number
  /** Attunement choices for Oath Rank II and IV. */
  attunements: ('offense' | 'defense')[]
}

export interface TournamentProgress {
  /** Matches won so far: 0-2 regular matches, 3 = final won. */
  stage: number
  /** The Paragon chosen after the final. */
  chosen?: string
}

export interface SaveState {
  version: 1
  name: string
  createdAt: number
  creatures: Record<string, OwnedCreature>
  /** Creature ids in the order they joined. */
  order: string[]
  shards: number
  firstTrialWon: boolean
  tournaments: Record<string, TournamentProgress>
  /** Region ids in the order their Tournaments were won. */
  tournamentOrder: string[]
  challenges: string[]
  duels: string[]
  /** Paragons Cassian took (always the one you did not choose). */
  cassian: string[]
  rematches: string[]
  /** Vow ids the player can be offered in matches. */
  vows: string[]
  /** Story scenes already shown. */
  seen: string[]
  /** The team for the next match, in order, with the row each creature starts in. */
  formation: { creature: string; row: Row }[]
  finale: { won: boolean; ending?: 'oath' | 'unbound' }
  stats: { battles: number; wins: number }
  speed: number
}

const STORAGE_KEY = 'exaltia.save.v1'

export function newSave(name: string): SaveState {
  return {
    version: 1,
    name,
    createdAt: Date.now(),
    creatures: {},
    order: [],
    shards: 0,
    firstTrialWon: false,
    tournaments: {},
    tournamentOrder: [],
    challenges: [],
    duels: [],
    cassian: [],
    rematches: [],
    vows: [...STARTING_VOWS],
    seen: [],
    formation: [],
    finale: { won: false },
    stats: { battles: 0, wins: 0 },
    speed: 1,
  }
}

export function newOwned(id: string): OwnedCreature {
  return { id, xp: 0, tree: [], mastery: {}, oath: 0, attunements: [] }
}

export const tournamentsWon = (save: SaveState) => save.tournamentOrder.length

export function actOf(save: SaveState): Act {
  if (!save.firstTrialWon) return 'prologue'
  const won = tournamentsWon(save)
  if (won < 4) return 'act1'
  if (won < 8) return 'act2'
  if (!save.finale.won) return 'act3'
  return 'act4'
}

export function loadSave(): SaveState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as SaveState
    if (parsed?.version !== 1 || typeof parsed.name !== 'string') return null
    // Fill fields added after the save was written.
    return upgradeSave({ ...newSave(parsed.name), ...parsed })
  } catch {
    return null
  }
}

/** Vows a journey has earned so far: the starting set, the First Trial and every Challenge won. */
export function earnedVows(save: Pick<SaveState, 'firstTrialWon' | 'challenges'>): string[] {
  const vows = [...STARTING_VOWS]
  if (save.firstTrialWon) vows.push(TRIAL_VOW)
  for (const id of save.challenges) if (CHALLENGE_VOWS[id]) vows.push(CHALLENGE_VOWS[id])
  return vows
}

/** Saves from before Vow Duels: Lanes become rows, Conditions and Tactics give way to Vows. */
export function upgradeSave(loaded: SaveState): SaveState {
  const save = { ...loaded } as SaveState & { conditions?: unknown; tactics?: unknown }
  const legacy = save.conditions !== undefined
  delete save.conditions
  delete save.tactics
  const formation = save.formation.map((f) => {
    const old = f as { creature: string; row?: Row; position?: { row: Row } }
    return { creature: old.creature, row: old.row ?? old.position?.row ?? 'front' }
  })
  return { ...save, formation, vows: legacy ? earnedVows(save) : save.vows }
}

export function writeSave(save: SaveState): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(save))
    return true
  } catch {
    return false
  }
}

export function deleteSave() {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Nothing stored or storage blocked.
  }
}
