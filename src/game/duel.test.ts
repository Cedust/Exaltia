import { describe, expect, it } from 'vitest'
import { runBattle } from '../core/battle'
import { CONTENT } from '../data'
import type { Row } from '../core/types'
import {
  autoPick,
  buildTeam,
  enemySwears,
  matchWinner,
  newMatch,
  offerFor,
  pickBossVows,
  offerRules,
  positions,
  recordRound,
  resolveVow,
  roundSeed,
  roundTeams,
  swear,
  type MatchMember,
} from './duel'
import { enemyLoadout } from './loadout'
import { OPPONENT_THEMES } from './rules'
import { VOWS } from './vows'

const team = (tier: number, ...members: [string, Row][]): MatchMember[] =>
  members.map(([creature, row]) => ({ creature, row, loadout: enemyLoadout(creature, { tier, teamSize: members.length }) }))

const TEAM = team(2, ['basaltor', 'front'], ['pyrelle', 'back'], ['nivaris', 'back'])
const FIRE = team(4, ['cinder-knight', 'front'], ['ember-sage', 'back'], ['ember-sage', 'back'])
const ALL = VOWS.map((v) => v.id)

const fight = (player: MatchMember[], playerVows: { vow: string; target?: number }[], enemyVows: { vow: string; target?: number }[] = [], seed = 7) =>
  runBattle({ player: buildTeam(player, playerVows), enemy: buildTeam(FIRE, enemyVows), seed }, CONTENT)

const match = (enemy = FIRE, seed = 3, bestOf = 5) =>
  newMatch({ name: 'Test', opponent: 'Rival', backdrop: 'fire', bestOf, seed, player: TEAM, enemy, playerPool: ALL, prefers: OPPONENT_THEMES.fire.prefers })

describe('Vow Duels', () => {
  it('places each row from the middle out', () => {
    expect(positions(TEAM)).toEqual([
      { lane: 1, row: 'front' },
      { lane: 1, row: 'back' },
      { lane: 0, row: 'back' },
    ])
  })

  it('every Vow builds a valid team and a battle that ends', () => {
    for (const vow of VOWS) {
      if (vow.id === 'mirror-oath') continue
      const result = fight(TEAM, [{ vow: vow.id, target: vow.scope === 'creature' ? 0 : undefined }], [{ vow: vow.id, target: vow.scope === 'creature' ? 1 : undefined }])
      expect(result.events.at(-1)?.type, vow.id).toBe('battleEnded')
    }
  })

  it('Fireproof stops Burn on the whole team', () => {
    const burns = (r: ReturnType<typeof fight>) => r.events.filter((e) => e.type === 'statusApplied' && e.status === 'burn' && e.target.startsWith('player')).length
    const enemy = [{ vow: 'kindling', target: 0 }, { vow: 'kindling', target: 1 }]
    expect(burns(fight(TEAM, [], enemy))).toBeGreaterThan(0)
    const guarded = fight(TEAM, [{ vow: 'fireproof' }], enemy)
    expect(burns(guarded)).toBe(0)
    expect(guarded.events.some((e) => e.type === 'vowTriggered' && e.vow === 'Fireproof')).toBe(true)
  })

  it('Undying Oath brings the first fallen creature back once', () => {
    const weak = team(2, ['spire-mender', 'front'])
    const result = fight(weak, [{ vow: 'undying-oath' }])
    const revived = result.events.filter((e) => e.type === 'revived')
    expect(revived).toHaveLength(1)
    expect(result.events.filter((e) => e.type === 'defeated' && e.unit === 'player-0')).toHaveLength(2)
  })

  it('Dawnbreak fires the Ascension on the first turn of the carrier', () => {
    const result = fight(TEAM, [{ vow: 'dawnbreak', target: 1 }])
    const first = result.events.find((e) => e.type === 'actionChosen' && e.actor === 'player-1')
    expect(first?.type === 'actionChosen' && first.ascension).toBe(true)
  })

  it('the loser of a round sees 4 offers, one at least Rare; match point guarantees an Exalted', () => {
    let m = match()
    expect(offerRules(m, 'player')).toEqual({ count: 3, atLeast: undefined })
    m = recordRound(m, 'enemy')
    expect(offerRules(m, 'player')).toEqual({ count: 4, atLeast: 'rare' })
    m = recordRound(m, 'enemy')
    const rules = offerRules(m, 'player')
    expect(rules.atLeast).toBe('exalted')
    m = enemySwears(m)
    const offer = offerFor(m, 'player')
    expect(offer).toHaveLength(4)
    expect(offer.some((id) => VOWS.find((v) => v.id === id)!.rarity === 'exalted')).toBe(true)
  })

  it('Mirror Oath copies the opponent’s last Vow', () => {
    let m = swear(match(), 'enemy', { vow: 'blood-price', target: 0 })
    expect(resolveVow(m, 'player', 'mirror-oath', 1)).toEqual({ vow: 'blood-price', target: 1 })
    m = swear(m, 'enemy', { vow: 'fireproof' })
    expect(resolveVow(m, 'player', 'mirror-oath')).toEqual({ vow: 'fireproof' })
  })

  it('offers only Vows from the player’s pool', () => {
    const pool = ['stoneskin', 'vigil', 'keen-edge', 'fireproof']
    const m = { ...match(), pools: { player: pool, enemy: ALL } }
    for (let round = 0; round < 3; round++) expect(pool).toEqual(expect.arrayContaining(offerFor({ ...m, seed: round }, 'player')))
  })

  it('Boss Vows follow the opponent’s favourites and are held from the start', () => {
    const vows = pickBossVows(FIRE, OPPONENT_THEMES.fire.prefers, 2)
    expect(vows).toHaveLength(2)
    expect(vows[0].vow).toBe('kindling')
    const m = newMatch({ name: 'Final', opponent: 'Champion', backdrop: 'fire', bestOf: 5, seed: 1, player: TEAM, enemy: FIRE, playerPool: ALL, prefers: [], bossVows: vows })
    expect(m.vows.enemy).toEqual(vows)
  })

  it('a best-of-5 auto match ends after 3 to 5 decided rounds', () => {
    for (const enemy of [FIRE, team(4, ['frostguard', 'front'], ['duskblade', 'front'], ['rime-mystic', 'back'])]) {
      let m = match(enemy, 11)
      while (!matchWinner(m)) {
        m = enemySwears(m)
        const pick = autoPick(m, offerFor(m, 'player'))
        if (pick) m = swear(m, 'player', pick)
        m = recordRound(m, runBattle({ ...roundTeams(m), seed: roundSeed(m) }, CONTENT).winner)
      }
      const decided = m.rounds.filter((r) => r !== 'draw').length
      expect(decided).toBeGreaterThanOrEqual(3)
      expect(decided).toBeLessThanOrEqual(5)
      expect(m.vows.enemy.length).toBe(m.rounds.length)
    }
  })
})
